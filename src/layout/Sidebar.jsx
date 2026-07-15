import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Tag, Users, Settings, ShieldCheck, Megaphone, BarChart3, Wallet, PackageOpen } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Drawer from '../components/Drawer';
import { useTranslation } from '../hooks/useTranslation';
import './layout.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { hasPermission, loadingRoles, userProfile } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [activeFlyout, setActiveFlyout] = useState(null);

  const allMenuItems = [
    { path: '/', name: t('dashboard'), icon: <LayoutDashboard size={20} />, permKey: 'dashboard', exact: true },
    { path: '/products', name: t('products'), icon: <Tag size={20} />, permKey: 'products' },
    { path: '/orders', name: t('orders'), icon: <PackageOpen size={20} />, permKey: 'products', isFlyout: true, flyoutKey: 'orders' },
    { path: '/sales', name: t('sales'), icon: <ShoppingCart size={20} />, permKey: 'sales' },
    { path: '/customers', name: t('customers'), icon: <Users size={20} />, permKey: 'customers', isFlyout: true, flyoutKey: 'customers' },
    { path: '/marketing', name: t('marketing'), icon: <Megaphone size={20} />, permKey: 'marketing' },
    { path: '/reports', name: t('reports'), icon: <BarChart3 size={20} />, permKey: 'reports' },
    { path: '/finance', name: t('finance'), icon: <Wallet size={20} />, permKey: 'finance' },
    { path: '/management', name: t('management'), icon: <ShieldCheck size={20} />, permKey: 'management', isFlyout: true, flyoutKey: 'management' },
    { path: '/settings', name: t('settings'), icon: <Settings size={20} />, permKey: 'settings', isFlyout: true, flyoutKey: 'settings' },
  ];

  const visibleItems = allMenuItems.filter(item => hasPermission(item.permKey));

  if (!loadingRoles && visibleItems.length === 0) {
    console.warn('Sidebar: filtrlangandan keyin hech qanday menyu elementi qolmadi', { role: userProfile?.role });
  }

  const flyoutMenus = {
    customers: {
      title: 'Mijozlar bo\'limi',
      items: [
        { path: '/customers', name: 'Mijozlar Ro\'yxati', desc: 'Mavjud mijozlar bazasi' },
        { path: '/customers/debts', name: 'Qarzlar', desc: 'Qarzi bor mijozlar va to\'lovlar' }
      ]
    },
    orders: {
      title: 'Buyurtmalar bo\'limi',
      items: [
        { path: '/orders', name: 'Buyurtmalar', desc: 'Ombor uchun tovar buyurtmalari' },
        { path: '/orders/suppliers', name: 'Yetkazib beruvchilar', desc: 'Ta\'minotchilar ro\'yxati' }
      ]
    },
    management: {
      title: 'Boshqaruv',
      items: [
        { path: '/management', name: 'Xodimlar', desc: 'Xodimlar va ruxsatlar' },
        { path: '/management/payroll', name: 'Ish haqi (Payroll)', desc: 'KPI va oylik maoshlar' }
      ]
    },
    settings: {
      title: 'Xavfsizlik va Sozlamalar',
      items: [
        { path: '/settings', name: 'Asosiy Sozlamalar', desc: 'Do\'kon va kvitansiya' },
        { path: '/settings/trash', name: 'Chiqindi qutisi', desc: 'O\'chirilganlarni qaytarish' },
        { path: '/settings/audit', name: 'Audit jurnali', desc: 'Harakatlar tarixi' },
        { path: '/settings/backup', name: 'Zaxira (Backup)', desc: 'Bazani yuklab olish' },
        { path: '/settings/integrity', name: 'Xatoliklarni tekshirish', desc: 'Manfiy qoldiq va qarzlar' }
      ]
    }
  };

  const handleMenuClick = (e, item) => {
    if (item.isFlyout) {
      e.preventDefault();
      setActiveFlyout(item.flyoutKey);
    } else {
      if (closeSidebar) closeSidebar();
    }
  };

  const handleFlyoutNavigate = (path) => {
    navigate(path);
    setActiveFlyout(null);
    if (closeSidebar) closeSidebar();
  };

  return (
    <ErrorBoundary>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
            visibleItems.map((item) => {
              // Special active check for flyout parents
              const isActive = item.isFlyout 
                ? location.pathname.startsWith(item.path)
                : location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <NavLink 
                  key={item.path} 
                  to={item.path}
                  onClick={(e) => handleMenuClick(e, item)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              );
            })
          ) : (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Menyu topilmadi</div>
          )}
        </nav>
      </aside>

      {/* Secondary Flyout Drawer */}
      <Drawer 
        position="left" 
        isOpen={!!activeFlyout} 
        onClose={() => setActiveFlyout(null)} 
        title={activeFlyout ? flyoutMenus[activeFlyout].title : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeFlyout && flyoutMenus[activeFlyout].items.map((subItem) => (
            <div 
              key={subItem.path}
              onClick={() => handleFlyoutNavigate(subItem.path)}
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                {subItem.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {subItem.desc}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </ErrorBoundary>
  );
};

export default Sidebar;
