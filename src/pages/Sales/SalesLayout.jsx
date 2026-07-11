import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, History, Users } from 'lucide-react';

const SalesLayout = () => {
  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', paddingLeft: '1rem' }}>Sotuvlar</h2>
        
        <NavLink to="/sales/new" style={navStyle}>
          <ShoppingCart size={18} /> Yangi sotuv
        </NavLink>
        <NavLink to="/sales/history" style={navStyle}>
          <History size={18} /> Sotuvlar tarixi
        </NavLink>
        <NavLink to="/customers" style={navStyle}>
          <Users size={18} /> Mijozlar
        </NavLink>
      </div>
      
      <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
};

const navStyle = ({ isActive }) => ({
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
  color: isActive ? 'var(--primary)' : 'var(--text-main)',
  fontWeight: isActive ? '600' : '500',
  textDecoration: 'none'
});

export default SalesLayout;
