import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, FileText, ChevronDown, Percent, Calendar } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, runTransaction, doc, orderBy, getDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import Receipt from '../../components/Receipt';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const POS = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loyaltySettings, setLoyaltySettings] = useState({ bonusPercent: 0, minPurchaseForBonus: 0, vipMultiplier: 1 });
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  
  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const { addToast } = useToast();
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
  const [useBonus, setUseBonus] = useState(false);
  
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
    
    // Fetch Loyalty Settings
    getDoc(doc(db, `users/${storeId}/settings/loyalty`)).then(snap => {
      if (snap.exists()) {
        setLoyaltySettings(snap.data());
      }
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
  if (useBonus && selectedCustomer && selectedCustomer.bonusBalance > 0) {
    usedBonusAmount = Math.min(finalTotal, selectedCustomer.bonusBalance);
    finalTotal -= usedBonusAmount;
  }
  
  // Check if mixed payment matches
  const mCash = Number(mixedCash) || 0;
  const mCard = Number(mixedCard) || 0;
  const mDebt = Number(mixedDebt) || 0;
  const mixedTotal = mCash + mCard + mDebt;
  const mixedDiff = finalTotal - mixedTotal;

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

    if (paymentType === 'mixed' && mixedDiff !== 0) {
      addToast('Aralash to\'lovda kiritilgan summalar yig\'indisi yakuniy summaga teng emas', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      let finalSaleData = null;
      await runTransaction(db, async (transaction) => {
        // 1. Read all product stocks first
        const productRefs = cart.map(item => ({ ref: doc(db, `users/${storeId}/products`, item.id), ...item }));
        const productSnaps = await Promise.all(productRefs.map(p => transaction.get(p.ref)));

        let custSnap = null;
        let custRef = null;
        if (selectedCustomer) {
          custRef = doc(db, `users/${storeId}/customers`, selectedCustomer.id);
          custSnap = await transaction.get(custRef);
        }

        for (let i = 0; i < productSnaps.length; i++) {
          const snap = productSnaps[i];
          const item = productRefs[i];
          const currentStock = snap.data().stockByWarehouse?.[selectedWarehouseId] || 0;
          if (!snap.exists() || currentStock < item.qty) {
            throw new Error(`Xatolik: ${item.name} qoldig'i (Filialda) yetarli emas.`);
          }
        }

        // 2. Perform writes
        for (let i = 0; i < productSnaps.length; i++) {
          const snap = productSnaps[i];
          const item = productRefs[i];
          const currentStock = snap.data().stockByWarehouse?.[selectedWarehouseId] || 0;
          transaction.update(item.ref, { [`stockByWarehouse.${selectedWarehouseId}`]: currentStock - item.qty });
        }

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
          finalCashReceived = mCash;
          finalCardReceived = mCard;
          finalDebtAmount = mDebt;
          if (mCash > 0) paymentBreakdown.push({ method: 'cash', amount: mCash });
          if (mCard > 0) paymentBreakdown.push({ method: 'card', amount: mCard });
          if (mDebt > 0) paymentBreakdown.push({ method: 'debt', amount: mDebt });
        }
        
        if (usedBonusAmount > 0) {
          paymentBreakdown.push({ method: 'bonus', amount: usedBonusAmount });
        }

        // Loyalty calculation
        let bonusEarned = 0;
        if (selectedCustomer && custSnap.exists() && loyaltySettings.bonusPercent > 0) {
          // Bonus is calculated on the amount actually paid by customer (excluding used bonus and maybe debt)
          // Based on requirements: "Har bir yakunlangan sotuvda: bonusEarned = finalTotal * (bonusPercent/100) * vipMultiplier"
          // Let's use finalTotal (which is after discount and after bonus deduction)
          if (finalTotal >= (loyaltySettings.minPurchaseForBonus || 0)) {
            const multiplier = custSnap.data().isVip ? (loyaltySettings.vipMultiplier || 1) : 1;
            bonusEarned = finalTotal * (loyaltySettings.bonusPercent / 100) * multiplier;
          }
        }

        // 3. Create Sale Document
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

        // 4. Create Debt Document if needed
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

        // 5. Update Customer
        if (selectedCustomer && custSnap.exists()) {
          const currentCust = custSnap.data();
          const updates = { 
            totalPurchases: (currentCust.totalPurchases || 0) + finalTotal, 
            visits: (currentCust.visits || 0) + 1 
          };
          
          if (finalDebtAmount > 0) {
            updates.currentDebt = (currentCust.currentDebt || 0) + finalDebtAmount;
          }
          
          if (usedBonusAmount > 0) {
            updates.bonusBalance = (currentCust.bonusBalance || 0) - usedBonusAmount;
          }
          if (bonusEarned > 0) {
            updates.bonusBalance = (updates.bonusBalance !== undefined ? updates.bonusBalance : (currentCust.bonusBalance || 0)) + bonusEarned;
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
      setUseBonus(false);
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

      <Drawer position="right" isOpen={isPaymentDrawerOpen} onClose={() => !isProcessing && setIsPaymentDrawerOpen(false)} title="To'lovni qabul qilish">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          
          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Jami {cart.reduce((a,c)=>a+c.qty, 0)} dona mahsulot</span>
            <span>Oraliq summa: <CurrencyDisplay amount={subtotal} /></span>
          </div>

          {/* Discount Block */}
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Chegirma</span>
              {!canDiscount && <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>(Faqat admin ruxsati bilan)</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button 
                  disabled={!canDiscount}
                  onClick={() => setDiscountType('percent')}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: discountType === 'percent' ? 'var(--primary)' : 'transparent', color: discountType === 'percent' ? 'white' : 'inherit' }}
                >%</button>
                <button 
                  disabled={!canDiscount}
                  onClick={() => setDiscountType('amount')}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: discountType === 'amount' ? 'var(--primary)' : 'transparent', color: discountType === 'amount' ? 'white' : 'inherit' }}
                >{curr}</button>
              </div>
              <input 
                type="number" 
                disabled={!canDiscount}
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder="Qiymat kiritish"
                style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>

          {/* Final Total */}
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Yakuniy summa</div>
            <div className="h1" style={{ color: 'var(--primary)' }}><CurrencyDisplay amount={finalTotal} /></div>
          </div>

          {/* Bonus Option */}
          {selectedCustomer && selectedCustomer.bonusBalance > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <input type="checkbox" checked={useBonus} onChange={e => setUseBonus(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              <span style={{ fontWeight: 600, color: '#92400e' }}>
                Bonusdan ishlatish (Mavjud: <CurrencyDisplay amount={selectedCustomer.bonusBalance} />)
              </span>
            </label>
          )}

          {/* Payment Methods Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'cash', label: 'Naqd', icon: <Banknote size={16}/> },
              { id: 'card', label: 'Karta', icon: <CreditCard size={16}/> },
              { id: 'mixed', label: 'Aralash', icon: <FileText size={16}/> },
              { id: 'debt', label: 'To\'liq Nasiya', icon: <Calendar size={16}/> }
            ].map(type => (
              <button 
                key={type.id} 
                onClick={() => setPaymentType(type.id)} 
                className="btn" 
                style={{ 
                  flex: 1, 
                  backgroundColor: paymentType === type.id ? 'var(--primary)' : 'var(--bg-main)', 
                  color: paymentType === type.id ? 'white' : 'var(--text-secondary)',
                  display: 'flex', gap: '0.5rem'
                }}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>

          {/* Inputs based on type */}
          {paymentType === 'cash' && (
            <FormInput label={`Qabul qilingan summa (${curr})`} type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder={finalTotal} />
          )}
          
          {paymentType === 'mixed' && (
            <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormInput label={`Naqd (${curr})`} type="number" value={mixedCash} onChange={e => setMixedCash(e.target.value)} placeholder="0" />
              <FormInput label={`Karta (${curr})`} type="number" value={mixedCard} onChange={e => setMixedCard(e.target.value)} placeholder="0" />
              <FormInput label={`Nasiya (${curr})`} type="number" value={mixedDebt} onChange={e => setMixedDebt(e.target.value)} placeholder="0" />
              
              {mixedDiff !== 0 && (
                <div style={{ color: mixedDiff > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>
                  {mixedDiff > 0 ? <>Yetishmayapti: <CurrencyDisplay amount={mixedDiff} /></> : <>Ortiqcha: <CurrencyDisplay amount={Math.abs(mixedDiff)} /></>}
                </div>
              )}
            </div>
          )}

          {/* Debt requirement logic */}
          {(paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && (
            <>
              {!selectedCustomer && (
                <div style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 500, padding: '1rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>
                  Nasiyaga sotish uchun kassa oynasidan mijozni tanlashingiz shart!
                </div>
              )}
              <FormInput label="Qaytarish muddati *" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </>
          )}

          {paymentType === 'cash' && Number(cashAmount) > finalTotal && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--success)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600 }}>Qaytim:</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}><CurrencyDisplay amount={Number(cashAmount) - finalTotal} /></span>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <button 
              className="btn btn-success" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} 
              onClick={handleCheckout} 
              disabled={isProcessing || ((paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && !selectedCustomer) || (paymentType === 'mixed' && mixedDiff !== 0)}
            >
              {isProcessing ? 'Bajarilmoqda...' : 'To\'lovni yakunlash'}
            </button>
          </div>
        </div>
      </Drawer>

      {/* Chek (Receipt) Modali */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {lastSale && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={lastSale} storeId={storeId} />

            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default POS;
