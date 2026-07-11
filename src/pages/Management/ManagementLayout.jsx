import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';

const ManagementLayout = () => {
  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Boshqaruv</h2>
        <NavLink 
          to="/management/employees" 
          style={({ isActive }) => ({
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
            color: isActive ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: isActive ? '600' : '500'
          })}
        >
          <Users size={18} />
          Xodimlar
        </NavLink>
        <NavLink 
          to="/management/roles" 
          style={({ isActive }) => ({
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
            color: isActive ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: isActive ? '600' : '500'
          })}
        >
          <Shield size={18} />
          Rollar
        </NavLink>
      </div>
      <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default ManagementLayout;
