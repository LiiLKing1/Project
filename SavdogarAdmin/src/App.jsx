import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from './firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, UserX, LogOut, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
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
    
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.role === 'owner' && d.emailVerified === true); // Only show verified owners
      setUsersList(docs);
    });
    
    return () => unsub();
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
        status: 'active', // Admin created users are active immediately
        emailVerified: true, // Manually verified by Admin
        createdAt: new Date().toISOString()
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

  const changeStatus = async (uid, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
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
        <button className="btn-logout" onClick={() => auth.signOut()}>
          <LogOut size={18} /> Chiqish
        </button>
      </header>
      
      <main className="main-content">
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
                <th>Ro'yxatdan o'tgan sana</th>
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
                  <td className="text-gray">{new Date(u.createdAt).toLocaleDateString()}</td>
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
                      <button className="btn-action approve" onClick={() => changeStatus(u.id, 'active')} title="Tasdiqlash/Faollashtirish">
                        <UserCheck size={16} /> Faollashtirish
                      </button>
                    )}
                    {u.status !== 'blocked' && (
                      <button className="btn-action block" onClick={() => changeStatus(u.id, 'blocked')} title="Bloklash (To'lov qilinmagan)">
                        <UserX size={16} /> Bloklash
                      </button>
                    )}
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
    </div>
  );
}

export default App;
