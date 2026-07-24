import React from 'react';
import { motion } from 'framer-motion';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TitleBar from '../../components/TitleBar';

const Waitlist = () => {
  const { logout } = useAuth();

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

        <button 
          onClick={logout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.5rem', backgroundColor: '#F3F4F6', color: '#374151',
            border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600,
            cursor: 'pointer', transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
        >
          <LogOut size={18} />
          Chiqish
        </button>
      </motion.div>
    </div>
  );
};

export default Waitlist;
