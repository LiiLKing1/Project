import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmployeeLogin, setIsEmployeeLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { loginWithGoogle, login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      addToast("Tizimga muvaffaqiyatli kirdingiz", "success");
      navigate('/');
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast("Barcha maydonlarni to'ldiring", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      await login(`${email}@pos.com`, password);
      addToast("Tizimga muvaffaqiyatli kirdingiz", "success");
      navigate('/');
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', backgroundColor: 'var(--primary)', color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)' }}>
            POS
          </div>
          <h1 className="h1" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Xush kelibsiz</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tizimga kirish uchun usulni tanlang</p>
        </div>

        {isEmployeeLogin ? (
          <motion.form 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleEmailLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Login (Username)</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px 0 0 8px', border: '1px solid var(--border-color)', borderRight: 'none', backgroundColor: 'var(--bg-surface)', outline: 'none' }}
                  placeholder="masalan: said"
                />
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0 8px 8px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  @pos.com
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Parol</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', outline: 'none' }}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={isLoading}>
              {isLoading ? 'Kutilmoqda...' : 'Kirish'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: '0.5rem', color: 'var(--text-secondary)' }} onClick={() => setIsEmployeeLogin(false)}>
              Orqaga
            </button>
          </motion.form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <button 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #e5e7eb', color: '#374151', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google orqali kirish (Admin)
            </button>
            
            <div style={{ position: 'relative', margin: '1rem 0', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid var(--border-color)', zIndex: 1 }}></div>
              <span style={{ position: 'relative', zIndex: 2, backgroundColor: 'var(--bg-surface)', padding: '0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>YOKI</span>
            </div>

            <button 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '0.75rem' }} 
              onClick={() => setIsEmployeeLogin(true)}
            >
              Hodimlar uchun kirish (Email)
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
