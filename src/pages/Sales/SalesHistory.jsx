import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const SalesHistory = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchSales = async () => {
      try {
        const q = query(collection(db, `users/${storeId}/sales`), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setSales(data);
      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Sotuvlar tarixi</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-lg)', fontWeight: '600' }}>
          <Calendar size={18} />
          <span>{new Date().toLocaleDateString('uz-UZ')}</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Chek raqami bo'yicha qidirish..." 
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
        <button style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px solid var(--border-color)' }}>
          Filtr
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Sana</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Kvitansiya ID</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Mahsulotlar</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>To'lov usuli</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Hozircha sotuvlar yo'q.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      {s.date ? new Date(s.date.toDate()).toLocaleString('uz-UZ') : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>#{s.id.slice(0, 8).toUpperCase()}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      {s.items?.map(i => `${i.name} (${i.qty})`).join(', ')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        backgroundColor: s.paymentMethod === 'Naqd' ? 'var(--success-bg)' : (s.paymentMethod === 'Karta' ? 'var(--primary-light)' : 'var(--danger-bg)'), 
                        color: s.paymentMethod === 'Naqd' ? 'var(--success)' : (s.paymentMethod === 'Karta' ? 'var(--primary)' : 'var(--danger)'), 
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '500' 
                      }}>
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{formatMoney(s.totalSum)}</td>
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

export default SalesHistory;
