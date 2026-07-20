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

  const handleLink = async () => {
    if (!desktopPort) return;
    
    setStatus('linking');
    try {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential || !credential.idToken) {
        throw new Error("No Google ID Token found");
      }
      
      const token = credential.idToken;
      
      // Navigate browser back to the local Electron app server
      window.location.href = `http://127.0.0.1:${desktopPort}/auth-success?token=${encodeURIComponent(token)}`;
      
      setTimeout(() => setStatus('success'), 1000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

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
              Ish stoli (Desktop) dasturiga ulanish uchun quyidagi tugmani bosib Google orqali kiring.
            </p>
            <button 
              onClick={handleLink}
              className="login-google-btn"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Google orqali ulanish</span>
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
