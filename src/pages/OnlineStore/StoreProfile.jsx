import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import TitleBar from '../../components/TitleBar';
import { Store, Save, MessageCircle, Phone, MapPin, Clock, Globe } from 'lucide-react';

const StoreProfile = () => {
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [formData, setFormData] = useState({
    logoUrl: '',
    displayName: '',
    bio: '',
    address: '',
    workingHours: '',
    phone: '',
    telegram: '',
    instagram: '',
    facebook: '',
    whatsapp: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!storeId) return;
      try {
        const docRef = doc(db, `users/${storeId}/sellerProfile/main`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(prev => ({ ...prev, ...docSnap.data() }));
        } else {
          // Initialize with some defaults from user profile
          setFormData(prev => ({
            ...prev,
            displayName: userProfile?.displayName || userProfile?.name || '',
            phone: userProfile?.phone || ''
          }));
        }
        
        // Fetch Store Slug from user document
        const uDocRef = doc(db, `users/${storeId}`);
        const uDocSnap = await getDoc(uDocRef);
        if (uDocSnap.exists()) {
          setStoreSlug(uDocSnap.data().storeSlug || '');
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [storeId]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, `users/${storeId}/sellerProfile/main`), formData, { merge: true });
      if (storeSlug.trim() !== '') {
        await setDoc(doc(db, `users/${storeId}`), { storeSlug: storeSlug.trim() }, { merge: true });
      }
      alert("Profil muvaffaqiyatli saqlandi!");
    } catch (err) {
      alert("Xato: " + err.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Yuklanmoqda...</div>;

  return (
    <>
      <TitleBar title="Do'kon Profili" />
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#EEF2FF', padding: '1rem', borderRadius: '12px', color: '#4F46E5' }}>
              <Store size={32} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Do'kon haqida ma'lumot</h2>
              <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Bu ma'lumotlar mijozlaringizga ochiq do'kon sahifasida ko'rinadi.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Do'kon havolasi (Slug)</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ padding: '0.75rem', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRight: 'none', borderRadius: '6px 0 0 6px', color: '#6B7280' }}>savdogar.com/store/</span>
                  <input type="text" value={storeSlug} onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mening-dokonim" style={{ flex: 1, padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0 6px 6px 0' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Ko'rsatiladigan nom</label>
                <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Logotip (URL manzili)</label>
                <input type="text" name="logoUrl" value={formData.logoUrl} onChange={handleChange} placeholder="https://..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Qisqa tavsif (Bio)</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} placeholder="Do'koningiz haqida qisqacha ma'lumot..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><MapPin size={16} /> Manzil</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><Clock size={16} /> Ish vaqti</label>
                <input type="text" name="workingHours" value={formData.workingHours} onChange={handleChange} placeholder="Dush-Shan: 09:00 - 18:00" style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
            </div>

            <hr style={{ borderTop: '1px solid #E5E7EB', margin: '0.5rem 0' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Aloqa va Ijtimoiy tarmoqlar</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><Phone size={16} /> Telefon</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><MessageCircle size={16} /> Telegram</label>
                <input type="text" name="telegram" value={formData.telegram} onChange={handleChange} placeholder="https://t.me/username" style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><Globe size={16} /> Instagram</label>
                <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="https://instagram.com/username" style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}><Globe size={16} /> Facebook</label>
                <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} placeholder="https://facebook.com/username" style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSave} 
                disabled={saving}
                style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                <Save size={18} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default StoreProfile;
