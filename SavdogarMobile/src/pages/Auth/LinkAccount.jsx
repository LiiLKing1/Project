import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Laptop } from 'lucide-react';
import TitleBar from '../../components/TitleBar';

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
      
      const response = await fetch(`http://127.0.0.1:${desktopPort}/auth-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => window.close(), 3000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <TitleBar transparent hideLogo />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Laptop className="text-primary w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Desktop ilovasi bilan bog'lash</h1>
        
        {status === 'waiting' && (
          <>
            <p className="text-gray-500 mb-8">
              Siz <b>{currentUser.email}</b> hisobi orqali tizimga kirgansiz. Desktop ilovaga ulanish uchun quyidagi tugmani bosing.
            </p>
            <button 
              onClick={handleLink}
              className="w-full bg-[#8052ff] hover:bg-[#6b46d9] text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Ilovaga ulanish
            </button>
          </>
        )}

        {status === 'linking' && (
          <div className="py-8">
            <div className="w-8 h-8 border-4 border-[#8052ff]/30 border-t-[#8052ff] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Ulanmoqda, iltimos kuting...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Muvaffaqiyatli ulandi!</h2>
            <p className="text-gray-500">
              Bu oynani yopib, kompyuteringizdagi Savdogar dasturiga qaytishingiz mumkin.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Xatolik yuz berdi</h2>
            <p className="text-gray-500 mb-6">
              Desktop ilovasiga ulanib bo'lmadi. Dastur ochiq ekanligiga ishonch hosil qiling.
            </p>
            <button 
              onClick={() => setStatus('waiting')}
              className="text-[#8052ff] font-medium hover:underline"
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
