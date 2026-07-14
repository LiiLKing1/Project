import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const { loadingRoles, hasOnboarded } = useRoles();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (loadingRoles) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-light)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;
