import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, FileText, ChevronDown } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, runTransaction, doc, addDoc, orderBy } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import Receipt from '../../components/Receipt';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('cash'); // cash, card, mixed, debt
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), where('status', '==', 'active')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCustomers = onSnapshot(query(collection(db, `users/${storeId}/customers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [storeId]);

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
  const total = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );
  
  const cleanPhoneSearch = customerSearch.replace(/\s+/g, '').toLowerCase();
  const cleanNameSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customerSearch.trim() ? customers.filter(c => 
    (c?.fullName || '').toLowerCase().includes(cleanNameSearch) || (c?.phone || '').includes(cleanPhoneSearch)
  ).slice(0, 5) : [];

  const handleCheckout = async () => {
    if (paymentType === 'debt' && !selectedCustomer) {
      addToast('Nasiyaga sotish uchun mijoz tanlanishi shart', 'error');
      return;
    }

    const cash = Number(cashAmount) || 0;
    const card = Number(cardAmount) || 0;

    if (cart.some(item => !item.qty || item.qty < 1)) {
      addToast('Barcha mahsulotlar soni kamida 1 bo\'lishi kerak', 'error');
      return;
    }

    if (paymentType === 'mixed' && (cash + card) < total) {
      addToast('To\'lov summasi yetarli emas', 'error');
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
          if (!snap.exists() || snap.data().stock < item.qty) {
            throw new Error(`Xatolik: ${item.name} qoldig'i yetarli emas.`);
          }
        }

        // 2. Perform writes
        for (let i = 0; i < productSnaps.length; i++) {
          const snap = productSnaps[i];
          const item = productRefs[i];
          transaction.update(item.ref, { stock: snap.data().stock - item.qty });
        }

        // 3. Create Sale Document
        const saleRef = doc(collection(db, `users/${storeId}/sales`));
        const saleData = {
          saleNumber: 'CH-' + Date.now().toString().slice(-6),
          items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.sellPrice, costPrice: i.costPrice })),
          total: total,
          paymentType: paymentType,
          cashReceived: paymentType === 'cash' ? cash || total : cash,
          cardAmount: paymentType === 'card' ? total : card,
          customerId: selectedCustomer?.id || null,
          cashierId: userProfile?.name || 'Kassir',
          status: 'completed',
          createdAt: new Date().toISOString()
        };
        transaction.set(saleRef, saleData);
        finalSaleData = { id: saleRef.id, ...saleData };

        // 4. Update Customer if necessary
        if (selectedCustomer && custSnap.exists()) {
          const updates = { totalPurchases: (custSnap.data().totalPurchases || 0) + total, visits: (custSnap.data().visits || 0) + 1 };
          if (paymentType === 'debt') {
            updates.currentDebt = (custSnap.data().currentDebt || 0) + total;
            const debtRef = doc(collection(db, `users/${storeId}/customerDebts`));
            transaction.set(debtRef, { customerId: selectedCustomer.id, type: 'debt', amount: total, date: new Date().toISOString() });
          }
          transaction.update(custRef, updates);
        }
      });

      addToast('Sotuv muvaffaqiyatli amalga oshirildi', 'success');
      setLastSale({ ...finalSaleData, customerName: selectedCustomer?.fullName });
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPaymentModal = (type) => {
    setPaymentType(type);
    setCashAmount('');
    setCardAmount('');
    setIsPaymentModalOpen(true);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', height: '100%' }}>
      {/* Products Section */}
      <div className="flex-col" style={{ gap: '1.5rem', overflow: 'hidden' }}>
        <div className="flex-between">
          <h1 className="h1">Sotuv Oynasi</h1>
          <div style={{ position: 'relative', width: '350px' }}>
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
              <div style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.125rem' }}>{formatMoney(p.sellPrice)}</div>
              <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <span>{p.barcode}</span>
                <span style={{ fontWeight: 600, color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)' }}>Qoldiq: {p.stock}</span>
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
                    <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem' }}>{formatMoney(item.sellPrice * item.qty)}</div>
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
            <span className="h1" style={{ color: 'var(--primary)', fontSize: '2rem' }}>{formatMoney(total)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <button className="btn btn-success" disabled={cart.length === 0} onClick={() => openPaymentModal('cash')} style={{ padding: '1rem', fontSize: '1rem' }}>
              <Banknote size={20} /> Naqd
            </button>
            <button className="btn btn-primary" disabled={cart.length === 0} onClick={() => openPaymentModal('card')} style={{ padding: '1rem', fontSize: '1rem' }}>
              <CreditCard size={20} /> Karta
            </button>
          </div>
          <button className="btn btn-outline" disabled={cart.length === 0} onClick={() => openPaymentModal('mixed')} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
             Aralash to'lov / Nasiya
          </button>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => !isProcessing && setIsPaymentModalOpen(false)} title="To'lovni qabul qilish">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.5rem' }}>To'lanishi kerak</div>
            <div className="h1" style={{ color: 'var(--primary)' }}>{formatMoney(total)}</div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['cash', 'card', 'mixed', 'debt'].map(type => (
              <button key={type} onClick={() => setPaymentType(type)} className="btn" style={{ flex: 1, backgroundColor: paymentType === type ? 'var(--primary)' : 'var(--bg-main)', color: paymentType === type ? 'white' : 'var(--text-secondary)' }}>
                {type === 'cash' ? 'Naqd' : type === 'card' ? 'Karta' : type === 'mixed' ? 'Aralash' : 'Nasiya'}
              </button>
            ))}
          </div>

          {paymentType === 'cash' && (
            <FormInput label="Qabul qilingan summa (UZS)" type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder={total} />
          )}
          
          {paymentType === 'mixed' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormInput label="Naqd (UZS)" type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0" />
              <FormInput label="Karta (UZS)" type="number" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="0" />
            </div>
          )}

          {paymentType === 'debt' && !selectedCustomer && (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 500, padding: '1rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>
              Nasiyaga sotish uchun kassa oynasidan mijozni tanlashingiz shart!
            </div>
          )}

          {paymentType === 'cash' && Number(cashAmount) > total && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px dashed var(--success)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600 }}>Qaytim:</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatMoney(Number(cashAmount) - total)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsPaymentModalOpen(false)} disabled={isProcessing}>Bekor qilish</button>
            <button className="btn btn-success" onClick={handleCheckout} disabled={isProcessing || (paymentType === 'debt' && !selectedCustomer)}>
              {isProcessing ? 'Bajarilmoqda...' : <><FileText size={18} /> To'lash</>}
            </button>
          </div>
        </div>
      </Modal>

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
