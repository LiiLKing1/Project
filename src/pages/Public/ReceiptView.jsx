import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Receipt from '../../components/Receipt';
import { useAuth } from '../../context/AuthContext';

const ReceiptView = () => {
  const { storeId, saleId } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const saleRef = doc(db, `users/${storeId}/sales`, saleId);
        const saleSnap = await getDoc(saleRef);
        if (saleSnap.exists()) {
          setSale({ id: saleSnap.id, ...saleSnap.data() });
        } else {
          setError("Chek topilmadi");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [storeId, saleId]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      
      {loading && <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Yuklanmoqda...</div>}
      
      {error && <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>Xatolik: {error}</div>}

      {!loading && !error && sale && (
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Receipt sale={sale} storeId={storeId} />
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {currentUser ? (
          <button 
            onClick={() => navigate('/')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
          >
            Bosh sahifaga qaytish
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
          >
            Tizimga kirish
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptView;
