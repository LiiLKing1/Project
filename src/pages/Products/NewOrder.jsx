import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const NewOrder = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const fetchData = async () => {
      // Fetch suppliers
      const supSnap = await getDocs(collection(db, `users/${storeId}/suppliers`));
      const supData = [];
      supSnap.forEach(d => supData.push({ id: d.id, ...d.data() }));
      setSuppliers(supData);

      // Fetch products for catalog selection
      const prodSnap = await getDocs(collection(db, `users/${storeId}/products`));
      const prodData = [];
      prodSnap.forEach(d => prodData.push({ id: d.id, ...d.data() }));
      setProducts(prodData);
    };
    fetchData();
  }, [storeId]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAddItem = (prod) => {
    const exists = orderItems.find(item => item.productId === prod.id);
    if (exists) {
      setOrderItems(orderItems.map(item => item.productId === prod.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setOrderItems([...orderItems, { productId: prod.id, name: prod.name, priceUz: prod.costUz, qty: 1 }]);
    }
  };

  const handleRemoveItem = (id) => {
    setOrderItems(orderItems.filter(item => item.productId !== id));
  };

  const totalSum = orderItems.reduce((acc, item) => acc + (item.priceUz * item.qty), 0);
  const totalQty = orderItems.reduce((acc, item) => acc + item.qty, 0);

  const handleSaveOrder = async () => {
    if (!selectedSupplier) return alert('Yetkazib beruvchini tanlang!');
    if (orderItems.length === 0) return alert('Buyurtmaga mahsulot qo\'shing!');
    
    setIsSubmitting(true);
    try {
      // 1. Create order
      const orderRef = await addDoc(collection(db, `users/${storeId}/orders`), {
        supplierId: selectedSupplier,
        items: orderItems,
        totalSum,
        totalQty,
        status: 'Qabul qilingan',
        createdAt: serverTimestamp()
      });

      // 2. Update product quantities in catalog
      for (const item of orderItems) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const prodRef = doc(db, `users/${storeId}/products`, prod.id);
          await updateDoc(prodRef, {
            quantity: Number(prod.quantity) + Number(item.qty)
          });
        }
      }

      alert('Buyurtma muvaffaqiyatli saqlandi va omborga qo\'shildi!');
      navigate('/products/orders');
    } catch (error) {
      console.error('Xatolik:', error);
      alert('Buyurtmani saqlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Yangi buyurtma (Kirim)</h1>
        </div>
        <button 
          onClick={handleSaveOrder}
          disabled={isSubmitting}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          {isSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Chap qism: Buyurtma qilingan tovarlar */}
        <div style={{ flex: 2, padding: '1.5rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Yetkazib beruvchini tanlang</label>
            <select 
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
            >
              <option value="">Tanlang...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Savat ({totalQty} ta)</h3>
          
          {orderItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
              O'ng tomondagi katalogdan mahsulot qo'shing
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {orderItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: '500' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>{formatMoney(item.priceUz)} x {item.qty}</div>
                    <div style={{ fontWeight: '600' }}>{formatMoney(item.priceUz * item.qty)}</div>
                    <button onClick={() => handleRemoveItem(item.productId)} style={{ color: 'var(--danger)' }}><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Jami summa:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatMoney(totalSum)}</span>
          </div>
        </div>

        {/* O'ng qism: Katalog */}
        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidiruv..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto' }}>
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => handleAddItem(p)}
                style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontWeight: '500' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Omborda: {p.quantity} {p.unit}</div>
                </div>
                <div style={{ color: 'var(--primary)', fontWeight: '600' }}>{formatMoney(p.costUz)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrder;
