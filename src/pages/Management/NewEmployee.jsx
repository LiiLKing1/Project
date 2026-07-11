import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { db } from '../../firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useRoles } from '../../context/RolesContext';
import { useStoreId } from '../../context/useStoreId';

// Firebase config - second app uchun (admin chiqib qolmasligi uchun)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDEqsJlagD68qJA0E8Ys2CiC8iTUpjNYlM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-500cb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-500cb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-500cb.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "90975235362",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:90975235362:web:8d566c3f82fe556ece897b"
};

const NewEmployee = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { roles } = useRoles();
  const storeId = useStoreId();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('kassir');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const roleKeys = Object.keys(roles).filter(r => r !== 'admin');

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(pass);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return setError('Iltimos, barcha majburiy maydonlarni to\'ldiring.');
    if (password.length < 6) return setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak.');
    
    setIsSubmitting(true);
    setError('');

    const adminUid = currentUser.uid; // Admin UID sini saqlab qolamiz

    try {
      // 1. Ikkilamchi Firebase App yaratamiz (bu admin auth ni buzmasligi uchun)
      let secondaryApp;
      try {
        secondaryApp = initializeApp(firebaseConfig, 'secondaryApp_' + Date.now());
      } catch (e) {
        // Agar allaqachon mavjud bo'lsa, yangi name bilan yaratamiz
        secondaryApp = initializeApp(firebaseConfig, 'employee_' + Date.now());
      }
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Yangi xodim akkauntini ikkilamchi auth orqali yaratamiz
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = cred.user.uid;
      
      // Ikkilamchi appni yopamiz
      await secondaryAuth.signOut();

      // 3. Xodimni ADMIN ning employees kolleksiyasiga saqlaymiz
      await addDoc(collection(db, `users/${adminUid}/employees`), {
        name,
        phone,
        email,
        role,
        uid: newUid,
        createdAt: serverTimestamp()
      });

      // 4. Xodimning o'z profilini uning bazasida saqlaymiz (storeOwnerId bilan)
      await setDoc(doc(db, `users/${newUid}/profile/info`), {
        name,
        phone,
        email,
        role,
        roleName: roles[role]?.name || role,
        storeOwnerId: adminUid,
        createdAt: serverTimestamp()
      });

      alert(`✅ Xodim muvaffaqiyatli yaratildi!\n\nXodim ma'lumotlari:\nIsm: ${name}\nEmail (Login): ${email}\nParol: ${password}\n\nBu ma'lumotlarni xodimga bering. Xodim shu email va parol bilan tizimga kirishi mumkin.`);
      navigate('/management/employees');
    } catch (err) {
      console.error("Xodim yaratishda xatolik:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu email manzil allaqachon ro\'yxatdan o\'tgan. Boshqa email kiriting.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email manzil noto\'g\'ri kiritilgan.');
      } else {
        setError(`Xatolik yuz berdi: ${err.message}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Yangi xodim qo'shish</h1>
        </div>
        <button 
          form="employee-form"
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          {isSubmitting ? 'Yaratilmoqda...' : 'Saqlash va Login yaratish'}
        </button>
      </div>

      <div style={{ padding: '2rem', overflow: 'auto', flex: 1 }}>
        <div style={{ maxWidth: '600px' }}>
          
          {error && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ backgroundColor: 'var(--primary-light)', color: '#1e40af', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
            <strong>ℹ️ Ma'lumot:</strong> Xodim qo'shilganda tizim unga avtomatik login yaratadi. 
            Xodim shu email va parol orqali tizimga kiradi va faqat unga berilgan rol doirasidagi bo'limlarni ko'radi. 
            <strong> Sizning akkauntingizga hech qanday ta'sir bo'lmaydi.</strong>
          </div>

          <form id="employee-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <section>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                👤 Shaxsiy ma'lumotlar
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>F.I.Sh. <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="To'liq ism familiya"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Telefon raqami</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998901234567"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rol <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                  >
                    {roleKeys.map(rk => (
                      <option key={rk} value={rk}>{roles[rk]?.name || rk}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                🔑 Login ma'lumotlari
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email (Login) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="xodim@email.com"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Xodim bu email orqali tizimga kiradi</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Parol <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Kamida 6 ta belgi"
                        style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                      >
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={generatePassword}
                      style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)', fontWeight: '500', whiteSpace: 'nowrap', border: '1px solid var(--primary)' }}
                    >
                      Avtomatik
                    </button>
                    {password && (
                      <button 
                        type="button"
                        onClick={copyPassword}
                        style={{ padding: '0.75rem', backgroundColor: copied ? 'var(--success-bg)' : 'var(--bg-hover)', color: copied ? 'var(--success)' : 'var(--text-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                        title="Parolni nusxalash"
                      >
                        {copied ? <Check size={18}/> : <Copy size={18}/>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </form>
        </div>
      </div>
    </div>
  );
};

export default NewEmployee;
