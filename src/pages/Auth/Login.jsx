import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, KeyRound, Laptop, User, UserPlus } from 'lucide-react';
import TitleBar from '../../components/TitleBar';
import { APP_NAME } from '../../config/appConfig';
import { db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import './Login.css';

const Login = () => {
  const [activeTab, setActiveTab] = useState('owner'); // 'owner' or 'employee'
  const [isSignup, setIsSignup] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { loginWithGoogle, login, signup, currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || '/';
  
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  React.useEffect(() => {
    const checkVerification = async () => {
      if (currentUser) {
        // If it's an owner and email is not verified, check Firestore as Admin might have verified them
        if (!currentUser.emailVerified && !currentUser.email.endsWith('@pos.com')) {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists() && userDoc.data().emailVerified === true) {
              navigate(redirectPath);
            } else {
              navigate('/verify-email');
            }
          } catch (error) {
            navigate('/verify-email');
          }
        } else {
          navigate(redirectPath);
        }
      }
    };
    checkVerification();
  }, [currentUser, navigate, redirectPath]);

  const handleGoogleLogin = async () => {
    if (isElectron) {
      loginWithGoogle();
      return;
    }
    
    setIsLoading(true);
    try {
      await loginWithGoogle();
      addToast("Tizimga muvaffaqiyatli kirdingiz", "success");
      navigate(redirectPath);
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignup && !name)) {
      addToast("Barcha maydonlarni to'ldiring", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      if (activeTab === 'employee') {
        // Employee logic (always login)
        await login(`${email}@pos.com`, password);
        addToast("Hodim sifatida tizimga kirdingiz", "success");
      } else {
        // Owner logic
        if (isSignup) {
          const userCredential = await signup(email, password);
          const pendingData = {
            uid: userCredential.user.uid,
            email: email,
            displayName: name,
            role: 'owner',
            status: 'pending',
            emailVerified: false,
            createdAt: new Date().toISOString()
          };
          
          // Firebase'ga yozilmaydi, faqat Drive'dagi pending_users ga yoziladi
          if (window.electronAPI && window.electronAPI.syncToDrive) {
            window.electronAPI.syncToDrive({
              storeId: 'admin',
              collectionName: 'pending_users',
              docId: userCredential.user.uid,
              action: 'CREATE',
              data: pendingData
            });
          } else {
            // Vercel orqali brauzerdan Drive'ga yozish
            try {
              await fetch('/api/register-pending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userData: pendingData })
              });
            } catch (err) {
              console.error("Vercel API xatosi:", err);
            }
          }
          
          await sendEmailVerification(userCredential.user);
          addToast("Muvaffaqiyatli ro'yxatdan o'tdingiz. Emailingizga tasdiqlash xati yuborildi. Iltimos pochtangizni tekshiring", "success");
          navigate('/verify-email');
          return; // Stop execution to prevent navigating to redirectPath
        } else {
          await login(email, password);
          addToast("Tizimga muvaffaqiyatli kirdingiz", "success");
        }
      }
      navigate(redirectPath);
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSignup(false);
    setEmail('');
    setPassword('');
    setName('');
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

      {/* Glassmorphic Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="login-card"
      >
        <div className="login-tabs">
          <button 
            type="button"
            className={`login-tab ${activeTab === 'owner' ? 'active' : ''}`}
            onClick={() => handleTabChange('owner')}
          >
            Biznes Egasi
          </button>
          <button 
            type="button"
            className={`login-tab ${activeTab === 'employee' ? 'active' : ''}`}
            onClick={() => handleTabChange('employee')}
          >
            Hodimlar
          </button>
        </div>

        <div className="login-header" style={{marginTop: '1.5rem'}}>
          <div className="login-icon-box">
            {activeTab === 'owner' && isSignup ? <UserPlus size={22} strokeWidth={2.5} /> : <KeyRound size={22} strokeWidth={2.5} />}
          </div>
          <h1 className="login-title">
            {activeTab === 'owner' 
              ? (isSignup ? "Ro'yxatdan o'tish" : "Tizimga kirish")
              : "Hodim sifatida kirish"}
          </h1>
          <p className="login-subtitle">
            {activeTab === 'owner'
              ? (isSignup ? "Yangi biznes hisob yarating" : "Do'koningizni boshqarish uchun kiring")
              : "Ishni boshlash uchun o'z hisobingizga kiring"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <AnimatePresence mode="popLayout">
            {activeTab === 'owner' && isSignup && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="login-input-group"
              >
                <div className="login-input-icon">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="login-input"
                  placeholder="Ismingiz (yoki Biznes nomi)"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Input */}
          <div className="login-input-group">
            <div className="login-input-icon">
              <Mail size={18} />
            </div>
            <input 
              type={activeTab === 'employee' ? "text" : "email"} 
              value={email}
              onChange={(e) => setEmail(activeTab === 'employee' ? e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') : e.target.value)}
              className="login-input"
              placeholder={activeTab === 'employee' ? "Username" : "Email manzilingiz"}
            />
          </div>

          {/* Password Input */}
          <div className="login-input-group">
            <div className="login-input-icon">
              <Lock size={18} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="Parol"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="login-password-toggle"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="login-forgot-link">
            {activeTab === 'owner' && (
              <span onClick={() => setIsSignup(!isSignup)} style={{cursor: 'pointer', color: '#2563eb'}}>
                {isSignup ? "Hisobingiz bormi? Kirish" : "Hisobingiz yo'qmi? Ro'yxatdan o'tish"}
              </span>
            )}
            {activeTab === 'employee' && (
              <a href="#">Parolni unutdingizmi?</a>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="login-submit-btn"
          >
            {isLoading ? (
              <div className="login-spinner"></div>
            ) : (isSignup ? "Ro'yxatdan o'tish" : "Kirish")}
          </button>
        </form>

        {activeTab === 'owner' && (
          <>
            <div className="login-divider">
              <span>Yoki</span>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              type="button"
              className={isElectron ? "login-submit-btn" : "login-google-btn"}
              style={isElectron ? {background: '#f3f4f6', color: '#111', border: '1px solid #e5e7eb'} : undefined}
            >
              {isElectron ? (
                <Laptop size={20} strokeWidth={2} style={{marginRight: '8px'}} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{isElectron ? "Veb-sayt orqali ulanish" : "Google orqali kiring"}</span>
            </button>
          </>
        )}

      </motion.div>
    </div>
  );
};

export default Login;
