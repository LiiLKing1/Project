import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { getAuth, sendEmailVerification } from 'firebase/auth';

const VerifyEmail = () => {
  const { currentUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);

  // If there's no user or the user is already verified, just redirect to home
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (currentUser.emailVerified) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        addToast("Tasdiqlash xati qayta yuborildi. Iltimos pochtangizni tekshiring", "success");
      }
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckAgain = () => {
    // Reload the user profile to fetch the latest emailVerified status
    const auth = getAuth();
    if (auth.currentUser) {
      auth.currentUser.reload().then(async () => {
        if (auth.currentUser.emailVerified) {
          // Update firestore document to indicate they are verified
          const { db } = await import('../../firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              emailVerified: true
            });
          } catch(e) { console.error(e); }
          
          addToast("Muvaffaqiyatli tasdiqlandi!", "success");
          window.location.href = "/";
        } else {
          addToast("Hali tasdiqlanmagan. Iltimos pochta qutingizga kirib linkni bosing.", "error");
        }
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        <div style={{ background: '#EEF2FF', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
          <Mail size={40} />
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-main)' }}>
          Pochtangizni tasdiqlang
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Biz <strong>{currentUser?.email}</strong> manziliga tasdiqlash xatini yubordik. Tizimdan foydalanishni boshlash uchun pochta qutingizga kiring va xatdagi havolani bosing.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <button 
            onClick={handleCheckAgain} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }}
          >
            <RefreshCw size={18} /> Men tasdiqladim, tizimga kirish
          </button>
          
          <button 
            onClick={handleResend} 
            disabled={isResending}
            className="btn btn-outline" 
            style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }}
          >
            {isResending ? 'Yuborilmoqda...' : 'Xat kelmadimi? Qayta yuborish'}
          </button>
        </div>

        <button 
          onClick={handleLogout}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '2rem', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          <LogOut size={16} /> Boshqa hisobga kirish
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
