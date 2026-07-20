import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Laptop } from 'lucide-react';
import TitleBar from '../../components/TitleBar';
import { APP_NAME } from '../../config/appConfig';
import './Login.css';

const LinkAccount = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const desktopPort = queryParams.get('desktopPort');
  const [status, setStatus] = useState('waiting'); // waiting, linking, success, error

  useEffect(() => {
    if (!currentUser) {
      navigate(`/login?redirect=/link-account?desktopPort=${desktopPort}`);
    }
  }, [currentUser, navigate, desktopPort]);

  const handleLink = async () => {
    if (!desktopPort || !currentUser) return;
    
    setStatus('linking');
    try {
      const { getAuth } = await import('firebase/auth');
      const token = await getAuth().currentUser.getIdToken(true);
      
      // Navigate browser back to the local Electron app server. 
      // This completely bypasses CORS since it's a top level navigation, not an XHR fetch.
      window.location.href = `http://127.0.0.1:${desktopPort}/auth-success?token=${encodeURIComponent(token)}`;
      
      // Optimistically show success as navigation happens
      setTimeout(() => setStatus('success'), 1000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="login-container">
      <TitleBar transparent hideLogo />
      
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="login-video-bg"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-white-clouds-in-a-blue-sky-time-lapse-954-large.mp4" type="video/mp4" />
      </video>
      <div className="login-overlay"></div>

      {/* Top Left Logo */}
      <div className="login-logo">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22H22L12 2Z" stroke="#111" strokeWidth="2.5" strokeLinejoin="round"/>
         </svg>
         <span className="login-logo-text">{APP_NAME}</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="login-card"
      >
        <div className="login-header">
          <div className="login-icon-box">
            <Laptop size={22} strokeWidth={2.5} />
          </div>
          <h1 className="login-title">Desktop ilovasiga bog'lash</h1>
          <p className="login-subtitle">
            Dasturga xavfsiz kirish uchun hisobingizni ulang.
          </p>
        </div>
        
        {status === 'waiting' && (
          <>
            <p style={{marginBottom: '2rem', color: '#6b7280', fontSize: '0.95rem'}}>
              Siz <b>{currentUser.email}</b> hisobi orqali tizimga kirgansiz. Davom etish uchun quyidagi tugmani bosing.
            </p>
            <button 
              onClick={handleLink}
              className="login-submit-btn"
            >
              Ilovaga ulanish
            </button>
          </>
        )}

        {status === 'linking' && (
          <div style={{padding: '2rem 0'}}>
            <div className="login-spinner"></div>
            <p style={{color: '#6b7280'}}>Ulanmoqda, iltimos kuting...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{padding: '1.5rem 0'}}>
            <CheckCircle2 size={48} color="#10b981" style={{margin: '0 auto 1rem'}} />
            <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827'}}>Muvaffaqiyatli ulandi!</h2>
            <p style={{color: '#6b7280', fontSize: '0.9rem'}}>
              Bu oynani yopib, kompyuteringizdagi dasturga qaytishingiz mumkin.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{padding: '1.5rem 0'}}>
            <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ef4444'}}>Xatolik yuz berdi</h2>
            <p style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
              Desktop ilovasiga ulanib bo'lmadi. Dastur ochiq ekanligiga ishonch hosil qiling.
            </p>
            <button 
              onClick={() => setStatus('waiting')}
              className="login-submit-btn" style={{background: 'transparent', color: '#8052ff', border: '1px solid #8052ff'}}
            >
              Qaytadan urinish
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LinkAccount;
