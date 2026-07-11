import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useNavigate } from 'react-router-dom';
import './layout.css';

const Topbar = () => {
  const { currentUser, logout } = useAuth();
  const { userProfile } = useRoles();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef(null);

  // Tashqariga bosib dropdown ni yopish
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Foydalanuvchi';
  const displayRole = userProfile?.roleName || userProfile?.role || 'Admin';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="store-selector">
          PROJECT
        </div>
      </div>
      <div className="topbar-right">
        <button className="notification-btn" style={{ padding: '8px', borderRadius: '50%', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} color="var(--text-secondary)" />
        </button>
        <div style={{ position: 'relative' }} ref={dropRef}>
          <div 
            className="user-profile" 
            style={{ cursor: 'pointer' }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="avatar" style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
              {initials}
            </div>
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-role" style={{ textTransform: 'capitalize' }}>{displayRole}</span>
            </div>
            <ChevronDown size={16} color="var(--text-secondary)" style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {showDropdown && (
            <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', minWidth: '200px', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '600' }}>{displayName}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{currentUser?.email}</div>
              </div>
              <div style={{ padding: '0.5rem' }}>
                <button 
                  onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                  style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontWeight: '500' }}
                >
                  <Settings size={16} />
                  Sozlamalar
                </button>
                <button 
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: '500' }}
                >
                  <LogOut size={16} />
                  Chiqish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
