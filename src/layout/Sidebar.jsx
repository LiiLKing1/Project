import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Tag, Users, Settings, ShieldCheck, Megaphone, BarChart3, Wallet, PackageOpen, Handshake, LogOut, Sun, Moon } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Drawer from '../components/Drawer';
import { useTranslation } from '../hooks/useTranslation';
import './layout.css';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { hasPermission, loadingRoles, userProfile } = useRoles();
  const { logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [activeFlyout, setActiveFlyout] = useState(null);

  const allMenuItems = [
    { path: '/', name: t('dashboard'), icon: <LayoutDashboard size={20} />, permKey: 'dashboard', exact: true },
    { path: '/products', name: t('products'), icon: <Tag size={20} />, permKey: 'products', isFlyout: true, flyoutKey: 'products' },
    { path: '/sales', name: t('sales'), icon: <ShoppingCart size={20} />, permKey: 'sales' },
    { path: '/customers', name: t('customers'), icon: <Users size={20} />, permKey: 'customers', isFlyout: true, flyoutKey: 'customers' },
    { path: '/partners', name: 'Hamkorlar', icon: <Handshake size={20} />, permKey: 'customers', isFlyout: true, flyoutKey: 'partners' },
    { path: '/marketing', name: t('marketing'), icon: <Megaphone size={20} />, permKey: 'marketing' },
    { path: '/reports', name: t('reports'), icon: <BarChart3 size={20} />, permKey: 'reports' },
    { path: '/finance', name: t('finance'), icon: <Wallet size={20} />, permKey: 'finance' },
    { path: '/management', name: t('management'), icon: <ShieldCheck size={20} />, permKey: 'management', isFlyout: true, flyoutKey: 'management' },
    { path: '/settings', name: t('settings'), icon: <Settings size={20} />, permKey: 'settings', isFlyout: true, flyoutKey: 'settings' },
  ];

  const visibleItems = allMenuItems.filter(item => {
    if (item.permKey === 'settings') return hasPermission('settings') || hasPermission('importExport');
    return hasPermission(item.permKey);
  });

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
    partners: {
      title: 'Hamkorlar bo\'limi',
      items: [
        { path: '/partners', name: 'Hamkorlar', desc: 'Hamkor kompaniyalar ro\'yxati' },
        { path: '/partners/debts', name: 'Hamkor qarzlari', desc: 'Kreditorlik qarzlar' }
      ]
    },
    products: {
      title: 'Mahsulotlar',
      items: [
        { path: '/products', name: 'Katalog', desc: 'Barcha tovarlar ro\'yxati' },
        { path: '/orders', name: 'Buyurtmalar', desc: 'Ta\'minotchiga buyurtma' },
        { path: '/products/inventory', name: 'Inventarizatsiya', desc: 'Ombor nazorati' },
        { path: '/products/transfer', name: 'Transfer', desc: 'Omborlararo ko\'chirish' },
        { path: '/products/revaluation', name: 'Qayta baholash', desc: 'Ommaviy narx o\'zgartirish' },
        { path: '/products/write-off', name: 'Hisobdan chiqarish', desc: 'Spisaniya qilish' },
        { path: '/orders/suppliers', name: 'Yetkazib beruvchilar', desc: 'Ta\'minotchilar ro\'yxati' }
      ]
    },
    management: {
      title: 'Boshqaruv',
      items: [
        { path: '/management', name: 'Xodimlar', desc: 'Xodimlar ro\'yxati' },
        { path: '/management/payroll', name: 'Ish haqi (Payroll)', desc: 'KPI va oylik maoshlar' }
      ]
    },
    settings: {
      title: 'Xavfsizlik va Sozlamalar',
      items: [
        ...(hasPermission('settings') ? [
          { path: '/settings', name: 'Asosiy Sozlamalar', desc: 'Do\'kon va kvitansiya' },
          { path: '/settings/trash', name: 'Chiqindi qutisi', desc: 'O\'chirilganlarni qaytarish' },
          { path: '/settings/audit', name: 'Audit jurnali', desc: 'Harakatlar tarixi' },
          { path: '/settings/integrity', name: 'Xatoliklarni tekshirish', desc: 'Manfiy qoldiq va qarzlar' }
        ] : []),
        ...(hasPermission('importExport') ? [
          { path: '/settings/backup', name: 'Yuklanishlar', desc: 'Import va Eksport amallari' }
        ] : [])
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
        
        {/* User Profile, Theme & Logout Footer (Faqat xodimlar uchun) */}
        {!loadingRoles && userProfile && !hasPermission('settings') && (
          <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userProfile?.name || 'Xodim'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{userProfile?.role === 'admin' ? 'Admin' : 'Kassir'}</span>
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '0.5rem', color: 'var(--text-secondary)' }} 
                onClick={() => updateSettings({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
                title="Mavzuni o'zgartirish"
              >
                {settings?.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--border-color)', padding: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} 
              onClick={async () => { if(await confirm({ message: "Tizimdan chiqmoqchimisiz?", confirmStyle: 'danger' })) logout(); }}
            >
              <LogOut size={16} /> Chiqish
            </button>
          </div>
        )}
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
