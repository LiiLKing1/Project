import React, { useState, useEffect } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const NewSale = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Naqd');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      const prodSnap = await getDocs(collection(db, `users/${storeId}/products`));
      const prodData = [];
      prodSnap.forEach(d => prodData.push({ id: d.id, ...d.data() }));
      setProducts(prodData);

      const custSnap = await getDocs(collection(db, `users/${storeId}/customers`));
      const custData = [];
      custSnap.forEach(d => custData.push({ id: d.id, ...d.data() }));
      setCustomers(custData);
    };
    fetchData();
  }, [storeId]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddToCart = (prod) => {
    const exists = cart.find(item => item.id === prod.id);
    if (exists) {
      setCart(cart.map(item => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...prod, qty: 1, sellingPrice: prod.currencySettings === 'USD' ? prod.priceUsd : prod.priceUz, currency: prod.currencySettings }]);
    }
    setSearchQuery(''); // Qidiruvni tozalash
  };

  const handleUpdateQty = (id, newQty) => {
    if (newQty <= 0) return;
    setCart(cart.map(item => item.id === id ? { ...item, qty: Number(newQty) } : item));
  };

  const handleUpdatePrice = (id, newPrice) => {
    if (newPrice < 0) return;
    setCart(cart.map(item => item.id === id ? { ...item, sellingPrice: Number(newPrice) } : item));
  };

  const handleRemoveFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Convert USD to UZS roughly for total calculation if needed, 
  // but for simplicity, we assume UZS is standard or calculate them separately.
  // We will assume sellingPrice is in the currency they set, we will just sum numbers.
  // As an improvement, USD can be converted to UZS, but let's just sum what they type.
  const totalSum = cart.reduce((acc, item) => acc + (item.sellingPrice * item.qty), 0);

  const handleProcessSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || !storeId) return;
    if (paymentMethod === 'Qarz' && !selectedCustomer) {
      return alert('Nasiyaga sotish uchun mijozni tanlang!');
    }
    setIsSubmitting(true);

    try {
      // 1. Record Sale
      await addDoc(collection(db, `users/${storeId}/sales`), {
        items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.sellingPrice, currency: c.currency })),
        totalSum,
        paymentMethod,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || null,
        date: serverTimestamp(),
      });

      // 2. Reduce Inventory
      for (const item of cart) {
        const prodRef = doc(db, `users/${storeId}/products`, item.id);
        const originalQty = Number(item.quantity) || 0;
        await updateDoc(prodRef, {
          quantity: Math.max(0, originalQty - item.qty)
        });
      }

      // 3. Agar nasiyaga bo'lsa mijoz qarzini yangilaymiz
      if (paymentMethod === 'Qarz' && selectedCustomer) {
        const custRef = doc(db, `users/${storeId}/customers`, selectedCustomer.id);
        await updateDoc(custRef, {
          debt: increment(totalSum),
          totalPurchases: increment(totalSum)
        });
      } else if (selectedCustomer) {
        const custRef = doc(db, `users/${storeId}/customers`, selectedCustomer.id);
        await updateDoc(custRef, {
          totalPurchases: increment(totalSum)
        });
      }

      alert('Sotuv muvaffaqiyatli amalga oshirildi!');
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setShowModal(false);
      
      // Re-fetch products
      const snap = await getDocs(collection(db, `users/${storeId}/products`));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setProducts(data);

    } catch (error) {
      console.error('Xatolik:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Yangi sotuv</h1>
        <button 
          onClick={() => cart.length > 0 ? setShowModal(true) : alert("Savat bo'sh!")}
          style={{ padding: '0.6rem 2rem', backgroundColor: 'var(--success)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '1.1rem' }}
        >
          To'lov
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Chap qism: Kassa Savati */}
        <div style={{ flex: 2, padding: '1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mahsulot nomi bo'yicha qidirish..." 
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--primary-light)', outline: 'none', fontSize: '1.1rem' }}
            />
            {/* Tez qidiruv natijalari */}
            {searchQuery && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-md)', zIndex: 10, maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Topilmadi</div>
                ) : (
                  filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleAddToCart(p)}
                      style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ fontWeight: '600' }}>{p.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Qoldiq: {p.quantity} {p.unit}</div>
                      </div>
                      <div style={{ color: 'var(--primary)', fontWeight: '600' }}>
                        {p.currencySettings === 'USD' ? `$${p.priceUsd}` : formatMoney(p.priceUz)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Savat ro'yxati</h3>
          
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
              Yuqoridan mahsulot qidiring
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <tr>
                    <th style={{ padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Nomi</th>
                    <th style={{ padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Narxi</th>
                    <th style={{ padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Miqdori</th>
                    <th style={{ padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Jami</th>
                    <th style={{ padding: '1rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <input 
                          type="number" 
                          value={item.sellingPrice}
                          onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                          style={{ width: '100px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => handleUpdateQty(item.id, e.target.value)}
                          style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                        />
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.unit}</span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>
                        {formatMoney(item.sellingPrice * item.qty)}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <button onClick={() => handleRemoveFromCart(item.id)} style={{ color: 'var(--danger)', padding: '0.5rem' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Umumiy summa:</span>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatMoney(totalSum)}</span>
          </div>
        </div>

        {/* O'ng qism: Tezkor katalog */}
        <div style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--bg-main)', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Barcha mahsulotlar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            {products.map(p => (
              <div 
                key={p.id} 
                onClick={() => handleAddToCart(p)}
                style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: '500' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qoldiq: {p.quantity} {p.unit}</div>
                </div>
                <div style={{ color: 'var(--primary)', fontWeight: '600' }}>
                  {p.currencySettings === 'USD' ? `$${p.priceUsd}` : formatMoney(p.priceUz)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {showModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>To'lov qilish</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleProcessSale} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>To'lanadigan summa</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatMoney(totalSum)}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>To'lov turini tanlang</label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)', fontSize: '1rem', fontWeight: '500' }} 
                >
                  <option value="Naqd">💵 Naqd pul</option>
                  <option value="Karta">💳 Plastik karta</option>
                  <option value="Qarz">📋 Nasiya (Qarzga)</option>
                </select>
              </div>

              {/* Mijoz tanlash (ixtiyoriy, nasiya uchun majburiy) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Mijoz {paymentMethod === 'Qarz' ? <span style={{ color: 'var(--danger)' }}>* (Majburiy)</span> : '(Ixtiyoriy)'}
                </label>
                {selectedCustomer ? (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedCustomer.name}</span>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                      <X size={16} color="var(--danger)" />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder="Mijoz nomini qidiring..."
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
                    />
                    {customerSearch && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-md)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}>
                        {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                          <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: '500' }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: c.debt > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {c.debt > 0 ? `Qarz: ${formatMoney(c.debt)}` : 'Qarzsiz'}
                            </div>
                          </div>
                        ))}
                        {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Topilmadi</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--success)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {isSubmitting ? 'Jarayonda...' : '✓ Sotish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSale;
