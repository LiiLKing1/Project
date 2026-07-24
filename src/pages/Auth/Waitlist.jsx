import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import TitleBar from '../../components/TitleBar';
import { useNavigate } from 'react-router-dom';
import { getAuth, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Waitlist = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteApp = async () => {
    setIsDeleting(true);
    try {
      const auth = getAuth();
      if (auth.currentUser && currentUser?.uid) {
        // Delete document first
        await deleteDoc(doc(db, 'users', currentUser.uid));
        // Delete auth user
        await deleteUser(auth.currentUser);
        addToast("Ariza muvaffaqiyatli o'chirildi", "success");
        navigate('/login');
      }
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        addToast("Xavfsizlik sababli tizimga qayta kirib, so'ng o'chirishingiz kerak.", "error");
        await logout();
        navigate('/login');
      } else {
        addToast("Xatolik: " + error.message, "error");
      }
    }
    setIsDeleting(false);
  };

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif'
    }}>
      <TitleBar />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          backgroundColor: '#fff', padding: '3rem', borderRadius: '1.5rem', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          textAlign: 'center', maxWidth: '500px', width: '90%'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706'
          }}>
            <Clock size={40} strokeWidth={2} />
          </div>
        </div>
        
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
          Hisobingiz ko'rib chiqilmoqda
        </h1>
        
        <p style={{ color: '#4B5563', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Hurmatli mijoz, sizning arizangiz muvaffaqiyatli qabul qilindi. 
          Hozirda adminlarimiz tomonidan hisobingiz tasdiqlanishini kutmoqdasiz. 
          Tasdiqlangandan so'ng platformadan to'liq foydalanishingiz mumkin bo'ladi.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => navigate('/landing')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', backgroundColor: '#8052ff', color: '#fff',
              border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Saytga qaytish
          </button>
          
          <button 
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', backgroundColor: '#F3F4F6', color: '#EF4444',
              border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600,
              cursor: 'pointer', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
          >
            <LogOut size={18} />
            Hisobdan chiqish
          </button>
        </div>
      </motion.div>

      {/* Options Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }} onClick={() => setShowModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff', padding: '2rem', borderRadius: '1rem', 
                maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
                Chiqish parametrlarini tanlang
              </h2>
              <p style={{ color: '#4B5563', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Agar arizangizni butunlay o'chirib yuborsangiz, qaytadan ro'yxatdan o'tishingizga to'g'ri keladi.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '0.75rem', backgroundColor: '#F3F4F6', color: '#374151',
                    border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  Shunchaki chiqib ketish
                </button>
                
                <button 
                  onClick={handleDeleteApp}
                  disabled={isDeleting}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626',
                    border: '1px solid #FECACA', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                  {isDeleting ? "O'chirilmoqda..." : "Arizani butunlay o'chirish"}
                </button>
                
                <button 
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.75rem', backgroundColor: 'transparent', color: '#6B7280',
                    border: 'none', fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem'
                  }}
                >
                  Bekor qilish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Waitlist;
