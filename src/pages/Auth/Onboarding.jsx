import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Store, MapPin, Tag } from 'lucide-react';

const Onboarding = () => {
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const { hasOnboarded } = useRoles();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // If they already onboarded, redirect to home
  useEffect(() => {
    if (hasOnboarded) {
      navigate('/');
    }
  }, [hasOnboarded, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeName.trim() || !category || !address.trim()) {
      addToast("Iltimos, barcha maydonlarni to'ldiring", "warning");
      return;
    }

    if (!currentUser) return;

    setIsLoading(true);
    try {
      const storeInfoRef = doc(db, `users/${currentUser.uid}/settings/storeInfo`);
      await setDoc(storeInfoRef, {
        storeName,
        category,
        address,
        createdAt: new Date().toISOString()
      });

      // Shuningdek profile info ga ham qo'shib qo'yamiz
      const profileRef = doc(db, `users/${currentUser.uid}/profile/info`);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        await setDoc(profileRef, { ...profileSnap.data(), storeName }, { merge: true });
      }

      addToast("Muvaffaqiyatli saqlandi! Dasturga xush kelibsiz", "success");
      // Force reload to update roles context or just navigate
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      addToast("Saqlashda xatolik yuz berdi: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '480px', padding: '2.5rem 2rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '1rem' }}>
            <Store size={32} />
          </div>
          <h1 className="h1" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Do'koningizni sozlash</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Iltimos, ishlashni boshlashdan oldin do'kon haqida qisqacha ma'lumot bering</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <Store size={16} /> Do'kon nomi <span style={{color: 'var(--danger)'}}>*</span>
            </label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', outline: 'none' }}
              placeholder="Masalan: Asosiy Filial"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <Tag size={16} /> Kategoriya <span style={{color: 'var(--danger)'}}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', outline: 'none' }}
            >
              <option value="">Tanlang...</option>
              <option value="Oziq-ovqat">Oziq-ovqat</option>
              <option value="Kiyim-kechak">Kiyim-kechak</option>
              <option value="Maishiy texnika">Maishiy texnika</option>
              <option value="Qurilish mollari">Qurilish mollari</option>
              <option value="Boshqa">Boshqa</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <MapPin size={16} /> Manzil <span style={{color: 'var(--danger)'}}>*</span>
            </label>
            <textarea 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', outline: 'none', minHeight: '80px', resize: 'vertical' }}
              placeholder="Shahar, ko'cha, uy..."
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '1rem', fontSize: '1rem' }} disabled={isLoading}>
            {isLoading ? 'Saqlanmoqda...' : 'Boshlash'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
