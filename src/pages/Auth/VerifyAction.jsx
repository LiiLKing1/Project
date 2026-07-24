import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth, applyActionCode } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import TitleBar from '../../components/TitleBar';

const VerifyAction = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Emailingiz tasdiqlanmoqda...');

  useEffect(() => {
    const handleVerify = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (mode !== 'verifyEmail' || !oobCode) {
        setStatus('error');
        setMessage('Noto\'g\'ri yoki muddati o\'tgan havola.');
        return;
      }

      const auth = getAuth();
      try {
        await applyActionCode(auth, oobCode);
        
        // Try to update firestore if user is currently logged in locally
        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              emailVerified: true
            }).catch(console.error); // Silently fail if they don't have permission yet
          }
        }
        
        setStatus('success');
        setMessage('Tabriklaymiz! Emailingiz muvaffaqiyatli tasdiqlandi.');
      } catch (error) {
        setStatus('error');
        if (error.code === 'auth/invalid-action-code') {
          setMessage('Bu havola allaqachon ishlatilgan yoki muddati tugagan.');
        } else {
          setMessage('Xatolik yuz berdi: ' + error.message);
        }
      }
    };

    handleVerify();
  }, [searchParams]);

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif'
    }}>
      <TitleBar />
      <div style={{
        backgroundColor: '#fff', padding: '3.5rem 3rem', borderRadius: '1.5rem', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center', maxWidth: '450px', width: '90%'
      }}>
        {status === 'loading' && (
          <>
            <Loader2 size={64} style={{ color: '#8052ff', margin: '0 auto 1.5rem', animation: 'spin 1.5s linear infinite' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>{message}</h1>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ color: '#10B981', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle size={72} strokeWidth={1.5} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>Tasdiqlandi!</h1>
            <p style={{ color: '#4B5563', lineHeight: 1.6, marginBottom: '2rem' }}>
              {message} Endi platformadan to'liq foydalanishingiz mumkin.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', borderRadius: '0.75rem', background: '#8052ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Platformaga kirish
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ color: '#EF4444', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <XCircle size={72} strokeWidth={1.5} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>Xatolik</h1>
            <p style={{ color: '#4B5563', lineHeight: 1.6, marginBottom: '2rem' }}>{message}</p>
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', borderRadius: '0.75rem', background: '#8052ff', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Kirish sahifasiga qaytish
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyAction;
