import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from '../../services/firebaseMock';
import { ShoppingBag, MapPin, Phone, Globe, MessageCircle, Clock, Search } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PublicStore = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [storeId, setStoreId] = useState(null);
  const [storeProfile, setStoreProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const usersQ = query(collection(db, 'users'), where('storeSlug', '==', slug), where('subscriptionPlan', '==', 'premium'));
        const usersSnap = await getDocs(usersQ);
        
        if (usersSnap.empty) {
          setError("Do'kon topilmadi yoki onlayn savdo vaqtincha to'xtatilgan.");
          setLoading(false);
          return;
        }
        
        const sId = usersSnap.docs[0].id;
        setStoreId(sId);
        
        // Fetch Profile
        const profileQ = query(collection(db, `users/${sId}/sellerProfile`));
        const profileSnap = await getDocs(profileQ);
        if (!profileSnap.empty) {
          setStoreProfile(profileSnap.docs[0].data());
        } else {
          setStoreProfile({ displayName: usersSnap.docs[0].data().displayName });
        }
        
      } catch (err) {
        console.error(err);
        setError("Xatolik yuz berdi");
        setLoading(false);
      }
    };
    fetchStore();
  }, [slug]);

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, `users/${storeId}/products`), where('isOnlineVisible', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
      <ShoppingBag size={64} color="#9CA3AF" style={{ marginBottom: '1rem' }} />
      <h2 style={{ color: '#374151', fontSize: '1.5rem', margin: '0 0 1rem' }}>{error}</h2>
      <Link to="/" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}>Savdogar platformasiga qaytish</Link>
    </div>
  );

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: 'white', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {storeProfile?.logoUrl ? (
              <img src={storeProfile.logoUrl} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <ShoppingBag size={24} />
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{storeProfile?.displayName || 'Do\'kon'}</h1>
              {storeProfile?.bio && <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeProfile.bio}</p>}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {storeProfile?.telegram && <a href={storeProfile.telegram} target="_blank" rel="noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0088cc', textDecoration: 'none' }}><MessageCircle size={18} /></a>}
            {storeProfile?.instagram && <a href={storeProfile.instagram} target="_blank" rel="noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E1306C', textDecoration: 'none' }}><Globe size={18} /></a>}
            {storeProfile?.phone && <a href={`tel:${storeProfile.phone}`} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5', textDecoration: 'none' }}><Phone size={18} /></a>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* INFO BANNERS */}
        {(storeProfile?.address || storeProfile?.workingHours) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {storeProfile.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '99px', fontSize: '0.875rem', color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <MapPin size={16} color="#6B7280" /> {storeProfile.address}
              </div>
            )}
            {storeProfile.workingHours && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '99px', fontSize: '0.875rem', color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <Clock size={16} color="#6B7280" /> {storeProfile.workingHours}
              </div>
            )}
          </div>
        )}

        {/* SEARCH */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '0.75rem 1.5rem', borderRadius: '99px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <Search size={20} color="#9CA3AF" />
          <input 
            type="text" 
            placeholder="Mahsulotlarni qidirish..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', marginLeft: '1rem', width: '100%', fontSize: '1rem', background: 'transparent' }} 
          />
        </div>

        {/* PRODUCTS GRID */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6B7280' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>Mahsulotlar topilmadi</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => navigate(`/store/${slug}/p/${p.id}`)} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } }}>
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#F3F4F6', position: 'relative' }}>
                  {p.onlineImages && p.onlineImages[0] ? (
                    <img src={p.onlineImages[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                      Rasm yo'q
                    </div>
                  )}
                  {p.quantity <= 0 && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239,68,68,0.9)', color: 'white', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                      Sotuvda yo'q
                    </div>
                  )}
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4F46E5' }}>{formatCurrency(p.sellPrice)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* FOOTER */}
      <footer style={{ background: 'white', padding: '2rem 1.5rem', textAlign: 'center', marginTop: '4rem', borderTop: '1px solid #E5E7EB' }}>
        <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
          <a href="/" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>Savdogar</a> platformasida yaratilgan onlayn do'kon
        </p>
      </footer>
    </div>
  );
};

export default PublicStore;
