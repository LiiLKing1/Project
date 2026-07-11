import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRoles } from '../context/RolesContext';

const PermissionRoute = ({ permKey, children }) => {
  const { hasPermission, loadingRoles } = useRoles();

  if (loadingRoles) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Yuklanmoqda...
      </div>
    );
  }

  if (!hasPermission(permKey)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '4rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Kirish taqiqlangan</h2>
        <p>Bu bo'limga kirish uchun ruxsatingiz yo'q. Administrator bilan bog'laning.</p>
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
