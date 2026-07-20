import React from 'react';
import { useRoles } from '../context/RolesContext';

const PermissionRoute = ({ permKey, children }) => {
  const { hasPermission, loadingRoles } = useRoles();

  if (loadingRoles) return null; // handled by ProtectedRoute

  if (!hasPermission(permKey)) {
    return (
      <div className="flex-center flex-col" style={{ height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '4rem' }}>🔒</div>
        <h2 className="h2">Kirish taqiqlangan</h2>
        <p>Bu bo'limga kirish uchun ruxsatingiz yo'q.</p>
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
