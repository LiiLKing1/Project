import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, getDocs, where, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Search, RefreshCcw, ShoppingBag, ArrowRightLeft, User, CreditCard, Banknote, Calculator, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HighlightText = ({ text, search }) => {
  if (!search || !text) return <span>{text}</span>;
  const regex = new RegExp(`(${search})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false });
  }
  
  return (
    <span>
      {parts.map((p, i) => p.highlight ? <span key={i} style={{backgroundColor: '#FFE066', padding: '0 2px', borderRadius: '2px', color: '#1A2538'}}>{p.text}</span> : <span key={i}>{p.text}</span>)}
    </span>
  );
};

const Exchange = () => {
  const { userProfile, storeId } = useRoles();
  const { addToast } = useToast();
  
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedSale, setSelectedSale] = useState(null);
  const [returningItems, setReturningItems] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    
    const salesQ = query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc'));
    const unsubSales = onSnapshot(salesQ, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setSales(data);
    });

    const prodQ = query(collection(db, `users/${storeId}/products`), orderBy('name'));
    const unsubProducts = onSnapshot(prodQ, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubProducts();
    };
  }, [storeId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const filteredSales = sales.filter(s => 
    s.saleNumber?.includes(searchTerm) || 
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    setReturningItems([]);
    setCart([]);
  };

  const handleReturnItem = (item) => {
    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing) {
        if (existing.qty >= item.qty) {
          addToast('Ushbu mahsulotdan boshqa qaytarib bo\'lmaydi', 'warning');
          return prev;
        }
        return prev.map(p => p.productId === item.productId ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleRemoveReturn = (item) => {
    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing.qty > 1) {
        return prev.map(p => p.productId === item.productId ? { ...p, qty: p.qty - 1 } : p);
      }
      return prev.filter(p => p.productId !== item.productId);
    });
  };

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
           addToast('Qoldiqdan ortiq qo\'shib bo\'lmaydi', 'warning');
           return prev;
        }
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      if (product.stock <= 0) {
         addToast('Mahsulot qoldig\'i yo\'q', 'error');
         return prev;
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleRemoveCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing.qty > 1) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty - 1 } : p);
      }
      return prev.filter(p => p.id !== product.id);
    });
  };

  const totalReturnAmount = returningItems.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const totalNewAmount = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const difference = totalNewAmount - totalReturnAmount;

  const handleProcessExchange = async (paymentMethod) => {
    if (returningItems.length === 0 && cart.length === 0) return;
    if (!selectedSale) return;
    
    setIsProcessing(true);
    try {
      const shiftsQuery = query(collection(db, `users/${storeId}/shifts`), where('status', '==', 'open'));
      const shiftsSnap = await getDocs(shiftsQuery);
      let openShiftRef = null;
      if (!shiftsSnap.empty) {
        openShiftRef = doc(db, `users/${storeId}/shifts`, shiftsSnap.docs[0].id);
      }

      const exchangeData = {
        storeId,
        originalSaleId: selectedSale.id,
        customerId: selectedSale.customerId || null,
        customerName: selectedSale.customerName || null,
        returnedItems: returningItems,
        newItems: cart,
        totalReturnAmount,
        totalNewAmount,
        difference,
        paymentMethod: difference > 0 ? paymentMethod : (difference < 0 ? (paymentMethod === 'shop_pays_cash' ? 'cash_out' : 'debt_cleared') : 'even'),
        createdAt: serverTimestamp(),
        cashier: userProfile?.name || 'Kassir',
        type: 'exchange'
      };

      await runTransaction(db, async (transaction) => {
         // Stocks for returning items
         for (const item of returningItems) {
           const pRef = doc(db, `users/${storeId}/products`, item.productId);
           const pSnap = await transaction.get(pRef);
           if (pSnap.exists()) {
             transaction.update(pRef, { stock: pSnap.data().stock + item.qty });
           }
         }
         
         // Stocks for new items
         for (const item of cart) {
           const pRef = doc(db, `users/${storeId}/products`, item.id);
           const pSnap = await transaction.get(pRef);
           if (pSnap.exists()) {
             transaction.update(pRef, { stock: pSnap.data().stock - item.qty });
           }
         }

         let custRef = null;
         let custSnap = null;
         if (selectedSale.customerId) {
           custRef = doc(db, `users/${storeId}/customers`, selectedSale.customerId);
           custSnap = await transaction.get(custRef);
         }

         if (custSnap && custSnap.exists()) {
           const currentCust = custSnap.data();
           const updates = {};
           
           if (difference > 0 && paymentMethod === 'debt') {
             updates.currentDebt = (currentCust.currentDebt || 0) + difference;
             const newDebtRef = doc(collection(db, `users/${storeId}/customerDebts`));
             transaction.set(newDebtRef, {
               customerId: selectedSale.customerId,
               amount: difference,
               type: 'given',
               date: new Date().toISOString(),
               createdAt: serverTimestamp(),
               note: 'Almashtirish farqi',
               cashier: userProfile?.name || 'Kassir',
             });
           } else if (difference < 0 && paymentMethod === 'shop_clears_debt') {
             // We owe them, so we reduce their debt
             if (currentCust.currentDebt > 0) {
               const reduceAmount = Math.min(currentCust.currentDebt, Math.abs(difference));
               updates.currentDebt = currentCust.currentDebt - reduceAmount;
             }
           }
           if (Object.keys(updates).length > 0) {
             transaction.update(custRef, updates);
           }
         }

         // Shift cash updates
         if (openShiftRef) {
           const shiftSnap = await transaction.get(openShiftRef);
           if (shiftSnap.exists()) {
             const shift = shiftSnap.data();
             if (difference > 0 && paymentMethod === 'cash') {
               transaction.update(openShiftRef, { currentCash: (shift.currentCash || 0) + difference });
             } else if (difference < 0 && paymentMethod === 'shop_pays_cash') {
               transaction.update(openShiftRef, { currentCash: (shift.currentCash || 0) + difference }); // difference is negative
             }
           }
         }

         const saleRef = doc(collection(db, `users/${storeId}/sales`));
         exchangeData.saleNumber = 'EXC-' + Date.now().toString().slice(-6);
         transaction.set(saleRef, exchangeData);
      });
      
      addToast('Almashtirish muvaffaqiyatli amalga oshirildi', 'success');
      setSelectedSale(null);
      setReturningItems([]);
      setCart([]);
      
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Yuklanmoqda...</div>;

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1rem', padding: '1rem', backgroundColor: '#F8FAFC' }}>
      {/* Left side: Sales List and Catalog */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        
        {/* Sales Section */}
        <div className="glass-panel flex-col" style={{ flex: selectedSale ? '0 0 auto' : '1', overflow: 'hidden', padding: '1rem', transition: 'flex 0.3s' }}>
          <h2 className="h2" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCcw size={20} color="var(--primary)" /> 
            {selectedSale ? 'Tanlangan Sotuv (Chek)' : 'Sotuvni Tanlang'}
          </h2>
          
          {!selectedSale ? (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Chek raqami yoki mijoz qidirish..." 
                className="input-field" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredSales.map(sale => (
                  <div 
                    key={sale.id} 
                    onClick={() => handleSelectSale(sale)}
                    style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{sale.saleNumber || 'Raqamsiz'}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {sale.customerName ? <><User size={12}/> {sale.customerName}</> : 'Umumiy xaridor'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}><CurrencyDisplay amount={sale.finalTotal} /></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Chek: {selectedSale.saleNumber}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedSale.customerName || 'Umumiy xaridor'}</div>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedSale(null)}>
                  Boshqasini tanlash
                </button>
              </div>
              
              <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>Sotilgan mahsulotlar (Qaytarish uchun bosing):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedSale.items?.map((item, idx) => {
                  const returningQty = returningItems.find(r => r.productId === item.productId)?.qty || 0;
                  const availableQty = item.qty - returningQty;
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => availableQty > 0 && handleReturnItem(item)}
                      style={{ padding: '0.75rem', backgroundColor: availableQty > 0 ? '#fff' : '#F8FAFC', border: '1px solid', borderColor: availableQty > 0 ? 'var(--border-color)' : '#E2E8F0', borderRadius: 'var(--radius-sm)', cursor: availableQty > 0 ? 'pointer' : 'not-allowed', opacity: availableQty > 0 ? 1 : 0.5, flex: '1 1 calc(33% - 0.5rem)', minWidth: '150px' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Sotilgan: <b style={{color: 'var(--primary)'}}>{item.qty}</b></span>
                        <CurrencyDisplay amount={item.sellPrice} />
                      </div>
                      {returningQty > 0 && (
                        <div style={{ marginTop: '0.5rem', padding: '0.25rem', backgroundColor: '#FEE2E2', color: '#E11D48', borderRadius: '4px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                          {returningQty} ta qaytarilmoqda
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Catalog Section */}
        {selectedSale && (
          <div className="glass-panel flex-col" style={{ flex: '1', overflow: 'hidden', padding: '1rem' }}>
            <h2 className="h2" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} color="var(--primary)" /> 
              Yangi Tovar Tanlash
            </h2>
            <input 
              type="text" 
              placeholder="Katalogdan tovar qidirish..." 
              className="input-field" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignContent: 'flex-start' }}>
              {filteredProducts.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', flex: '1 1 calc(33% - 0.5rem)', minWidth: '140px', position: 'relative' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <HighlightText text={p.name} search={searchTerm} />
                  </div>
                  <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>
                    <CurrencyDisplay amount={p.sellPrice} isSell />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: p.stock > 0 ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>
                    Qoldiq: {p.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right side: Calculation Panel */}
      <div className="glass-panel flex-col" style={{ width: '400px', padding: '1.5rem', overflowY: 'auto', borderLeft: '4px solid var(--primary)' }}>
        <h2 className="h2" style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator size={22} color="var(--primary)" /> 
          Hisob-kitob
        </h2>
        
        {/* Returning Items */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: '#E11D48', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRightLeft size={16} /> Qaytarilayotgan tovarlar
          </div>
          {returningItems.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tanlanmagan</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {returningItems.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#FFF1F2', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleRemoveReturn(item)} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: 0 }}><X size={14}/></button>
                    <span>{item.name} <b style={{color: '#E11D48'}}>x{item.qty}</b></span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#E11D48' }}>-<CurrencyDisplay amount={item.sellPrice * item.qty} /></span>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontWeight: 700, color: '#E11D48', marginTop: '0.5rem', borderTop: '1px solid #FFE4E6', paddingTop: '0.5rem' }}>
                Jami qaytarilmoqda: -<CurrencyDisplay amount={totalReturnAmount} />
              </div>
            </div>
          )}
        </div>

        {/* New Items */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={16} /> Yangi tovarlar
          </div>
          {cart.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tanlanmagan</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#F0FDF4', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleRemoveCart(item)} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: 0 }}><X size={14}/></button>
                    <span>{item.name} <b style={{color: 'var(--success)'}}>x{item.qty}</b></span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>+<CurrencyDisplay amount={item.sellPrice * item.qty} /></span>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem', borderTop: '1px solid #DCFCE7', paddingTop: '0.5rem' }}>
                Jami olinmoqda: +<CurrencyDisplay amount={totalNewAmount} />
              </div>
            </div>
          )}
        </div>

        {/* Difference and Payment */}
        <div style={{ marginTop: 'auto', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.125rem' }}>
            <span style={{ fontWeight: 600 }}>Yakuniy farq:</span>
            <span style={{ fontWeight: 700, color: difference > 0 ? 'var(--primary)' : (difference < 0 ? '#E11D48' : 'var(--text-main)') }}>
              {difference > 0 ? '+' : ''}<CurrencyDisplay amount={difference} />
            </span>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
            {difference > 0 && "Mijoz qo'shimcha to'lashi kerak:"}
            {difference < 0 && "Do'kon mijozga qaytarishi kerak (- balans):"}
            {difference === 0 && "Farq yo'q. To'g'ridan-to'g'ri almashtirish."}
          </div>

          {difference > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                disabled={isProcessing} 
                onClick={() => handleProcessExchange('cash')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Banknote size={16} /> Naqd pul to'ladi
              </button>
              <button 
                className="btn btn-outline" 
                disabled={isProcessing} 
                onClick={() => handleProcessExchange('card')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CreditCard size={16} /> Karta orqali
              </button>
              {selectedSale?.customerId && (
                <button 
                  className="btn btn-outline" 
                  disabled={isProcessing} 
                  onClick={() => handleProcessExchange('debt')}
                  style={{ width: '100%', justifyContent: 'center', borderColor: '#F59E0B', color: '#B45309' }}
                >
                  Qarzga yozish
                </button>
              )}
            </div>
          )}

          {difference < 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                disabled={isProcessing} 
                onClick={() => handleProcessExchange('shop_pays_cash')}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#E11D48', borderColor: '#E11D48' }}
              >
                <Banknote size={16} /> Kassadan naqd berish (O'chirish)
              </button>
              {selectedSale?.customerId && (
                <button 
                  className="btn btn-outline" 
                  disabled={isProcessing} 
                  onClick={() => handleProcessExchange('shop_clears_debt')}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Qarzidan chegirib qolish
                </button>
              )}
            </div>
          )}

          {difference === 0 && (
            <button 
              className="btn btn-primary" 
              disabled={isProcessing || (returningItems.length===0 && cart.length===0)} 
              onClick={() => handleProcessExchange('even')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Almashtirishni Tasdiqlash
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exchange;
