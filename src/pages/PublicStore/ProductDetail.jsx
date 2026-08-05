import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, addDoc, serverTimestamp } from '../../services/firebaseMock';
import { ArrowLeft, ShoppingBag, Star, Info, MessageSquare, Send, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const ProductDetail = () => {
  const { slug, productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preloadedState = location.state;
  
  const [storeId, setStoreId] = useState(preloadedState?.storeId || null);
  const [storeProfile, setStoreProfile] = useState(preloadedState?.storeProfile || null);
  const [product, setProduct] = useState(preloadedState?.product || null);
  const [loading, setLoading] = useState(!preloadedState?.product);
  const [error, setError] = useState('');
  
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(() => {
    if (preloadedState?.product?.variants?.length > 0) return preloadedState.product.variants[0];
    return null;
  });
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStoreAndProduct = async () => {
      try {
        // Agar state orqali kelmagan bo'lsa, foydalanuvchini izlaymiz
        let sId = storeId;
        if (!sId) {
          const usersQ = query(collection(db, 'users'), where('storeSlug', '==', slug), where('subscriptionPlan', '==', 'premium'));
          const usersSnap = await getDocs(usersQ);
          if (usersSnap.empty) {
            setError("Do'kon topilmadi.");
            setLoading(false); return;
          }
          sId = usersSnap.docs[0].id;
          setStoreId(sId);
          
          const profileQ = query(collection(db, `users/${sId}/sellerProfile`));
          const profileSnap = await getDocs(profileQ);
          if (!profileSnap.empty) setStoreProfile(profileSnap.docs[0].data());
          else setStoreProfile({ displayName: usersSnap.docs[0].data().displayName });
        }

        // Mahsulotni fonda yangilaymiz (yangi narx yoki qoldiq bo'lsa)
        const pDoc = await getDoc(doc(db, `users/${sId}/products`, productId));
        if (!pDoc.exists() || !pDoc.data().isOnlineVisible) {
          setError("Mahsulot topilmadi yoki sotuvdan olingan.");
          setLoading(false); return;
        }
        
        const pData = { id: pDoc.id, ...pDoc.data() };
        setProduct(pData);
        // Agar oldin variant tanlanmagan bo'lsa, birinchisini tanlaymiz
        if (!selectedVariant && pData.variants && pData.variants.length > 0) {
          setSelectedVariant(pData.variants[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Xatolik yuz berdi");
        setLoading(false);
      }
    };
    fetchStoreAndProduct();
  }, [slug, productId]);

  // Comments subscription
  useEffect(() => {
    if (!storeId || !productId) return;
    const q = query(collection(db, `users/${storeId}/productComments`), where('productId', '==', productId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      // Filter out hidden comments
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.isHidden);
      setComments(docs);
    });
    return () => unsub();
  }, [storeId, productId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !customerName.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `users/${storeId}/productComments`), {
        productId,
        productName: product.name,
        customerName: customerName.trim(),
        text: newComment.trim(),
        rating,
        isHidden: false,
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setRating(5);
    } catch (err) {
      alert("Fikr qoldirishda xatolik: " + err.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>Yuklanmoqda...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center' }}>{error}</div>;

  const currentPrice = product.sellPrice + (selectedVariant?.additionalPrice || 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: 'white', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(`/store/${slug}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4F46E5', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={20} /> Orqaga
          </button>
          <div style={{ fontWeight: 600, color: '#111827' }}>{storeProfile?.displayName || "Do'kon"}</div>
          <div style={{ width: '24px' }}></div> {/* Spacer */}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {/* PRODUCT SECTION */}
        <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', padding: '2rem', marginBottom: '2rem' }}>
          
          {/* Left: Images */}
          <div>
            <div style={{ width: '100%', aspectRatio: '1/1', background: '#F3F4F6', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>
              {product.onlineImages && product.onlineImages[activeImage] ? (
                <img src={product.onlineImages[activeImage]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Rasm yo'q</div>
              )}
            </div>
            
            {product.onlineImages && product.onlineImages.length > 1 && (
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
                {product.onlineImages.map((img, i) => (
                  <div key={i} onClick={() => setActiveImage(i)} style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: activeImage === i ? '2px solid #4F46E5' : '2px solid transparent', flexShrink: 0 }}>
                    <img src={img} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: '0 0 1rem', fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: '1.2' }}>{product.name}</h1>
            
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4F46E5', marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              {formatCurrency(currentPrice)}
            </div>

            {product.quantity <= 0 && (
              <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontWeight: 600, marginBottom: '1.5rem', width: 'fit-content' }}>
                Sotuvda qolmagan
              </div>
            )}

            {product.variants && product.variants.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem' }}>Variantni tanlang</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {product.variants.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{ padding: '0.75rem 1.25rem', background: selectedVariant?.id === v.id ? '#4F46E5' : 'white', color: selectedVariant?.id === v.id ? 'white' : '#374151', border: selectedVariant?.id === v.id ? '1px solid #4F46E5' : '1px solid #D1D5DB', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {v.name} {v.additionalPrice > 0 && `(+${formatCurrency(v.additionalPrice)})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#F9FAFB', padding: '1.5rem', borderRadius: '12px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#111827', fontWeight: 600, marginBottom: '0.75rem' }}>
                <Info size={20} color="#4F46E5" /> Mahsulot haqida
              </div>
              <p style={{ margin: 0, color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {product.onlineDescription || 'Tavsif kiritilmagan.'}
              </p>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
               <a 
                 href={storeProfile?.telegram ? storeProfile.telegram : '#'} 
                 target="_blank" rel="noreferrer"
                 style={{ flex: 1, padding: '1rem', background: '#0088cc', color: 'white', textAlign: 'center', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '1.125rem', opacity: product.quantity <= 0 ? 0.5 : 1, pointerEvents: product.quantity <= 0 ? 'none' : 'auto' }}
                 onClick={(e) => { if(!storeProfile?.telegram) { e.preventDefault(); alert("Do'kon egasi telegram manzilini kiritmagan."); } }}
               >
                 Telegram orqali buyurtma berish
               </a>
            </div>

          </div>
        </div>

        {/* REVIEWS SECTION */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageSquare size={24} color="#4F46E5" /> Mijozlar sharhlari ({comments.length})
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Post Review Form */}
            <div style={{ background: '#F9FAFB', padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600 }}>Fikr qoldirish</h3>
              <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Ismingiz</label>
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Baho (1-5)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', color: '#F59E0B' }}>
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={24} fill={star <= rating ? 'currentColor' : 'none'} onClick={() => setRating(star)} style={{ cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Fikringiz</label>
                  <textarea required rows={3} value={newComment} onChange={e => setNewComment(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', resize: 'vertical' }}></textarea>
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '0.75rem', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Yuborilmoqda...' : <><Send size={18} /> Yuborish</>}
                </button>
              </form>
            </div>

            {/* Reviews List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {comments.length === 0 ? (
                <div style={{ color: '#6B7280', fontStyle: 'italic', padding: '2rem 0' }}>Hali hech qanday sharh yozilmagan. Birinchi bo'lib fikr qoldiring!</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{c.customerName}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', color: '#F59E0B', marginBottom: '0.5rem' }}>
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={14} fill={star <= c.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    <p style={{ margin: 0, color: '#4B5563', fontSize: '0.875rem', lineHeight: '1.5' }}>{c.text}</p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
