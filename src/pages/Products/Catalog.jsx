import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const Catalog = () => {
  const [activeTab, setActiveTab] = useState('Barchasi');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const storeId = useStoreId();

  useEffect(() => {
    const fetchData = async () => {
      if (!storeId) return;
      try {
        // Avval supplierlarni olamiz (ID bo'yicha nomini ko'rsatish uchun)
        const supSnapshot = await getDocs(collection(db, `users/${storeId}/suppliers`));
        const supMap = {};
        supSnapshot.forEach(doc => {
          supMap[doc.id] = doc.data().name;
        });
        setSuppliers(supMap);

        // Endi mahsulotlarni olamiz
        const prodQuery = query(collection(db, `users/${storeId}/products`), limit(150));
        const prodSnapshot = await getDocs(prodQuery);
        const prodData = [];
        prodSnapshot.forEach(doc => {
          prodData.push({ id: doc.id, ...doc.data() });
        });
        setProducts(prodData);
      } catch (error) {
        console.error("Xatolik:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [storeId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Katalog</h1>
      </div>
      
      <div style={{ padding: '0 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        {[`Barchasi (${products.length})`, 'Faollar (0)', 'Nol qoldiq (0)', 'Arxiv (0)'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab.split(' ')[0])}
            style={{ 
              padding: '1rem 0', 
              color: activeTab === tab.split(' ')[0] ? 'var(--primary)' : 'var(--text-secondary)', 
              borderBottom: activeTab === tab.split(' ')[0] ? '2px solid var(--primary)' : '2px solid transparent', 
              fontWeight: activeTab === tab.split(' ')[0] ? '600' : '500' 
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
            placeholder="Katalog bo'ylab qidirish..." 
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
        <button 
          onClick={() => navigate('/products/import')}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px solid var(--border-color)' }}
        >
          Import qilish
        </button>
        <button 
          onClick={() => navigate('/products/catalog/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Plus size={18} />
          Yangi mahsulot
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Nomi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Yetkazib beruvchi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Miqdori</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Kelish narxi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Sotish narxi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Hozircha mahsulotlar yo'q. Yangi mahsulot qo'shing yoki import qiling.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--primary)' }}>
                      <div>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{p.barcode || p.id.slice(0, 8)}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{suppliers[p.supplierId] || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{p.quantity} {p.unit.toLowerCase()}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {p.currencySettings === 'USD' ? `$${p.costUsd}` : formatMoney(p.costUz)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>
                      {p.currencySettings === 'USD' ? `$${p.priceUsd}` : formatMoney(p.priceUz)}
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

export default Catalog;
