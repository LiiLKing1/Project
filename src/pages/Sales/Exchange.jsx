import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, getDocs, where, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Search, RefreshCcw, ShoppingBag, ArrowRightLeft, User, CreditCard, Banknote, Calculator, X, ArrowLeft, CheckSquare, Square, CornerDownLeft } from 'lucide-react';

const HighlightTextLocal = ({ text, search }) => {
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
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;
  const { addToast } = useToast();
  
  const [mode, setMode] = useState('return'); // 'return' | 'exchange'
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [saleSearch, setSaleSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  const [selectedSale, setSelectedSale] = useState(null);
  const [returningItems, setReturningItems] = useState([]); // for exchange: { ...item, qty }
  const [returnSelections, setReturnSelections] = useState({}); // for return: { [productId]: qtyToReturn }
  const [cart, setCart] = useState([]); // new items for exchange
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    
    const unsubSales = onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc')), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), orderBy('name')), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, `users/${storeId}/customers`), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubSales(); unsubProducts(); unsubCustomers(); };
  }, [storeId]);

  // Derived state
  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || (p.sellPrice && p.sellPrice.toString().includes(q));
  }).slice(0, 100);

  const filteredSales = sales.filter(s => {
    const q = saleSearch.toLowerCase();
    return s.saleNumber?.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q) || (s.finalTotal && s.finalTotal.toString().includes(q));
  }).slice(0, 50);

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    setReturningItems([]);
    setCart([]);
    setProductSearch('');
    
    // For return mode
    const initialSelections = {};
    sale.items?.forEach(item => {
      initialSelections[item.productId] = { selected: false, returnQty: item.qty };
    });
    setReturnSelections(initialSelections);
  };

  // ===================== EXCHANGE MODE LOGIC =====================
  const handleReturnAllOfItemExchange = (item) => {
    const returningQty = returningItems.find(r => r.productId === item.productId)?.qty || 0;
    const availableQty = item.qty - returningQty;
    if (availableQty <= 0) return;
    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing) return prev.map(p => p.productId === item.productId ? { ...p, qty: p.qty + availableQty } : p);
      return [...prev, { ...item, qty: availableQty }];
    });
  };

  const handleReturnItemExchange = (item) => {
    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing) {
        if (existing.qty >= item.qty) { addToast('Ushbu mahsulotdan boshqa qaytarib bo\'lmaydi', 'warning'); return prev; }
        return prev.map(p => p.productId === item.productId ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleRemoveReturnExchange = (item) => {
    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing.qty > 1) return prev.map(p => p.productId === item.productId ? { ...p, qty: p.qty - 1 } : p);
      return prev.filter(p => p.productId !== item.productId);
    });
  };

  const handleReturnAllExchange = () => {
    if (!selectedSale || !selectedSale.items) return;
    setReturningItems(selectedSale.items.map(item => ({...item})));
  };

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) { addToast('Qoldiqdan ortiq qo\'shib bo\'lmaydi', 'warning'); return prev; }
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      if (product.stock <= 0) { addToast('Mahsulot qoldig\'i yo\'q', 'error'); return prev; }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleRemoveCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing.qty > 1) return prev.map(p => p.id === product.id ? { ...p, qty: p.qty - 1 } : p);
      return prev.filter(p => p.id !== product.id);
    });
  };

  const exReturnAmount = returningItems.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const exNewAmount = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const exDifference = exNewAmount - exReturnAmount; // positive = customer pays us, negative = we pay customer

  // ===================== PROCESS EXCHANGE =====================
  const processExchange = async (settlementMethod) => {
    if (returningItems.length === 0 && cart.length === 0) return;
    if (!selectedSale) return;
    
    setIsProcessing(true);
    try {
      const shiftsQuery = query(collection(db, `users/${storeId}/shifts`), where('status', '==', 'open'));
      const shiftsSnap = await getDocs(shiftsQuery);
      let openShiftRef = !shiftsSnap.empty ? doc(db, `users/${storeId}/shifts`, shiftsSnap.docs[0].id) : null;

      await runTransaction(db, async (transaction) => {
         const exchangeRef = doc(collection(db, `users/${storeId}/exchanges`));
         
         const exchangeData = {
           storeId,
           originalSaleId: selectedSale.id,
           customerId: selectedSale.customerId || null,
           customerName: selectedSale.customerName || null,
           returnedItems: returningItems,
           newItems: cart,
           totalReturnAmount: exReturnAmount,
           totalNewAmount: exNewAmount,
           priceDifference: exDifference,
           settlementMethod,
           createdAt: serverTimestamp(),
           cashier: userProfile?.name || 'Kassir',
         };
         
         transaction.set(exchangeRef, exchangeData);

         // Stocks
         for (const item of returningItems) {
           const pRef = doc(db, `users/${storeId}/products`, item.productId);
           const pSnap = await transaction.get(pRef);
           if (pSnap.exists()) transaction.update(pRef, { stock: pSnap.data().stock + item.qty });
         }
         for (const item of cart) {
           const pRef = doc(db, `users/${storeId}/products`, item.id);
           const pSnap = await transaction.get(pRef);
           if (pSnap.exists()) transaction.update(pRef, { stock: pSnap.data().stock - item.qty });
         }

         // Customer Balances
         let custRef = selectedSale.customerId ? doc(db, `users/${storeId}/customers`, selectedSale.customerId) : null;
         if (custRef) {
           const custSnap = await transaction.get(custRef);
           if (custSnap.exists()) {
             const currentCust = custSnap.data();
             const updates = {};
             
             if (exDifference > 0 && settlementMethod === 'nasiya') {
               updates.currentDebt = (currentCust.currentDebt || 0) + exDifference;
               const newDebtRef = doc(collection(db, `users/${storeId}/customerDebts`));
               transaction.set(newDebtRef, {
                 customerId: selectedSale.customerId,
                 amount: exDifference,
                 type: 'given',
                 date: new Date().toISOString(),
                 createdAt: serverTimestamp(),
                 note: 'Almashtirish ustiga qarz',
                 cashier: userProfile?.name || 'Kassir',
               });
             } else if (exDifference < 0 && settlementMethod === 'balansga_qoshildi') {
               updates.storeCredit = (currentCust.storeCredit || 0) + Math.abs(exDifference);
               const creditRef = doc(collection(db, `users/${storeId}/customerCredits`));
               transaction.set(creditRef, {
                 customerId: selectedSale.customerId,
                 amount: Math.abs(exDifference),
                 type: 'exchange_credit',
                 note: 'Almashtirishdan ortib qolgan summa',
                 createdAt: serverTimestamp()
               });
             }
             if (Object.keys(updates).length > 0) transaction.update(custRef, updates);
           }
         }

         // Shift cash
         if (openShiftRef) {
           const shiftSnap = await transaction.get(openShiftRef);
           if (shiftSnap.exists()) {
             const shift = shiftSnap.data();
             if (exDifference > 0 && settlementMethod === 'naqd') {
               transaction.update(openShiftRef, { currentCash: (shift.currentCash || 0) + exDifference });
             } else if (exDifference < 0 && settlementMethod === 'naqd_qaytarildi') {
               transaction.update(openShiftRef, { currentCash: (shift.currentCash || 0) + exDifference }); // difference is negative
             }
           }
         }

         // Update Original Sale Status
         const saleRef = doc(db, `users/${storeId}/sales`, selectedSale.id);
         const saleSnap = await transaction.get(saleRef);
         if (saleSnap.exists()) {
           const sData = saleSnap.data();
           let fullyReturned = true;
           sData.items.forEach(si => {
             const retItem = returningItems.find(r => r.productId === si.productId);
             const previouslyReturned = sData.returnedItems?.find(r => r.productId === si.productId)?.qty || 0;
             const totalNowReturned = previouslyReturned + (retItem ? retItem.qty : 0);
             if (totalNowReturned < si.qty) fullyReturned = false;
           });
           
           const existingReturned = sData.returnedItems || [];
           const updatedReturnedItems = [...existingReturned];
           returningItems.forEach(ri => {
              const exIdx = updatedReturnedItems.findIndex(x => x.productId === ri.productId);
              if (exIdx >= 0) updatedReturnedItems[exIdx].qty += ri.qty;
              else updatedReturnedItems.push({...ri});
           });

           transaction.update(saleRef, {
             status: fullyReturned ? 'fully_returned' : 'partially_returned',
             returnedItems: updatedReturnedItems
           });
         }

         // Audit log
         const auditRef = doc(collection(db, `users/${storeId}/auditLogs`));
         transaction.set(auditRef, {
           action: 'exchange_processed',
           details: `Sotuv ${selectedSale.saleNumber} almashtirildi. Farq: ${exDifference}`,
           userId: userProfile?.uid || 'unknown',
           userName: userProfile?.name || 'Kassir',
           createdAt: serverTimestamp()
         });
      });
      
      addToast('Almashtirish muvaffaqiyatli amalga oshirildi', 'success');
      setSelectedSale(null);
      
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ===================== RETURN MODE LOGIC =====================
  const processReturn = async (refundMethod) => {
    const itemsToReturn = Object.keys(returnSelections)
      .filter(id => returnSelections[id].selected && returnSelections[id].returnQty > 0)
      .map(id => {
         const originalItem = selectedSale.items.find(i => i.productId === id);
         return { ...originalItem, qty: returnSelections[id].returnQty };
      });
      
    if (itemsToReturn.length === 0) {
      addToast('Qaytarish uchun kamida bitta mahsulot tanlang', 'warning');
      return;
    }

    const refundAmount = itemsToReturn.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);

    setIsProcessing(true);
    try {
      const shiftsQuery = query(collection(db, `users/${storeId}/shifts`), where('status', '==', 'open'));
      const shiftsSnap = await getDocs(shiftsQuery);
      let openShiftRef = !shiftsSnap.empty ? doc(db, `users/${storeId}/shifts`, shiftsSnap.docs[0].id) : null;

      await runTransaction(db, async (transaction) => {
         // Create returns record
         const returnRef = doc(collection(db, `users/${storeId}/returns`));
         transaction.set(returnRef, {
           originalSaleId: selectedSale.id,
           items: itemsToReturn,
           refundAmount,
           refundMethod,
           reason: 'Foydalanuvchi orqali qaytarildi',
           cashierId: userProfile?.uid || null,
           cashierName: userProfile?.name || 'Kassir',
           createdAt: serverTimestamp(),
           storeId
         });

         // Stocks
         for (const item of itemsToReturn) {
           const pRef = doc(db, `users/${storeId}/products`, item.productId);
           const pSnap = await transaction.get(pRef);
           if (pSnap.exists()) transaction.update(pRef, { stock: pSnap.data().stock + item.qty });
         }

         // Finance/Debt logic
         if (refundMethod === 'naqd' && openShiftRef) {
           const shiftSnap = await transaction.get(openShiftRef);
           if (shiftSnap.exists()) {
             transaction.update(openShiftRef, { currentCash: (shiftSnap.data().currentCash || 0) - refundAmount });
           }
         } else if (refundMethod === 'nasiya' && selectedSale.customerId) {
           const custRef = doc(db, `users/${storeId}/customers`, selectedSale.customerId);
           const custSnap = await transaction.get(custRef);
           if (custSnap.exists()) {
             const currentDebt = custSnap.data().currentDebt || 0;
             transaction.update(custRef, { currentDebt: Math.max(0, currentDebt - refundAmount) });
             
             const newDebtRef = doc(collection(db, `users/${storeId}/customerDebts`));
             transaction.set(newDebtRef, {
               customerId: selectedSale.customerId,
               amount: refundAmount,
               type: 'paid', // reducing debt
               date: new Date().toISOString(),
               createdAt: serverTimestamp(),
               note: 'Qaytarish orqali qarzdan chegirildi',
               cashier: userProfile?.name || 'Kassir',
             });
           }
         }

         // Update Original Sale Status
         const saleRef = doc(db, `users/${storeId}/sales`, selectedSale.id);
         const saleSnap = await transaction.get(saleRef);
         if (saleSnap.exists()) {
           const sData = saleSnap.data();
           let fullyReturned = true;
           sData.items.forEach(si => {
             const retItem = itemsToReturn.find(r => r.productId === si.productId);
             const previouslyReturned = sData.returnedItems?.find(r => r.productId === si.productId)?.qty || 0;
             const totalNowReturned = previouslyReturned + (retItem ? retItem.qty : 0);
             if (totalNowReturned < si.qty) fullyReturned = false;
           });
           
           const existingReturned = sData.returnedItems || [];
           const updatedReturnedItems = [...existingReturned];
           itemsToReturn.forEach(ri => {
              const exIdx = updatedReturnedItems.findIndex(x => x.productId === ri.productId);
              if (exIdx >= 0) updatedReturnedItems[exIdx].qty += ri.qty;
              else updatedReturnedItems.push({...ri});
           });

           transaction.update(saleRef, {
             status: fullyReturned ? 'fully_returned' : 'partially_returned',
             returnedItems: updatedReturnedItems
           });
         }

         // Audit log
         const auditRef = doc(collection(db, `users/${storeId}/auditLogs`));
         transaction.set(auditRef, {
           action: 'return_processed',
           details: `Sotuv ${selectedSale.saleNumber} dan qaytarildi. Summa: ${refundAmount}`,
           userId: userProfile?.uid || 'unknown',
           userName: userProfile?.name || 'Kassir',
           createdAt: serverTimestamp()
         });
      });

      addToast('Mahsulotlar muvaffaqiyatli qaytarildi', 'success');
      setSelectedSale(null);

    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateReturnTotal = () => {
    let total = 0;
    if(!selectedSale) return total;
    selectedSale.items.forEach(item => {
       const sel = returnSelections[item.productId];
       if (sel && sel.selected) {
          total += sel.returnQty * item.sellPrice;
       }
    });
    return total;
  };


  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Yuklanmoqda...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      
      {/* Top Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff', padding: '0 1rem' }}>
        <button 
          onClick={() => { setMode('return'); setSelectedSale(null); }}
          style={{ padding: '1rem', borderBottom: mode === 'return' ? '2px solid var(--primary)' : '2px solid transparent', color: mode === 'return' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <CornerDownLeft size={18} /> Qaytarish
        </button>
        <button 
          onClick={() => { setMode('exchange'); setSelectedSale(null); }}
          style={{ padding: '1rem', borderBottom: mode === 'exchange' ? '2px solid var(--primary)' : '2px solid transparent', color: mode === 'exchange' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowRightLeft size={18} /> Almashtirish
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1rem', gap: '1rem' }}>
        {/* LEFT / MAIN SECTION */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          
          {!selectedSale ? (
            <div className="glass-panel flex-col" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
               <h2 className="h2" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <RefreshCcw size={20} color="var(--primary)" /> Sotuvni Tanlang
               </h2>
               <input 
                  type="text" 
                  placeholder="Chek raqami, mijoz yoki summa qidirish..." 
                  className="input-field" 
                  value={saleSearch} 
                  onChange={e => setSaleSearch(e.target.value)}
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
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {sale.saleNumber || 'Raqamsiz'}
                          {sale.status === 'fully_returned' && <span style={{fontSize:'0.7rem', padding:'2px 4px', background:'#FEE2E2', color:'#EF4444', borderRadius:'4px'}}>Qaytarilgan</span>}
                          {sale.status === 'partially_returned' && <span style={{fontSize:'0.7rem', padding:'2px 4px', background:'#FEF3C7', color:'#F59E0B', borderRadius:'4px'}}>Qisman qaytgan</span>}
                        </div>
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
            <>
              {/* Selected Sale Header */}
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Chek: {selectedSale.saleNumber}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedSale.customerName || 'Umumiy xaridor'}</div>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedSale(null)}>
                  <ArrowLeft size={16}/> Boshqasini tanlash
                </button>
              </div>

              {/* Mode Specific Content */}
              {mode === 'return' && (
                <div className="glass-panel flex-col" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Qaytariladigan mahsulotlarni belgilang</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSale.items?.map((item, idx) => {
                       const previouslyReturned = selectedSale.returnedItems?.find(r => r.productId === item.productId)?.qty || 0;
                       const maxAvailable = item.qty - previouslyReturned;
                       const sel = returnSelections[item.productId];
                       const isSelected = sel?.selected || false;
                       const returnQty = sel?.returnQty || 0;

                       if (maxAvailable <= 0) return null; // Already fully returned

                       return (
                         <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} onClick={() => {
                            setReturnSelections(prev => ({
                              ...prev,
                              [item.productId]: { ...prev[item.productId], selected: !prev[item.productId].selected }
                            }));
                         }}>
                            <div>
                               {isSelected ? <CheckSquare color="var(--primary)"/> : <Square color="#cbd5e1"/>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Sotilgan: {item.qty} (Qaytarilishi mumkin: {maxAvailable}) | Narxi: <CurrencyDisplay amount={item.sellPrice}/>
                              </div>
                            </div>
                            {isSelected && (
                              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                 <label style={{ fontSize: '0.875rem' }}>Soni:</label>
                                 <input 
                                    type="number" 
                                    min="1" 
                                    max={maxAvailable} 
                                    value={returnQty} 
                                    onChange={e => {
                                      let val = parseInt(e.target.value) || 1;
                                      if (val > maxAvailable) val = maxAvailable;
                                      setReturnSelections(prev => ({
                                        ...prev, [item.productId]: { ...prev[item.productId], returnQty: val }
                                      }));
                                    }}
                                    className="input-field" 
                                    style={{ width: '80px', padding: '0.25rem 0.5rem' }} 
                                 />
                              </div>
                            )}
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}

              {mode === 'exchange' && (
                <>
                  <div className="glass-panel flex-col" style={{ flex: '0 0 auto', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>Sotilgan mahsulotlar (Qaytarish uchun bosing):</div>
                      <button className="btn btn-outline" onClick={handleReturnAllExchange} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}>
                        Barchasini qaytarish
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedSale.items?.map((item, idx) => {
                        const previouslyReturned = selectedSale.returnedItems?.find(r => r.productId === item.productId)?.qty || 0;
                        const returningNow = returningItems.find(r => r.productId === item.productId)?.qty || 0;
                        const availableQty = item.qty - previouslyReturned - returningNow;
                        
                        if (item.qty - previouslyReturned <= 0) return null;

                        return (
                          <div 
                            key={idx} 
                            onClick={() => availableQty > 0 && handleReturnItemExchange(item)}
                            style={{ padding: '0.75rem', backgroundColor: availableQty > 0 ? '#fff' : '#F8FAFC', border: '1px solid', borderColor: availableQty > 0 ? 'var(--border-color)' : '#E2E8F0', borderRadius: 'var(--radius-sm)', cursor: availableQty > 0 ? 'pointer' : 'not-allowed', opacity: availableQty > 0 ? 1 : 0.5, flex: '1 1 calc(33% - 0.5rem)', minWidth: '150px' }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <span>Mavjud: <b style={{color: 'var(--primary)'}}>{item.qty - previouslyReturned}</b></span>
                              <CurrencyDisplay amount={item.sellPrice} />
                            </div>
                            
                            {availableQty > 1 && (
                              <button 
                                className="btn btn-outline" 
                                onClick={(e) => { e.stopPropagation(); handleReturnAllOfItemExchange(item); }}
                                style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem', fontSize: '0.75rem', height: 'auto', display: 'flex', justifyContent: 'center' }}
                              >
                                Barchasini qaytarish
                              </button>
                            )}

                            {returningNow > 0 && (
                              <div style={{ marginTop: '0.5rem', padding: '0.25rem', backgroundColor: '#FEE2E2', color: '#E11D48', borderRadius: '4px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                                {returningNow} ta qaytarilmoqda
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="glass-panel flex-col" style={{ flex: '1', overflow: 'hidden', padding: '1rem' }}>
                    <h2 className="h2" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShoppingBag size={20} color="var(--primary)" /> Yangi Tovar Tanlash
                    </h2>
                    <input 
                      type="text" 
                      placeholder="Katalogdan tovar narxi, nomi yoki shtrix-kodi..." 
                      className="input-field" 
                      value={productSearch} 
                      onChange={e => setProductSearch(e.target.value)}
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
                            <HighlightTextLocal text={p.name} search={productSearch} />
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
                </>
              )}
            </>
          )}
        </div>

        {/* RIGHT SECTION: CALCULATION PANEL */}
        {selectedSale && mode === 'return' && (
          <div className="glass-panel flex-col" style={{ width: '350px', padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
            <h2 className="h2" style={{ margin: 0, marginBottom: '1.5rem' }}>Qaytarish Hisob-kitobi</h2>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Jami qaytariladigan summa:</span>
                <span style={{ fontWeight: 700, color: '#E11D48' }}><CurrencyDisplay amount={calculateReturnTotal()}/></span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Mijozga pulni qaysi usulda qaytarasiz?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-outline" disabled={isProcessing || calculateReturnTotal() === 0} onClick={() => processReturn('naqd')} style={{ width: '100%', justifyContent: 'center' }}>Naqd qaytarish (Kassadan)</button>
                <button className="btn btn-outline" disabled={isProcessing || calculateReturnTotal() === 0} onClick={() => processReturn('karta')} style={{ width: '100%', justifyContent: 'center' }}>Karta orqali qaytarildi</button>
                {selectedSale.customerId && (
                  <button className="btn btn-outline" disabled={isProcessing || calculateReturnTotal() === 0} onClick={() => processReturn('nasiya')} style={{ width: '100%', justifyContent: 'center', borderColor: '#F59E0B', color: '#B45309' }}>Qarzidan chegirib qolish</button>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedSale && mode === 'exchange' && (
          <div className="glass-panel flex-col" style={{ width: '400px', overflow: 'hidden', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', flexShrink: 0 }}>
              <h2 className="h2" style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={22} color="var(--primary)" /> Hisob-kitob
              </h2>
            </div>
            
            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#E11D48', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CornerDownLeft size={16} /> Qaytarilayotgan tovarlar
                </div>
                {returningItems.length === 0 ? (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tanlanmagan</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {returningItems.map(item => (
                      <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#FFF1F2', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button onClick={() => handleRemoveReturnExchange(item)} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: 0 }}><X size={14}/></button>
                          <span>{item.name} <b style={{color: '#E11D48'}}>x{item.qty}</b></span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#E11D48' }}>-<CurrencyDisplay amount={item.sellPrice * item.qty} /></span>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontWeight: 700, color: '#E11D48', marginTop: '0.5rem', borderTop: '1px solid #FFE4E6', paddingTop: '0.5rem' }}>
                      Jami qaytarilmoqda: -<CurrencyDisplay amount={exReturnAmount} />
                    </div>
                  </div>
                )}
              </div>

              <div>
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
                      Jami olinmoqda: +<CurrencyDisplay amount={exNewAmount} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div style={{ flexShrink: 0, backgroundColor: '#F8FAFC', padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.125rem' }}>
                <span style={{ fontWeight: 600 }}>Yakuniy farq:</span>
                <span style={{ fontWeight: 700, color: exDifference > 0 ? 'var(--primary)' : (exDifference < 0 ? '#E11D48' : 'var(--text-main)') }}>
                  {exDifference > 0 ? '+' : ''}<CurrencyDisplay amount={exDifference} />
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
                {exDifference > 0 && "Mijoz qo'shimcha to'lashi kerak:"}
                {exDifference < 0 && "Do'kon mijozga qaytarishi kerak (- balans):"}
                {exDifference === 0 && "Farq yo'q. To'g'ridan-to'g'ri almashtirish."}
              </div>

              {exDifference > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn btn-primary" disabled={isProcessing} onClick={() => processExchange('naqd')} style={{ width: '100%', justifyContent: 'center' }}>
                    <Banknote size={16} /> Naqd pul to'ladi
                  </button>
                  <button className="btn btn-outline" disabled={isProcessing} onClick={() => processExchange('karta')} style={{ width: '100%', justifyContent: 'center' }}>
                    <CreditCard size={16} /> Karta orqali
                  </button>
                  {selectedSale?.customerId && (
                    <button className="btn btn-outline" disabled={isProcessing} onClick={() => processExchange('nasiya')} style={{ width: '100%', justifyContent: 'center', borderColor: '#F59E0B', color: '#B45309' }}>
                      Qarzga yozish
                    </button>
                  )}
                </div>
              )}

              {exDifference < 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn btn-primary" disabled={isProcessing} onClick={() => processExchange('naqd_qaytarildi')} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#E11D48', borderColor: '#E11D48' }}>
                    <Banknote size={16} /> Mijozga naqd qaytarish
                  </button>
                  {selectedSale?.customerId ? (
                    <button className="btn btn-outline" disabled={isProcessing} onClick={() => processExchange('balansga_qoshildi')} style={{ width: '100%', justifyContent: 'center' }}>
                      Mijoz balansiga (Store Credit) qo'shish
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#E11D48', textAlign: 'center' }}>Mijoz balansiga qo'shish uchun xaridor biriktirilgan bo'lishi shart</div>
                  )}
                </div>
              )}

              {exDifference === 0 && (
                <button 
                  className="btn btn-primary" 
                  disabled={isProcessing || (returningItems.length===0 && cart.length===0)} 
                  onClick={() => processExchange('naqd')} // doesn't matter since diff is 0
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {returningItems.length > 0 && cart.length === 0 ? "Qaytarib olishni tasdiqlash" : "Almashtirishni tasdiqlash"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exchange;
