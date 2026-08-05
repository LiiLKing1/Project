import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from './firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, UserX, LogOut, CheckCircle, Clock, XCircle, Search, ShoppingBag } from 'lucide-react';
import './index.css';

const auth = getAuth();

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedUserForSub, setSelectedUserForSub] = useState(null);
  const [subFormData, setSubFormData] = useState({
    subscriptionPlan: 'basic',
    subscriptionStart: '',
    subscriptionEnd: ''
  });
  
  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch Active/Blocked users from Firebase
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.role === 'owner'); // Show owners
      setUsersList(docs);
    });
    
    return () => { unsub(); };
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
    setIsLoading(false);
  };

  // Tizim tiklash uchun vaqtinchalik Admin yaratish funksiyasi
  const handleAdminSignup = async () => {
    if(!email || !password) return alert("Email va parolni kiriting");
    setIsLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: email,
        displayName: 'Asosiy Admin',
        role: 'owner',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString()
      });
      alert("Asosiy Admin hisobi muvaffaqiyatli tiklandi! Endi bemalol ishlatsangiz bo'ladi.");
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
    setIsLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Use secondary app to not log out the current admin
    const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: newEmail,
        displayName: newName,
        role: 'owner',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        subscriptionPlan: 'basic',
        subscriptionStart: new Date().toISOString(),
        // 7 kunlik bepul sinov muddati
        subscriptionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      await signOut(secondaryAuth);
      
      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      alert("Foydalanuvchi muvaffaqiyatli yaratildi!");
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
    setIsLoading(false);
  };

  const changeStatus = async (userObj, newStatus) => {
    try {
      if (newStatus === 'deleted') {
        if(window.confirm("Rostdan ham bu arizani o'chirib yubormoqchimisiz?")) {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'users', userObj.id));
          alert("Ariza o'chirildi!");
        }
        return;
      }
      
      await updateDoc(doc(db, 'users', userObj.id), { status: newStatus });
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const openSubModal = (u) => {
    setSelectedUserForSub(u);
    setSubFormData({
      subscriptionPlan: u.subscriptionPlan || 'basic',
      subscriptionStart: u.subscriptionStart ? u.subscriptionStart.substring(0, 10) : new Date().toISOString().substring(0, 10),
      subscriptionEnd: u.subscriptionEnd ? u.subscriptionEnd.substring(0, 10) : new Date().toISOString().substring(0, 10)
    });
    setShowSubModal(true);
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedUserForSub) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUserForSub.id), {
        subscriptionPlan: subFormData.subscriptionPlan,
        subscriptionStart: new Date(subFormData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(subFormData.subscriptionEnd).toISOString()
      });
      setShowSubModal(false);
      alert("Obuna muvaffaqiyatli yangilandi!");
    } catch(err) {
      alert("Xato: " + err.message);
    }
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-box">
          <div className="logo-text">Savdogar Admin</div>
          <form onSubmit={handleLogin} className="login-form">
            <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Parol" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={isLoading}>{isLoading ? 'Yuklanmoqda...' : 'Kirish'}</button>
          </form>
          
          <div style={{marginTop: '1rem', textAlign: 'center'}}>
            <p style={{fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem'}}>
              Barcha akkauntlar o'chib ketgan bo'lsa:
            </p>
            <button 
              type="button" 
              onClick={handleAdminSignup}
              style={{
                background: 'transparent', border: '1px dashed #8052ff', color: '#8052ff', 
                padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              Yangi Asosiy Admin Yaratish
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => 
    (u.displayName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      <header className="header">
        <div className="logo-text">Savdogar Admin Panel</div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <a href="https://savdogar.vercel.app" target="_blank" rel="noreferrer" style={{color: '#8052ff', textDecoration: 'none', fontWeight: 600}}>
            Platformaga o'tish ↗
          </a>
          <button className="btn-logout" onClick={() => auth.signOut()}>
            <LogOut size={18} /> Chiqish
          </button>
        </div>
      </header>
      
      <main className="main-content">
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
          <button 
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '2px solid #8052ff', color: '#8052ff', fontWeight: 600, cursor: 'pointer' }}>
            Mijozlar (Platforma)
          </button>
        </div>
            <div className="toolbar">
          <div className="search-box">
            <Search size={18} color="#6b7280" />
            <input 
              type="text" 
              placeholder="Foydalanuvchini qidirish..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> Yangi Mijoz Qo'shish
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Biznes / Mijoz Nomi</th>
                <th>Email</th>
                <th>Obuna Turi</th>
                <th>Tugash sanasi</th>
                <th>Status</th>
                <th style={{textAlign: 'right'}}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>Mijozlar topilmadi</td></tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.displayName || 'Noma\'lum'}</td>
                  <td className="text-gray">{u.email}</td>
                  <td className="text-gray" style={{ textTransform: 'capitalize' }}>
                    {u.subscriptionPlan === 'premium' ? <span style={{color: '#8052ff', fontWeight: 600}}>Premium</span> : 'Basic'}
                  </td>
                  <td className="text-gray">
                    {u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status || 'active'}`}>
                      {u.status === 'pending' && <Clock size={14} />}
                      {u.status === 'active' && <CheckCircle size={14} />}
                      {u.status === 'blocked' && <XCircle size={14} />}
                      {u.status === 'pending' ? 'Kutish zalida' : u.status === 'active' ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {u.status !== 'active' && (
                      <button className="btn-action approve" onClick={() => changeStatus(u, 'active')} title="Tasdiqlash/Faollashtirish">
                        <UserCheck size={16} /> Faol.
                      </button>
                    )}
                    <button className="btn-action" style={{backgroundColor: '#EEF2FF', color: '#4F46E5'}} onClick={() => openSubModal(u)} title="Obuna sozlamalari">
                      <Clock size={16} /> Obuna
                    </button>
                    {u.status !== 'blocked' && !u.fileId && (
                      <button className="btn-action block" onClick={() => changeStatus(u, 'blocked')} title="Bloklash (To'lov qilinmagan)">
                        <UserX size={16} /> Bloklash
                      </button>
                    )}
                    <button className="btn-action block" onClick={() => changeStatus(u, 'deleted')} title="Arizani o'chirish" style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>
                      O'chirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showAddModal && (
        <div className="modal-overlay">
          <motion.div 
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="modal-content"
          >
            <h2>Yangi Mijoz Yaratish</h2>
            <p>Yangi biznes egasi uchun hisob yaratish.</p>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="input-group">
                <label>Biznes/Mijoz nomi</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Parol</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Bekor qilish</button>
                <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Yaratilmoqda...' : 'Yaratish'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showSubModal && (
        <div className="modal-overlay">
          <motion.div 
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="modal-content"
          >
            <h2>Obuna Sozlamalari</h2>
            <p>{selectedUserForSub?.displayName} uchun tarif va muddatni tanlang.</p>
            <form onSubmit={handleUpdateSubscription} className="modal-form">
              <div className="input-group">
                <label>Tarif Rejasi</label>
                <select 
                  value={subFormData.subscriptionPlan} 
                  onChange={e => setSubFormData({...subFormData, subscriptionPlan: e.target.value})}
                  required
                >
                  <option value="basic">Basic (150,000 so'm) - Ochiq do'konsiz</option>
                  <option value="premium">Premium (250,000 so'm) - Onlayn Do'kon bilan</option>
                </select>
              </div>
              <div className="input-group">
                <label>Boshlanish sanasi</label>
                <input 
                  type="date" 
                  value={subFormData.subscriptionStart} 
                  onChange={e => setSubFormData({...subFormData, subscriptionStart: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Tugash sanasi</label>
                <input 
                  type="date" 
                  value={subFormData.subscriptionEnd} 
                  onChange={e => setSubFormData({...subFormData, subscriptionEnd: e.target.value})} 
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSubModal(false)}>Bekor qilish</button>
                <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Saqlanmoqda...' : 'Saqlash'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;
