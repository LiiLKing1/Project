import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, getDocs, where, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Search, RefreshCcw, ShoppingBag, ArrowRightLeft, User, CreditCard, Banknote, Calculator, X, ArrowLeft, CheckSquare, Square, CornerDownLeft, Minus, Plus } from 'lucide-react';

const EmptyState = ({ icon: Icon, title, message, compact = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: compact ? '1.5rem' : '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
    <Icon size={compact ? 32 : 48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: compact ? '1rem' : '1.125rem', marginBottom: '0.25rem' }}>{title}</div>
    <div style={{ fontSize: '0.875rem' }}>{message}</div>
  </div>
);

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
  const [selectedPayment, setSelectedPayment] = useState(null);

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
    setSelectedPayment(null);
    
    const initialSelections = {};
    sale.items?.forEach(item => {
      initialSelections[item.productId] = { selected: false, returnQty: item.qty };
    });
    setReturnSelections(initialSelections);
  };

  // ===================== EXCHANGE MODE LOGIC =====================
  const updateReturningItemQty = (item, newQty) => {
    const previouslyReturned = selectedSale.returnedItems?.find(r => r.productId === item.productId)?.qty || 0;
    const maxQty = item.qty - previouslyReturned;
    
    if (newQty <= 0) {
      setReturningItems(prev => prev.filter(p => p.productId !== item.productId));
      return;
    }
    if (newQty > maxQty) {
      addToast(`Ushbu mahsulotdan ko'pi bilan ${maxQty} ta qaytarish mumkin`, 'warning');
      newQty = maxQty;
    }

    setReturningItems(prev => {
      const existing = prev.find(p => p.productId === item.productId);
      if (existing) return prev.map(p => p.productId === item.productId ? { ...p, qty: newQty } : p);
      return [...prev, { ...item, qty: newQty }];
    });
  };

  const handleReturnAllOfItemExchange = (item) => {
    const previouslyReturned = selectedSale.returnedItems?.find(r => r.productId === item.productId)?.qty || 0;
    const maxQty = item.qty - previouslyReturned;
    updateReturningItemQty(item, maxQty);
  };

  const updateCartItemQty = (product, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(p => p.id !== product.id));
      return;
    }
    if (newQty > product.stock) {
      addToast(`Omborda faqat ${product.stock} ta mavjud`, 'warning');
      newQty = product.stock;
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, qty: newQty } : p);
      return [...prev, { ...product, qty: newQty }];
    });
  };

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      addToast('Mahsulot qoldig\'i yo\'q', 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing && existing.qty >= product.stock) {
        addToast('Qoldiqdan ortiq qo\'shib bo\'lmaydi', 'warning');
        return prev;
      }
      if (existing) return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const exReturnAmount = returningItems.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const exNewAmount = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const exDifference = exNewAmount - exReturnAmount; // positive = customer pays us, negative = we pay customer

  // ===================== PROCESS EXCHANGE =====================
  const processExchange = async () => {
    if (!selectedPayment) {
      addToast("Iltimos, to'lov turini tanlang", 'warning');
      return;
    }
    const settlementMethod = selectedPayment;

    if (returningItems.length === 0 && cart.length === 0) return;
    if (!selectedSale) return;
    
    setIsProcessing(true);
    try {
      const shiftsQuery = query(collection(db, `users/${storeId}/shifts`), where('status', '==', 'open'));
      const shiftsSnap = await getDocs(shiftsQuery);
      let openShiftRef = !shiftsSnap.empty ? doc(db, `users/${storeId}/shifts`, shiftsSnap.docs[0].id) : null;

      await runTransaction(db, async (transaction) => {
         // --- 1. ALL READS FIRST ---
         const saleRef = doc(db, `users/${storeId}/sales`, selectedSale.id);
         const saleSnap = await transaction.get(saleRef);
         if (!saleSnap.exists()) throw new Error("Asl sotuv hujjati topilmadi");
         const sData = saleSnap.data();

         let custRef = selectedSale.customerId ? doc(db, `users/${storeId}/customers`, selectedSale.customerId) : null;
         let custSnap = custRef ? await transaction.get(custRef) : null;

         let shiftSnap = openShiftRef ? await transaction.get(openShiftRef) : null;

         const returningProductRefs = returningItems.map(item => doc(db, `users/${storeId}/products`, item.productId));
         const returningProductSnaps = await Promise.all(returningProductRefs.map(ref => transaction.get(ref)));

         const newProductRefs = cart.map(item => doc(db, `users/${storeId}/products`, item.id));
         const newProductSnaps = await Promise.all(newProductRefs.map(ref => transaction.get(ref)));

         // --- 2. CALCULATIONS (NO FIRESTORE CALLS) ---
         const updatedReturningStocks = returningProductSnaps.map((snap, i) => {
            return (snap.exists() ? snap.data().stock : 0) + returningItems[i].qty;
         });
         const updatedNewStocks = newProductSnaps.map((snap, i) => {
            return (snap.exists() ? snap.data().stock : 0) - cart[i].qty;
         });

         let fullyReturned = true;
         let updatedReturnedItems = [...(sData.returnedItems || [])];
         sData.items.forEach(si => {
           const retItem = returningItems.find(r => r.productId === si.productId);
           const previouslyReturned = sData.returnedItems?.find(r => r.productId === si.productId)?.qty || 0;
           const totalNowReturned = previouslyReturned + (retItem ? retItem.qty : 0);
           if (totalNowReturned < si.qty) fullyReturned = false;
         });
         
         returningItems.forEach(ri => {
            const exIdx = updatedReturnedItems.findIndex(x => x.productId === ri.productId);
            if (exIdx >= 0) updatedReturnedItems[exIdx].qty += ri.qty;
            else updatedReturnedItems.push({...ri});
         });

         const currentCustData = custSnap?.exists() ? custSnap.data() : null;
         let newDebt = currentCustData?.currentDebt || 0;
         let newStoreCredit = currentCustData?.storeCredit || 0;
         let shouldUpdateCust = false;
         let debtDocData = null;
         let creditDocData = null;

         if (currentCustData) {
           if (exDifference > 0 && settlementMethod === 'nasiya') {
             newDebt += exDifference;
             shouldUpdateCust = true;
             debtDocData = {
               customerId: selectedSale.customerId, amount: exDifference, type: 'given', date: new Date().toISOString(),
               createdAt: serverTimestamp(), note: 'Almashtirish ustiga qarz', cashier: userProfile?.name || 'Kassir',
             };
           } else if (exDifference < 0 && settlementMethod === 'balansga_qoshildi') {
             newStoreCredit += Math.abs(exDifference);
             shouldUpdateCust = true;
             creditDocData = {
               customerId: selectedSale.customerId, amount: Math.abs(exDifference), type: 'exchange_credit',
               note: 'Almashtirishdan ortib qolgan summa', createdAt: serverTimestamp()
             };
           }
         }

         let newShiftCash = shiftSnap?.exists() ? (shiftSnap.data().currentCash || 0) : 0;
         let shouldUpdateShift = false;
         if (shiftSnap?.exists()) {
           if (exDifference > 0 && settlementMethod === 'naqd') {
             newShiftCash += exDifference;
             shouldUpdateShift = true;
           } else if (exDifference < 0 && settlementMethod === 'naqd_qaytarildi') {
             newShiftCash += exDifference; // exDiff is negative
             shouldUpdateShift = true;
           }
         }

         // --- 3. ALL WRITES ---
         const exchangeRef = doc(collection(db, `users/${storeId}/exchanges`));
         transaction.set(exchangeRef, {
           storeId, originalSaleId: selectedSale.id, customerId: selectedSale.customerId || null,
           customerName: selectedSale.customerName || null, returnedItems: returningItems, newItems: cart,
           totalReturnAmount: exReturnAmount, totalNewAmount: exNewAmount, priceDifference: exDifference,
           settlementMethod, createdAt: serverTimestamp(), cashier: userProfile?.name || 'Kassir',
         });

         returningProductRefs.forEach((ref, i) => { transaction.update(ref, { stock: updatedReturningStocks[i] }); });
         newProductRefs.forEach((ref, i) => { transaction.update(ref, { stock: updatedNewStocks[i] }); });

         if (shouldUpdateCust && custRef) {
           transaction.update(custRef, { currentDebt: newDebt, storeCredit: newStoreCredit });
           if (debtDocData) transaction.set(doc(collection(db, `users/${storeId}/customerDebts`)), debtDocData);
           if (creditDocData) transaction.set(doc(collection(db, `users/${storeId}/customerCredits`)), creditDocData);
         }

         if (shouldUpdateShift && openShiftRef) {
           transaction.update(openShiftRef, { currentCash: newShiftCash });
         }

         transaction.update(saleRef, { status: fullyReturned ? 'fully_returned' : 'partially_returned', returnedItems: updatedReturnedItems });

         const auditRef = doc(collection(db, `users/${storeId}/auditLogs`));
         transaction.set(auditRef, { action: 'exchange_processed', details: `Sotuv ${selectedSale.saleNumber} almashtirildi. Farq: ${exDifference}`, userId: userProfile?.uid || 'unknown', userName: userProfile?.name || 'Kassir', createdAt: serverTimestamp() });
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
  const processReturn = async () => {
    if (!selectedPayment) {
      addToast("Iltimos, to'lov turini tanlang", 'warning');
      return;
    }
    const refundMethod = selectedPayment;

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
         // --- 1. ALL READS ---
         const saleRef = doc(db, `users/${storeId}/sales`, selectedSale.id);
         const saleSnap = await transaction.get(saleRef);
         if (!saleSnap.exists()) throw new Error("Asl sotuv hujjati topilmadi");
         const sData = saleSnap.data();

         let custRef = selectedSale.customerId ? doc(db, `users/${storeId}/customers`, selectedSale.customerId) : null;
         let custSnap = custRef ? await transaction.get(custRef) : null;

         let shiftSnap = openShiftRef ? await transaction.get(openShiftRef) : null;

         const returningProductRefs = itemsToReturn.map(item => doc(db, `users/${storeId}/products`, item.productId));
         const returningProductSnaps = await Promise.all(returningProductRefs.map(ref => transaction.get(ref)));

         // --- 2. CALCULATIONS ---
         const updatedReturningStocks = returningProductSnaps.map((snap, i) => {
            return (snap.exists() ? snap.data().stock : 0) + itemsToReturn[i].qty;
         });

         let fullyReturned = true;
         let updatedReturnedItems = [...(sData.returnedItems || [])];
         sData.items.forEach(si => {
           const retItem = itemsToReturn.find(r => r.productId === si.productId);
           const previouslyReturned = sData.returnedItems?.find(r => r.productId === si.productId)?.qty || 0;
           const totalNowReturned = previouslyReturned + (retItem ? retItem.qty : 0);
           if (totalNowReturned < si.qty) fullyReturned = false;
         });
         
         itemsToReturn.forEach(ri => {
            const exIdx = updatedReturnedItems.findIndex(x => x.productId === ri.productId);
            if (exIdx >= 0) updatedReturnedItems[exIdx].qty += ri.qty;
            else updatedReturnedItems.push({...ri});
         });

         const currentCustData = custSnap?.exists() ? custSnap.data() : null;
         let newDebt = currentCustData?.currentDebt || 0;
         let shouldUpdateCust = false;
         let debtDocData = null;

         if (currentCustData && refundMethod === 'nasiya') {
             newDebt = Math.max(0, newDebt - refundAmount);
             shouldUpdateCust = true;
             debtDocData = {
               customerId: selectedSale.customerId, amount: refundAmount, type: 'paid', date: new Date().toISOString(),
               createdAt: serverTimestamp(), note: 'Qaytarish orqali qarzdan chegirildi', cashier: userProfile?.name || 'Kassir',
             };
         }

         let newShiftCash = shiftSnap?.exists() ? (shiftSnap.data().currentCash || 0) : 0;
         let shouldUpdateShift = false;
         if (shiftSnap?.exists() && refundMethod === 'naqd') {
             newShiftCash -= refundAmount;
             shouldUpdateShift = true;
         }

         // --- 3. ALL WRITES ---
         const returnRef = doc(collection(db, `users/${storeId}/returns`));
         transaction.set(returnRef, {
           originalSaleId: selectedSale.id, items: itemsToReturn, refundAmount, refundMethod,
           reason: 'Foydalanuvchi orqali qaytarildi', cashierId: userProfile?.uid || null,
           cashierName: userProfile?.name || 'Kassir', createdAt: serverTimestamp(), storeId
         });

         returningProductRefs.forEach((ref, i) => { transaction.update(ref, { stock: updatedReturningStocks[i] }); });

         if (shouldUpdateCust && custRef) {
           transaction.update(custRef, { currentDebt: newDebt });
           if (debtDocData) transaction.set(doc(collection(db, `users/${storeId}/customerDebts`)), debtDocData);
         }

         if (shouldUpdateShift && openShiftRef) {
           transaction.update(openShiftRef, { currentCash: newShiftCash });
         }

         transaction.update(saleRef, { status: fullyReturned ? 'fully_returned' : 'partially_returned', returnedItems: updatedReturnedItems });

         const auditRef = doc(collection(db, `users/${storeId}/auditLogs`));
         transaction.set(auditRef, { action: 'return_processed', details: `Sotuv ${selectedSale.saleNumber} dan qaytarildi. Summa: ${refundAmount}`, userId: userProfile?.uid || 'unknown', userName: userProfile?.name || 'Kassir', createdAt: serverTimestamp() });
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
      
      {/* Top Tabs */}
      <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '0 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <button 
          onClick={() => { setMode('return'); setSelectedSale(null); setSelectedPayment(null); }}
          style={{ padding: '1.25rem 1rem', borderBottom: mode === 'return' ? '2px solid var(--primary)' : '2px solid transparent', color: mode === 'return' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
        >
          <CornerDownLeft size={18} /> Qaytarish (Vozvrat)
        </button>
        <button 
          onClick={() => { setMode('exchange'); setSelectedSale(null); setSelectedPayment(null); }}
          style={{ padding: '1.25rem 1rem', borderBottom: mode === 'exchange' ? '2px solid var(--primary)' : '2px solid transparent', color: mode === 'exchange' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
        >
          <ArrowRightLeft size={18} /> Almashtirish
        </button>
      </div>

      <div style={{ padding: '1.5rem', flex: 1, minHeight: 0, display: 'flex', gap: '1.5rem' }}>
        {/* LEFT COLUMN: Scrollable */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          {!selectedSale ? (
            <div className="glass-panel flex-col" style={{ flex: '1 1 auto', padding: '1.5rem' }}>
               <h2 className="h2" style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <RefreshCcw size={20} color="var(--primary)" /> Qaytariladigan sotuvni (chekni) tanlang
               </h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                 <Search size={18} color="var(--text-secondary)" />
                 <input 
                    type="text" 
                    placeholder="Chek raqami, mijoz yoki summa bo'yicha qidirish..." 
                    value={saleSearch} 
                    onChange={e => setSaleSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.875rem' }}
                  />
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {filteredSales.map(sale => (
                   <div 
                     key={sale.id} 
                     onClick={() => handleSelectSale(sale)}
                     style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                     className="hover-card"
                   >
                     <div>
                       <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                         {sale.saleNumber || 'Raqamsiz'}
                         {sale.status === 'fully_returned' && <span style={{fontSize:'0.65rem', padding:'2px 6px', background:'#FEE2E2', color:'#EF4444', borderRadius:'4px', fontWeight: 700}}>Qaytarilgan</span>}
                         {sale.status === 'partially_returned' && <span style={{fontSize:'0.65rem', padding:'2px 6px', background:'#FEF3C7', color:'#F59E0B', borderRadius:'4px', fontWeight: 700}}>Qisman qaytgan</span>}
                       </div>
                       <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                         <User size={14}/> {sale.customerName || 'Umumiy xaridor'}
                       </div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}><CurrencyDisplay amount={sale.finalTotal} /></div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                         {new Date(sale.createdAt).toLocaleString()}
                       </div>
                     </div>
                   </div>
                 ))}
                 {filteredSales.length === 0 && (
                   <EmptyState icon={RefreshCcw} title="Sotuvlar topilmadi" message="Qidiruvingiz bo'yicha hech qanday chek topilmadi." />
                 )}
               </div>
            </div>
          ) : (
            <>
              {/* Selected Sale Header */}
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-main)' }}>Chek: {selectedSale.saleNumber}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={14}/> {selectedSale.customerName || 'Umumiy xaridor'}</div>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedSale(null)}>
                  <ArrowLeft size={16}/> Boshqa chekni tanlash
                </button>
              </div>

              {/* Returning Items Section (Used in both modes, but slightly different interactions) */}
              <div className="glass-panel flex-col" style={{ flexShrink: 0, padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#E11D48', fontSize: '1.125rem' }}>
                  <CornerDownLeft size={20} /> Mijoz qaytarayotgan mahsulotlar
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {selectedSale.items?.map((item, idx) => {
                     const previouslyReturned = selectedSale.returnedItems?.find(r => r.productId === item.productId)?.qty || 0;
                     const maxAvailable = item.qty - previouslyReturned;
                     
                     if (maxAvailable <= 0) return null; // Already fully returned

                     if (mode === 'return') {
                       // Return Mode Interaction
                       const sel = returnSelections[item.productId];
                       const isSelected = sel?.selected || false;
                       const returnQty = sel?.returnQty || 0;
                       
                       return (
                         <div key={idx} onClick={() => {
                            setReturnSelections(prev => ({
                              ...prev, [item.productId]: { ...prev[item.productId], selected: !prev[item.productId].selected }
                            }));
                         }} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', backgroundColor: isSelected ? '#FFF1F2' : 'var(--bg-main)', border: isSelected ? '1px solid #FDA4AF' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ marginTop: '0.125rem' }}>
                               {isSelected ? <CheckSquare color="#E11D48" size={20}/> : <Square color="#94A3B8" size={20}/>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Sotilgan: <span style={{fontWeight: 600}}>{item.qty}</span> ta (Qaytarish mumkin: {maxAvailable})
                              </div>
                              <div style={{ fontWeight: 700, color: 'var(--primary)' }}><CurrencyDisplay amount={item.sellPrice}/></div>
                              
                              {isSelected && (
                                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', overflow: 'hidden' }}>
                                      <button onClick={() => setReturnSelections(prev => ({ ...prev, [item.productId]: { ...prev[item.productId], returnQty: Math.max(1, returnQty - 1) } }))} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Minus size={14}/></button>
                                      <input type="number" min="1" max={maxAvailable} value={returnQty} onChange={e => {
                                          let val = parseInt(e.target.value) || 1;
                                          if (val > maxAvailable) val = maxAvailable;
                                          setReturnSelections(prev => ({ ...prev, [item.productId]: { ...prev[item.productId], returnQty: val } }));
                                        }} style={{ width: '40px', textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.5rem 0', outline: 'none', fontWeight: 600 }} 
                                      />
                                      <button onClick={() => setReturnSelections(prev => ({ ...prev, [item.productId]: { ...prev[item.productId], returnQty: Math.min(maxAvailable, returnQty + 1) } }))} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Plus size={14}/></button>
                                   </div>
                                   <button onClick={() => setReturnSelections(prev => ({ ...prev, [item.productId]: { ...prev[item.productId], returnQty: maxAvailable } }))} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '0.5rem' }}>Barchasi</button>
                                </div>
                              )}
                            </div>
                         </div>
                       )
                     } else {
                       // Exchange Mode Interaction
                       const returningNow = returningItems.find(r => r.productId === item.productId)?.qty || 0;
                       return (
                         <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mavjud: {maxAvailable} ta</div>
                            <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}><CurrencyDisplay amount={item.sellPrice}/></div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                               <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                                  <button onClick={() => updateReturningItemQty(item, returningNow - 1)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Minus size={14}/></button>
                                  <input type="number" min="0" max={maxAvailable} value={returningNow} onChange={e => updateReturningItemQty(item, parseInt(e.target.value) || 0)} style={{ width: '40px', textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.5rem 0', outline: 'none', fontWeight: 600 }} />
                                  <button onClick={() => updateReturningItemQty(item, returningNow + 1)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Plus size={14}/></button>
                               </div>
                               <button onClick={() => handleReturnAllOfItemExchange(item)} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '0.5rem' }}>Barchasi</button>
                            </div>
                         </div>
                       )
                     }
                  })}
                  {selectedSale.items?.filter(i => (i.qty - (selectedSale.returnedItems?.find(r => r.productId === i.productId)?.qty || 0)) > 0).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Bu chekdagi barcha tovarlar qaytarib bo'lingan.</div>
                  )}
                </div>
              </div>

              {/* Exchange Catalog Section */}
              {mode === 'exchange' && (
                <div className="glass-panel flex-col" style={{ flexShrink: 0, padding: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '1.125rem' }}>
                    <ShoppingBag size={20} /> Yangi Tovar Tanlash (Katalog)
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input 
                      type="text" 
                      placeholder="Katalogdan tovar qidirish..." 
                      value={productSearch} 
                      onChange={e => setProductSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.875rem' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {filteredProducts.map(p => (
                      <div key={p.id} onClick={() => handleAddToCart(p)} className="hover-card" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                          <HighlightTextLocal text={p.name} search={productSearch} />
                        </div>
                        <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1.125rem', margin: '0.5rem 0' }}>
                          <CurrencyDisplay amount={p.sellPrice} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: p.stock > 0 ? 'var(--text-secondary)' : '#EF4444', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <div style={{width: 6, height: 6, borderRadius: '50%', backgroundColor: p.stock > 0 ? '#10B981' : '#EF4444'}}></div>
                          Qoldiq: {p.stock}
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div style={{ gridColumn: '1 / -1' }}><EmptyState icon={ShoppingBag} title="Tovarlar topilmadi" message="Qidiruvingiz bo'yicha tovar topilmadi." /></div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Calculation Panel */}
        {selectedSale && (
          <div className="glass-panel" style={{ position: 'sticky', top: '0', width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
            {/* Calc Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <h2 className="h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calculator size={24} color="var(--primary)" /> Hisob-kitob
              </h2>
            </div>
            
            {/* Calc Body (Scrollable) */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Returning List */}
              {mode === 'return' ? (
                <div>
                  <div style={{ fontWeight: 600, color: '#E11D48', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CornerDownLeft size={18} /> Qaytarilayotgan tovarlar
                  </div>
                  {calculateReturnTotal() === 0 ? (
                    <EmptyState icon={RefreshCcw} title="Tanlanmagan" message="Chap tomondan tovarlarni belgilang" compact />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.keys(returnSelections).filter(id => returnSelections[id].selected && returnSelections[id].returnQty > 0).map(id => {
                        const item = selectedSale.items.find(i => i.productId === id);
                        const qty = returnSelections[id].returnQty;
                        return (
                          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-main)', flex: 1 }}>{item.name} <b style={{color: '#E11D48', marginLeft: '4px'}}>x{qty}</b></span>
                            <span style={{ fontWeight: 600, color: '#E11D48' }}>-<CurrencyDisplay amount={item.sellPrice * qty} /></span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontWeight: 600, color: '#E11D48', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CornerDownLeft size={18} /> Qaytarilayotgan tovarlar
                    </div>
                    {returningItems.length === 0 ? (
                      <EmptyState icon={RefreshCcw} title="Tanlanmagan" message="Chap tomondan tovarlarni belgilang" compact />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {returningItems.map(item => (
                          <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-main)', flex: 1 }}>{item.name} <b style={{color: '#E11D48', marginLeft: '4px'}}>x{item.qty}</b></span>
                            <span style={{ fontWeight: 600, color: '#E11D48' }}>-<CurrencyDisplay amount={item.sellPrice * item.qty} /></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShoppingBag size={18} /> Yangi olinayotgan tovarlar
                    </div>
                    {cart.length === 0 ? (
                      <EmptyState icon={ShoppingBag} title="Tanlanmagan" message="Katalogdan yangi tovarlarni qo'shing" compact />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {cart.map(item => (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                              <span style={{ color: 'var(--text-main)', flex: 1 }}>{item.name}</span>
                              <span style={{ fontWeight: 600, color: 'var(--success)' }}>+<CurrencyDisplay amount={item.sellPrice * item.qty} /></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', overflow: 'hidden', width: 'max-content' }}>
                              <button onClick={() => updateCartItemQty(item, item.qty - 1)} style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Minus size={14}/></button>
                              <input type="number" min="0" max={item.stock} value={item.qty} onChange={e => updateCartItemQty(item, parseInt(e.target.value) || 0)} style={{ width: '40px', textAlign: 'center', border: 'none', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.25rem 0', outline: 'none', fontWeight: 600, fontSize: '0.875rem' }} />
                              <button onClick={() => updateCartItemQty(item, item.qty + 1)} style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex' }}><Plus size={14}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Calc Footer (Fixed) */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              
              {mode === 'return' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Qaytarilmoqda:</span>
                    <span style={{ fontWeight: 700, color: '#E11D48' }}><CurrencyDisplay amount={calculateReturnTotal()}/></span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button className={`btn ${selectedPayment === 'naqd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPayment('naqd')} style={{ width: '100%', justifyContent: 'center' }}>
                      <Banknote size={16} /> Naqd (Kassadan) qaytarish
                    </button>
                    <button className={`btn ${selectedPayment === 'karta' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPayment('karta')} style={{ width: '100%', justifyContent: 'center' }}>
                      <CreditCard size={16} /> Karta orqali qaytarildi
                    </button>
                    <button 
                      className={`btn ${selectedPayment === 'nasiya' ? 'btn-primary' : 'btn-outline'}`} 
                      disabled={!selectedSale.customerId}
                      onClick={() => setSelectedPayment('nasiya')} 
                      style={{ width: '100%', justifyContent: 'center', ...(selectedPayment === 'nasiya' ? {backgroundColor: '#F59E0B', borderColor: '#F59E0B'} : {}) }}
                    >
                      <User size={16} /> Mijoz qarzidan chegirish
                    </button>
                  </div>
                  
                  <button 
                    className="btn btn-primary" 
                    disabled={isProcessing || calculateReturnTotal() === 0 || !selectedPayment} 
                    onClick={processReturn} 
                    style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem', backgroundColor: '#E11D48', borderColor: '#E11D48' }}
                  >
                    Tasdiqlash va Qaytarish
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Yakuniy farq:</span>
                    <span style={{ fontWeight: 700, color: exDifference > 0 ? 'var(--primary)' : (exDifference < 0 ? '#E11D48' : 'var(--text-secondary)') }}>
                      {exDifference > 0 ? '+' : ''}<CurrencyDisplay amount={exDifference} />
                    </span>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center', fontWeight: 500 }}>
                    {exDifference > 0 && "Mijoz qo'shimcha to'lashi kerak:"}
                    {exDifference < 0 && "Do'kon mijozga qaytarishi kerak:"}
                    {exDifference === 0 && "Farq yo'q (Nol). To'lov turini tanlang:"}
                  </div>

                  {exDifference > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <button className={`btn ${selectedPayment === 'naqd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPayment('naqd')} style={{ width: '100%', justifyContent: 'center' }}>
                        <Banknote size={16} /> Mijoz naqd to'laydi
                      </button>
                      <button className={`btn ${selectedPayment === 'karta' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPayment('karta')} style={{ width: '100%', justifyContent: 'center' }}>
                        <CreditCard size={16} /> Karta orqali to'laydi
                      </button>
                      <button 
                        className={`btn ${selectedPayment === 'nasiya' ? 'btn-primary' : 'btn-outline'}`} 
                        disabled={!selectedSale?.customerId}
                        onClick={() => setSelectedPayment('nasiya')} 
                        style={{ width: '100%', justifyContent: 'center', ...(selectedPayment === 'nasiya' ? {backgroundColor: '#F59E0B', borderColor: '#F59E0B'} : {}) }}
                      >
                        <User size={16} /> Mijoz qarziga qo'shish
                      </button>
                    </div>
                  )}

                  {exDifference <= 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <button className={`btn ${selectedPayment === 'naqd_qaytarildi' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedPayment('naqd_qaytarildi')} style={{ width: '100%', justifyContent: 'center', ...(selectedPayment === 'naqd_qaytarildi' ? {backgroundColor: '#E11D48', borderColor: '#E11D48'} : {}) }}>
                        <Banknote size={16} /> Naqd (Kassadan) qaytarish
                      </button>
                      <button 
                        className={`btn ${selectedPayment === 'balansga_qoshildi' ? 'btn-primary' : 'btn-outline'}`} 
                        disabled={!selectedSale?.customerId}
                        onClick={() => setSelectedPayment('balansga_qoshildi')} 
                        style={{ width: '100%', justifyContent: 'center', ...(selectedPayment === 'balansga_qoshildi' ? {backgroundColor: 'var(--success)', borderColor: 'var(--success)'} : {}) }}
                      >
                        <User size={16} /> Mijoz balansiga (Store Credit) qo'shish
                      </button>
                      {!selectedSale?.customerId && (
                        <div style={{ fontSize: '0.75rem', color: '#E11D48', textAlign: 'center' }}>Balansga qo'shish uchun xaridor biriktirilgan bo'lishi shart</div>
                      )}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-primary" 
                    disabled={isProcessing || (returningItems.length===0 && cart.length===0) || !selectedPayment} 
                    onClick={processExchange} 
                    style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}
                  >
                    Almashtirishni Tasdiqlash
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exchange;
