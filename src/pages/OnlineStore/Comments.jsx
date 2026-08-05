import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useConfirm } from '../../context/ConfirmContext';
import TitleBar from '../../components/TitleBar';
import { MessageSquare, Star, Eye, EyeOff, Trash2 } from 'lucide-react';

const Comments = () => {
  const { userProfile } = useRoles();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, `users/${storeId}/productComments`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const toggleVisibility = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, `users/${storeId}/productComments`, id), {
        isHidden: !currentStatus
      });
    } catch (err) {
      alert("Xato: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Bu sharhni butunlay o'chirib yubormoqchimisiz?", confirmStyle: 'danger' })) {
      try {
        await deleteDoc(doc(db, `users/${storeId}/productComments`, id));
      } catch (err) {
        alert("Xato: " + err.message);
      }
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Yuklanmoqda...</div>;

  return (
    <>
      <TitleBar title="Mijozlar Sharhlari" />
      <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#F3E8FF', padding: '0.75rem', borderRadius: '12px', color: '#9333EA' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Fikr-mulohazalar moderatsiyasi</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Mijozlarning mahsulotlarga qoldirgan sharhlarini boshqarish</p>
          </div>
        </div>

        {comments.length === 0 ? (
          <div style={{ background: 'white', padding: '3rem', textAlign: 'center', borderRadius: '12px', border: '1px dashed #D1D5DB', color: '#6B7280' }}>
            Hozircha sharhlar yo'q
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', gap: '1.5rem', opacity: c.isHidden ? 0.6 : 1 }}>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{c.customerName || 'Noma\'lum mijoz'}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
                        <span>Mahsulot: <strong style={{ color: '#4F46E5' }}>{c.productName}</strong></span>
                        <span>•</span>
                        <span>{c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleString('uz-UZ') : ''}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', color: '#F59E0B' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={16} fill={star <= (c.rating || 5) ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: 0, color: '#374151', lineHeight: '1.5' }}>{c.text}</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                  <button 
                    onClick={() => toggleVisibility(c.id, c.isHidden)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', background: c.isHidden ? '#ECFDF5' : '#FEF2F2', color: c.isHidden ? '#059669' : '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {c.isHidden ? <><Eye size={16} /> Ko'rsatish</> : <><EyeOff size={16} /> Yashirish</>}
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', background: 'white', border: '1px solid #D1D5DB', color: '#374151', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    <Trash2 size={16} /> O'chirish
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Comments;
