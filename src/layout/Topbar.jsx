import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import './layout.css';

const Topbar = () => {
  const { userProfile } = useRoles();
  const { logout } = useAuth();
  const [storeName, setStoreName] = useState(userProfile?.storeName || "Asosiy Filial");

  useEffect(() => {
    if (userProfile?.storeOwnerId) {
      const unsub = onSnapshot(doc(db, `users/${userProfile.storeOwnerId}/settings/storeInfo`), (docSnap) => {
        if (docSnap.exists() && docSnap.data().storeName) {
          setStoreName(docSnap.data().storeName);
        }
      });
      return () => unsub();
    }
  }, [userProfile?.storeOwnerId]);

  const displayName = userProfile?.name || 'Admin Foydalanuvchi';
  const displayRole = userProfile?.role || 'Admin';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          Do'kon: {storeName}
        </div>
      </div>
      <div className="topbar-right">
        <button style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {initials}
          </div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role" style={{ textTransform: 'capitalize' }}>{displayRole}</span>
          </div>
        </div>
        <button 
          onClick={logout}
          style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none' }}
          title="Tizimdan chiqish"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
