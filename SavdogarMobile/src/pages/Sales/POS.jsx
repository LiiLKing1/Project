import { dataService } from '../../services/dataService';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, FileText, ChevronDown, Percent, Calendar, X, CheckCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, writeBatch, increment, doc, orderBy, getDoc, runTransaction } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import Receipt from '../../components/Receipt';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { motion, AnimatePresence } from 'framer-motion';


const POS = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  
  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const { addToast } = useToast();
  const barcodeInputRef = useRef(null);
  
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';
  
  const products = React.useMemo(() => {
    return allProducts.map(p => {
      let currentStock = 0;
      if (p.stockByWarehouse && p.stockByWarehouse[selectedWarehouseId] !== undefined) {
        currentStock = p.stockByWarehouse[selectedWarehouseId] || 0;
      } else if (p.stock !== undefined) {
        currentStock = p.stock; // fallback to old stock structure
      }
      return {
        ...p,
        stock: currentStock
      };
    });
  }, [allProducts, selectedWarehouseId]);

  // Payment Drawer State
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('cash'); // cash, card, mixed, debt
  
  // Discount state
  const [discountType, setDiscountType] = useState('amount'); // percent, amount
  const [discountValue, setDiscountValue] = useState('');
  
  // Mixed payment amounts
  const [mixedCash, setMixedCash] = useState('');
  const [mixedCard, setMixedCard] = useState('');
  const [mixedDebt, setMixedDebt] = useState('');
  
  // Single payment cash (for calculating change)
  const [cashAmount, setCashAmount] = useState('');
  
  const [dueDate, setDueDate] = useState('');
  const [bonusToUse, setBonusToUse] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    if (!storeId) return;

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), where('status', '==', 'active')), (snapshot) => {
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCustomers = onSnapshot(query(collection(db, `users/${storeId}/customers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [storeId]);

  // Handle Edit Sale Data
  useEffect(() => {
    const editDataStr = localStorage.getItem('editSaleData');
    if (editDataStr && products.length > 0) {
      try {
        const editData = JSON.parse(editDataStr);
        
        // Map items to cart with stock info
        const newCart = editData.items.map(item => {
           const p = products.find(p => p.id === item.productId);
           return { ...item, id: item.productId, sellPrice: item.price, stock: p ? p.stock : 1000 };
        });
        setCart(newCart);
        
        // Set Customer
        if (editData.customerId && customers.length > 0) {
           const cust = customers.find(c => c.id === editData.customerId);
           if (cust) setSelectedCustomer(cust);
        }
        
        // Set Discount
        if (editData.discount && editData.discount.value > 0) {
           setDiscountType(editData.discount.type);
           setDiscountValue(editData.discount.value);
        }

        localStorage.removeItem('editSaleData');
        addToast("Sotuv ma'lumotlari tahrirlash uchun yuklandi", "info");
      } catch(e) {
        console.error(e);
      }
    }
  }, [products, customers, addToast]);

  const addToCart = (product) => {
    if (product.stock <= 0) {
      addToast('Qoldiqda yo\'q!', 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          addToast('Qoldiqdan ortiq qo\'shib bo\'lmaydi', 'warning');
          return prev;
        }
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta, stock) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(1, Math.min(stock, p.qty + delta));
        return { ...p, qty: newQty };
      }
      return p;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(p => p.id !== id));
  
  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  
  let discountAmount = 0;
  if (discountValue) {
    if (discountType === 'percent') {
      discountAmount = subtotal * (Number(discountValue) / 100);
    } else {
      discountAmount = Number(discountValue);
    }
  }
  
  let finalTotal = Math.max(0, subtotal - discountAmount);
  
  // Apply bonus if checked
  let usedBonusAmount = 0;
  if (selectedCustomer && selectedCustomer.bonusBalance > 0 && Number(bonusToUse) > 0) {
    usedBonusAmount = Math.min(finalTotal, Math.min(selectedCustomer.bonusBalance, Number(bonusToUse)));
    finalTotal -= usedBonusAmount;
  }
  
  // Mixed payment auto calculation
  const mCash = Number(mixedCash) || 0;
  const mCard = Number(mixedCard) || 0;
  
  const mDiff = finalTotal - (mCash + mCard);
  const mDebt = Math.max(0, mDiff);
  const mChange = Math.max(0, -mDiff);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );
  
  const cleanPhoneSearch = customerSearch.replace(/\s+/g, '').toLowerCase();
  const cleanNameSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customerSearch.trim() ? customers.filter(c => 
    (c?.fullName || '').toLowerCase().includes(cleanNameSearch) || (c?.phone || '').includes(cleanPhoneSearch)
  ).slice(0, 5) : [];

  const handleCheckout = async () => {
    const isDebtInvolved = paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0);
    
    if (isDebtInvolved) {
      if (!selectedCustomer) {
        addToast('Nasiyaga sotish uchun mijoz tanlanishi shart', 'error');
        return;
      }
      if (!dueDate) {
        addToast('Qaytarish muddati kiritilishi shart', 'error');
        return;
      }
    }

    if (cart.some(item => !item.qty || item.qty < 1)) {
      addToast('Barcha mahsulotlar soni kamida 1 bo\'lishi kerak', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      let finalSaleData = null;
      
      await runTransaction(db, async (transaction) => {
      
      // Calculate actual cash and card received
      let finalCashReceived = 0;
      let finalCardReceived = 0;
      let finalDebtAmount = 0;
      
      let paymentBreakdown = [];
      
      if (paymentType === 'cash') {
        finalCashReceived = finalTotal;
        paymentBreakdown.push({ method: 'cash', amount: finalTotal });
      } else if (paymentType === 'card') {
        finalCardReceived = finalTotal;
        paymentBreakdown.push({ method: 'card', amount: finalTotal });
      } else if (paymentType === 'debt') {
        finalDebtAmount = finalTotal;
        paymentBreakdown.push({ method: 'debt', amount: finalTotal });
      } else if (paymentType === 'mixed') {
        let actualCash = mCash;
        let actualCard = mCard;
        let change = mChange;
        
        if (change > 0) {
          if (actualCash >= change) {
            actualCash -= change;
          } else {
             let rem = change - actualCash;
             actualCash = 0;
             actualCard -= rem;
          }
        }
        finalCashReceived = actualCash;
        finalCardReceived = actualCard;
        finalDebtAmount = mDebt;
        if (actualCash > 0) paymentBreakdown.push({ method: 'cash', amount: actualCash });
        if (actualCard > 0) paymentBreakdown.push({ method: 'card', amount: actualCard });
        if (mDebt > 0) paymentBreakdown.push({ method: 'debt', amount: mDebt });
      }

      
      if (usedBonusAmount > 0) {
        paymentBreakdown.push({ method: 'bonus', amount: usedBonusAmount });
      }

      // Loyalty calculation
      let bonusEarned = 0;
      if (selectedCustomer && selectedCustomer.bonusPercent > 0) {
        bonusEarned = finalTotal * (Number(selectedCustomer.bonusPercent) / 100);
      }

      // 1. Update product stocks
      cart.forEach(item => {
        const productRef = doc(db, `users/${storeId}/products`, item.id);
        transaction.update(productRef, {
          [`stockByWarehouse.${selectedWarehouseId}`]: increment(-item.qty)
        });
      });

      // 2. Create Sale Document
      const saleRef = doc(collection(db, `users/${storeId}/sales`));
      const saleData = {
        saleNumber: 'CH-' + Date.now().toString().slice(-6),
        items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.sellPrice, costPrice: i.costPrice })),
        subtotal: subtotal,
        discount: { type: discountType, value: discountAmount },
        finalTotal: finalTotal,
        paymentType: paymentType,
        paymentBreakdown: paymentBreakdown,
        cashReceived: finalCashReceived,
        cardAmount: finalCardReceived,
        bonusEarned: bonusEarned,
        customerId: selectedCustomer?.id || null,
        cashierId: userProfile?.name || 'Kassir',
        status: 'completed',
        createdAt: new Date().toISOString()
      };
      transaction.set(saleRef, saleData);
      finalSaleData = { id: saleRef.id, ...saleData };

      // 3. Create Debt Document if needed
      if (finalDebtAmount > 0 && selectedCustomer) {
        const debtRef = doc(collection(db, `users/${storeId}/customerDebts`));
        transaction.set(debtRef, { 
          customerId: selectedCustomer.id, 
          relatedSaleId: saleRef.id,
          amount: finalDebtAmount, 
          remainingAmount: finalDebtAmount,
          dueDate: dueDate,
          note: 'Nasiya savdo ' + saleData.saleNumber,
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Kassir'
        });
      }

      // 4. Update Customer
      if (selectedCustomer) {
        const custRef = doc(db, `users/${storeId}/customers`, selectedCustomer.id);
        const updates = { 
          totalPurchases: increment(finalTotal), 
          visits: increment(1) 
        };
        
        if (finalDebtAmount > 0) {
          updates.currentDebt = increment(finalDebtAmount);
        }
        
        const netBonusChange = bonusEarned - usedBonusAmount;
        if (netBonusChange !== 0) {
          updates.bonusBalance = increment(netBonusChange);
        }
        
        transaction.update(custRef, updates);
      }
      });

      addToast('Sotuv muvaffaqiyatli amalga oshirildi', 'success');
      setLastSale({ ...finalSaleData, customerName: selectedCustomer?.fullName });
      
      // Reset POS state
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setIsPaymentDrawerOpen(false);
      setDiscountValue('');
      setBonusToUse('');
      setMixedCash('');
      setMixedCard('');
      setMixedDebt('');
      setCashAmount('');
      
      setIsReceiptModalOpen(true);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPaymentDrawer = () => {
    setIsPaymentDrawerOpen(true);
    
    // Set default due date to +30 days
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
  };
  
  const canDiscount = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  return (
    <div className="pos-layout">
      {/* Products Section */}
      <div className="flex-col" style={{ gap: '1.5rem', overflow: 'hidden' }}>
        <div className="flex-between">
          <h1 className="h1">Sotuv Oynasi</h1>
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Shtrix-kod yoki nom..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '1rem', padding: '1rem 1rem 1rem 2.5rem' }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="glass-panel" onClick={() => addToCart(p)} style={{ padding: '1rem', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', opacity: p.stock > 0 ? 1 : 0.5, transition: 'transform 0.1s' }} onMouseDown={e => p.stock > 0 && (e.currentTarget.style.transform = 'scale(0.98)')} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>{p.name}</div>
              <div style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.125rem' }}><CurrencyDisplay amount={p.sellPrice} /></div>
              <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <span>{p.barcode}</span>
                <span style={{ fontWeight: 600, color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)' }}>
                  Qoldiq: {p.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="glass-panel flex-col" style={{ height: '100%', display: 'flex' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="h2">Savat</h2>
          
          <div style={{ position: 'relative' }}>
            {selectedCustomer ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                  <User size={18} /> {selectedCustomer.fullName}
                  {selectedCustomer.bonusBalance > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#fbbf24', color: '#000', borderRadius: '1rem' }}>
                      Bonus: <CurrencyDisplay amount={selectedCustomer.bonusBalance} />
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedCustomer(null)} style={{ color: 'var(--danger)' }}>✕</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input 
                      type="text" 
                      placeholder="Mijoz qidirish (telefon yoki ism)..." 
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                  </div>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
                {showCustomerDropdown && (customerSearch.trim() ? filteredCustomers.length > 0 : customers.length > 0) && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '0.5rem', boxShadow: 'var(--shadow-md)', maxHeight: '250px', overflowY: 'auto' }}>
                    {(customerSearch.trim() ? filteredCustomers : customers.slice(0, 10)).map(c => (
                      <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {cart.length === 0 ? (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Savat bo'sh</div>
          ) : (
            <div className="flex-col" style={{ gap: '1rem' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem' }}><CurrencyDisplay amount={item.sellPrice * item.qty} /></div>
                  </div>
                  <div className="flex-center" style={{ gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, -1, item.stock)}><Minus size={16} /></button>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={item.qty} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val === '') {
                          setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: '' } : p));
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: Math.min(item.stock, num) } : p));
                        }
                      }}
                      onBlur={(e) => {
                        let num = parseInt(e.target.value.replace(/\D/g, ''), 10);
                        if (isNaN(num) || num < 1) num = 1;
                        setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: Math.min(item.stock, num) } : p));
                      }}
                      style={{ width: '65px', textAlign: 'center', fontWeight: '600', padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)' }}
                    />
                    <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, 1, item.stock)}><Plus size={16} /></button>
                    <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem', marginLeft: '0.5rem' }} onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Jami summa:</span>
            <span className="h1" style={{ color: 'var(--primary)', fontSize: '2rem' }}><CurrencyDisplay amount={subtotal} /></span>
          </div>
          <button className="btn btn-primary" disabled={cart.length === 0} onClick={openPaymentDrawer} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
             To'lash
          </button>
        </div>
      </div>

      {/* ══ Fullscreen Payment Overlay ══ */}
      <AnimatePresence>
        {isPaymentDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="pay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => !isProcessing && setIsPaymentDrawerOpen(false)}
              style={{
                position: 'fixed', top: isElectron ? '40px' : 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10,20,40,0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 1100,
              }}
            />

            {/* Panel */}
            <motion.div
              key="pay-panel"
              initial={{ opacity: 0, scale: 0.94, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 32 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: isElectron ? '40px' : 0, left: 0, right: 0, bottom: 0,
                zIndex: 1101,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: '100%',
                maxWidth: '960px',
                height: 'calc(100vh - 40px)',
                maxHeight: '700px',
                background: '#F4F8FF',
                borderRadius: '28px',
                boxShadow: '0 40px 100px -20px rgba(0,0,0,0.45)',
                display: 'flex',
                overflow: 'hidden',
                pointerEvents: 'all',
              }}>

                {/* ── LEFT: Receipt ── */}
                <div style={{
                  width: '380px',
                  flexShrink: 0,
                  background: 'linear-gradient(160deg, #1A2538 0%, #2C4A7C 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 20px',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Decorative circles */}
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(74,144,226,0.12)' }} />
                  <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(123,206,235,0.1)' }} />

                  <div style={{ position: 'relative', zIndex: 1, color: '#fff', textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Chek namunasi</div>
                    <div style={{ fontSize: 12, opacity: 0.4 }}>Tasdiqlashdan avval tekshiring</div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    style={{ position: 'relative', zIndex: 1, width: '100%', overflowY: 'auto', maxHeight: 'calc(100% - 80px)',
                      scrollbarWidth: 'none',
                    }}
                  >
                    <style>{`.receipt-scroll::-webkit-scrollbar{display:none}`}</style>
                    <div className="receipt-scroll">
                      <Receipt sale={{
                        id: 'PREVIEW',
                        items: cart,
                        subtotal,
                        discountAmount,
                        usedBonusAmount,
                        finalTotal,
                        paymentType,
                        customerName: selectedCustomer ? selectedCustomer.fullName : 'Xaridor',
                        createdAt: new Date().toISOString(),
                        cashierId: userProfile?.name || 'Kassir',
                        storeId,
                      }} storeId={storeId} />
                    </div>
                  </motion.div>
                </div>

                {/* ── RIGHT: Payment Form ── */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  background: '#fff',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #DCE8F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1A2538', letterSpacing: '-0.5px' }}>To'lovni qabul qilish</div>
                      <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 2 }}>
                        {cart.reduce((a, c) => a + c.qty, 0)} ta mahsulot · Oraliq: <CurrencyDisplay amount={subtotal} />
                      </div>
                    </div>
                    <button
                      onClick={() => !isProcessing && setIsPaymentDrawerOpen(false)}
                      style={{ width: 36, height: 36, borderRadius: '10px', border: '1.5px solid #DCE8F5', background: '#F7FAFF', color: '#8A9BB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FCE8E8'; e.currentTarget.style.color = '#EF4B4B'; e.currentTarget.style.borderColor = '#FFE0E0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F7FAFF'; e.currentTarget.style.color = '#8A9BB5'; e.currentTarget.style.borderColor = '#DCE8F5'; }}
                    ><X size={16}/></button>
                  </div>

                  {/* Scrollable body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Final Total */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      style={{
                        background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)',
                        borderRadius: '18px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#fff',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yakuniy summa</div>
                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', marginTop: 2 }}>
                          <CurrencyDisplay amount={finalTotal} />
                        </div>
                      </div>
                      <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Banknote size={26} color="#fff" />
                      </div>
                    </motion.div>

                    {/* Discount Block */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2538' }}>Chegirma</span>
                        {!canDiscount && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Faqat admin ruxsati bilan</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ display: 'flex', background: '#F0F5FC', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                          {[{ val: 'percent', label: '%' }, { val: 'amount', label: curr }].map(t => (
                            <button key={t.val} disabled={!canDiscount} onClick={() => setDiscountType(t.val)}
                              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                                background: discountType === t.val ? '#4A90E2' : 'transparent',
                                color: discountType === t.val ? '#fff' : '#8A9BB5',
                              }}
                            >{t.label}</button>
                          ))}
                        </div>
                        <input
                          type="number" disabled={!canDiscount} value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)} placeholder="Chegirma miqdori"
                          style={{ flex: 1, padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #DCE8F5', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = '#4A90E2'}
                          onBlur={e => e.target.style.borderColor = '#DCE8F5'}
                        />
                      </div>
                    </motion.div>

                    {/* Bonus */}
                    {selectedCustomer && selectedCustomer.bonusBalance > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                        style={{ border: '1.5px solid #D1FAE5', borderRadius: '16px', padding: '16px', background: '#F0FDF4' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>Bonus ishlatish</span>
                          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Mavjud: <CurrencyDisplay amount={selectedCustomer.bonusBalance} /></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" value={bonusToUse}
                            onChange={e => { const val = Number(e.target.value); if (val <= selectedCustomer.bonusBalance) setBonusToUse(e.target.value); }}
                            placeholder="Qancha ishlatmoqchisiz?"
                            style={{ flex: 1, padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #A7F3D0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                          />
                          <button onClick={() => setBonusToUse(selectedCustomer.bonusBalance)}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #A7F3D0', background: '#fff', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                          >Barchasi</button>
                        </div>
                      </motion.div>
                    )}

                    {/* Expected Bonus */}
                    {selectedCustomer && selectedCustomer.bonusPercent > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F0FDF4', borderRadius: '12px', border: '1.5px solid #D1FAE5' }}>
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>Ushbu xariddan tushadigan bonus:</span>
                        <span style={{ color: '#059669', fontWeight: 800, fontSize: 13 }}>
                          <CurrencyDisplay amount={finalTotal * (Number(selectedCustomer.bonusPercent) / 100)} />
                        </span>
                      </div>
                    )}

                    {/* Payment Methods */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>To'lov usuli</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'cash', label: "Naqd pul", icon: <Banknote size={20}/>, color: '#10B981' },
                          { id: 'card', label: 'Plastik karta', icon: <CreditCard size={20}/>, color: '#4A90E2' },
                          { id: 'mixed', label: 'Aralash', icon: <FileText size={20}/>, color: '#8B5CF6' },
                          { id: 'debt', label: 'Nasiya', icon: <Calendar size={20}/>, color: '#F59E0B' },
                        ].map((type, i) => {
                          const active = paymentType === type.id;
                          return (
                            <motion.button
                              key={type.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setPaymentType(type.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 14px', borderRadius: '14px', cursor: 'pointer',
                                border: active ? `2px solid ${type.color}` : '2px solid #DCE8F5',
                                background: active ? `${type.color}12` : '#F7FAFF',
                                color: active ? type.color : '#8A9BB5',
                                fontWeight: active ? 700 : 500,
                                fontSize: 14,
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                              }}
                            >
                              <div style={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: active ? `${type.color}20` : '#F0F5FC',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, color: active ? type.color : '#8A9BB5',
                                transition: 'all 0.2s',
                              }}>
                                {type.icon}
                              </div>
                              {type.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mixed inputs */}
                    {paymentType === 'mixed' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <FormInput label={`Naqd (${curr})`} type="number" value={mixedCash} onChange={e => setMixedCash(e.target.value)} placeholder="0" />
                        <FormInput label={`Karta (${curr})`} type="number" value={mixedCard} onChange={e => setMixedCard(e.target.value)} placeholder="0" />
                        {mDebt > 0 && (
                          <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13, padding: '10px 14px', background: '#FFFBEB', borderRadius: '10px' }}>
                            Nasiyaga o'tmoqda: <CurrencyDisplay amount={mDebt} />
                          </div>
                        )}
                        {mChange > 0 && (
                          <div style={{ color: '#10B981', fontWeight: 700, fontSize: 13, padding: '10px 14px', background: '#F0FDF4', borderRadius: '10px' }}>
                            Qaytim: <CurrencyDisplay amount={mChange} />
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Debt warning */}
                    {(paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && (
                      <>
                        {!selectedCustomer && (
                          <div style={{ color: '#EF4B4B', fontSize: 13, fontWeight: 600, padding: '12px 14px', background: '#FFF5F5', borderRadius: '12px', border: '1.5px solid #FFE0E0' }}>
                            ⚠ Nasiyaga sotish uchun kassa oynasidan mijozni tanlashingiz shart!
                          </div>
                        )}
                        <FormInput label="Qaytarish muddati *" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                      </>
                    )}
                  </div>

                  {/* Footer CTA */}
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #DCE8F5', flexShrink: 0, background: '#fff' }}>
                    <motion.button
                      whileHover={{ scale: isProcessing ? 1 : 1.01 }}
                      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                      onClick={handleCheckout}
                      disabled={isProcessing || ((paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && !selectedCustomer)}
                      style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '16px',
                        border: 'none',
                        background: isProcessing ? '#8A9BB5' : 'linear-gradient(135deg, #10B981, #34D399)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '16px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: isProcessing ? 'none' : '0 6px 20px -6px rgba(16,185,129,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      <CheckCircle size={20} />
                      {isProcessing ? 'Bajarilmoqda...' : "To'lovni yakunlash"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* Chek (Receipt) Modali */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {lastSale && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={lastSale} storeId={storeId} />

            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => dataService.printReceipt()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default POS;
