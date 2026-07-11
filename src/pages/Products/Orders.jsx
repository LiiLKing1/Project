import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const Orders = () => {
  const [activeTab, setActiveTab] = useState('Buyurtmalar ro\'yxati');
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const storeId = useStoreId();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const supSnapshot = await getDocs(collection(db, `users/${storeId}/suppliers`));
        const supMap = {};
        supSnapshot.forEach(doc => supMap[doc.id] = doc.data().name);
        setSuppliers(supMap);

        const ordSnapshot = await getDocs(collection(db, `users/${storeId}/orders`));
        const ordData = [];
        ordSnapshot.forEach(doc => {
          ordData.push({ id: doc.id, ...doc.data() });
        });
        // Sort by newest
        ordData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setOrders(ordData);
      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Buyurtmalar</h1>
      </div>
      
      <div style={{ padding: '0 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        {['Buyurtmalar ro\'yxati', 'Buyurtma qaytarishlari'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '1rem 0', 
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)', 
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', 
              fontWeight: activeTab === tab ? '600' : '500' 
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Buyurtma ID, yetkazib beruvchi bo'yicha qidiruv" 
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
        <button 
          onClick={() => navigate('/products/orders/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Plus size={18} />
          Yangi buyurtma
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>ID</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Sana</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Yetkazib beruvchi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Miqdori</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Summa</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Hozircha buyurtmalar yo'q.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      {o.createdAt ? new Date(o.createdAt.toDate()).toLocaleDateString('uz-UZ') : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{suppliers[o.supplierId] || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{o.totalQty} ta</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{formatMoney(o.totalSum)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Orders;
