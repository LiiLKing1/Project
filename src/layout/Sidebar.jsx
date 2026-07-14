import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Tag, Users, Settings, ShieldCheck, Megaphone, BarChart3, Wallet } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import ErrorBoundary from '../components/ErrorBoundary';
import './layout.css';

const Sidebar = () => {
  const { hasPermission, loadingRoles, userProfile } = useRoles();

  const allMenuItems = [
    { path: '/', name: 'Bosh Sahifa', icon: <LayoutDashboard size={20} />, permKey: 'dashboard', exact: true },
    { path: '/products', name: 'Mahsulotlar', icon: <Tag size={20} />, permKey: 'products' },
    { path: '/sales', name: 'Sotuvlar', icon: <ShoppingCart size={20} />, permKey: 'sales' },
    { path: '/customers', name: 'Mijozlar', icon: <Users size={20} />, permKey: 'customers' },
    { path: '/marketing', name: 'Marketing', icon: <Megaphone size={20} />, permKey: 'marketing' },
    { path: '/reports', name: 'Hisobotlar', icon: <BarChart3 size={20} />, permKey: 'reports' },
    { path: '/finance', name: 'Moliyalashtirish', icon: <Wallet size={20} />, permKey: 'finance' },
    { path: '/management', name: 'Boshqaruv', icon: <ShieldCheck size={20} />, permKey: 'management' },
    { path: '/settings', name: 'Sozlamalar', icon: <Settings size={20} />, permKey: 'settings' },
  ];

  const visibleItems = allMenuItems.filter(item => hasPermission(item.permKey));

  if (!loadingRoles && visibleItems.length === 0) {
    console.warn('Sidebar: filtrlangandan keyin hech qanday menyu elementi qolmadi', { role: userProfile?.role });
  }

  return (
    <ErrorBoundary>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">B</div>
            BILLZ ERP
          </div>
        </div>
        <nav className="nav-menu">
          {loadingRoles ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
          ) : visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <NavLink 
                key={item.path} 
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))
          ) : (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Menyu topilmadi</div>
          )}
        </nav>
      </aside>
    </ErrorBoundary>
  );
};

export default Sidebar;
