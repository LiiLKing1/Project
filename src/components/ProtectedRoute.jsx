import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const { userProfile, loadingRoles, hasOnboarded } = useRoles();

  if (!currentUser) {
    const isElectron = window.electronAPI && window.electronAPI.isElectron;
    return <Navigate to={isElectron ? "/login" : "/landing"} replace />;
  }

  // Faqat asosiy admin va xodimlarga admin panelga kirishga ruxsat
  if (
    currentUser.email?.toLowerCase() !== 'liilking@savdogar.uz' && 
    !currentUser.email?.toLowerCase().endsWith('@pos.com')
  ) {
    return <Navigate to="/landing" replace />;
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

  if (userProfile?.role === 'owner' && currentUser && !currentUser.emailVerified && !userProfile?.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!hasOnboarded && userProfile?.status !== 'pending') {
    return <Navigate to="/onboarding" replace />;
  }
  
  if (userProfile?.status === 'pending') {
    return <Navigate to="/waitlist" replace />;
  }

  return (
    <div className={userProfile?.status === 'blocked' ? 'read-only-mode' : ''}>
      {children}
    </div>
  );
};

export default ProtectedRoute;
