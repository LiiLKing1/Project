import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useWarehouse } from '../context/WarehouseContext';
import { formatCurrency } from '../utils/formatters';
import './layout.css';

const Topbar = ({ toggleSidebar }) => {
  const { userProfile } = useRoles();
  const [storeName, setStoreName] = useState(userProfile?.storeName || "Asosiy Filial");
  const [overdueDebts, setOverdueDebts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedNotifs')) || []; } catch { return []; }
  });
  
  const dropdownRef = useRef(null);

  const navigate = useNavigate();
  const { settings } = useSettings();
  const { warehouses, selectedWarehouseId, setSelectedWarehouseId } = useWarehouse();
  const curr = settings?.currency || 'UZS';

  // Handle click outside and Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (userProfile?.storeOwnerId) {
      const unsubStore = onSnapshot(doc(db, `users/${userProfile.storeOwnerId}/settings/storeInfo`), (docSnap) => {
        if (docSnap.exists() && docSnap.data().storeName) {
          setStoreName(docSnap.data().storeName);
        }
      });

      const unsubDebts = onSnapshot(query(collection(db, `users/${userProfile.storeOwnerId}/customerDebts`)), (snapshot) => {
        const now = new Date();
        const overdue = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter(d => 
          (d.status === 'active' || d.status === 'partial') && new Date(d.dueDate) <= now
        );
        setOverdueDebts(overdue);
      });

      const unsubCustomers = onSnapshot(collection(db, `users/${userProfile.storeOwnerId}/customers`), (snapshot) => {
        setCustomers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      });

      return () => {
        unsubStore();
        unsubDebts();
        unsubCustomers();
      };
    }
  }, [userProfile?.storeOwnerId]);

  const displayName = userProfile?.name || 'Admin Foydalanuvchi';
  const displayRole = userProfile?.role || 'Admin';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleDismiss = (id) => {
    const updated = [...dismissedNotifs, id];
    setDismissedNotifs(updated);
    localStorage.setItem('dismissedNotifs', JSON.stringify(updated));
  };
  
  const visibleDebts = overdueDebts.filter(d => !dismissedNotifs.includes(d.id));

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          onClick={toggleSidebar}
          className="mobile-menu-btn"
          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'none' }}
        >
          <Menu size={24} />
        </button>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }} className="store-name-display">
          Do'kon: {storeName}
        </div>
      </div>
      <div className="topbar-right">
        {warehouses.length > 0 && (
          <select 
            value={selectedWarehouseId || ''} 
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            disabled={userProfile?.role !== 'admin'}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', cursor: userProfile?.role === 'admin' ? 'pointer' : 'not-allowed' }}
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', cursor: 'pointer', border: 'none' }}
          >
            <Bell size={20} />
            {visibleDebts.length > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', backgroundColor: 'var(--danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {visibleDebts.length}
              </span>
            )}
          </button>
          
          {showDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '0.5rem', width: '300px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, color: 'var(--text-main)' }}>
                Xabarnomalar
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {visibleDebts.length > 0 ? (
                  visibleDebts.map(debt => {
                    const customer = customers.find(c => c.id === debt.customerId);
                    const customerName = customer ? customer.fullName : 'Noma\'lum mijoz';
                    return (
                      <div 
                        key={debt.id} 
                        onClick={() => { 
                          handleDismiss(debt.id);
                          setShowDropdown(false); 
                          navigate('/customers/debts'); 
                        }}
                        style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 500, color: 'var(--danger)', fontSize: '0.875rem' }}>Muddati o'tgan qarz</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDismiss(debt.id); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}
                            title="O'chirish"
                          >×</button>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                          Bugun <strong>{customerName}</strong> sizga <strong>{formatCurrency(debt.remainingAmount, curr)}</strong> qarzini berishi kerak.
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Yangi xabarnomalar yo'q
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="user-profile">
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {initials}
          </div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role" style={{ textTransform: 'capitalize' }}>{displayRole}</span>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Topbar;
