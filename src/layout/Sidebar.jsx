import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Tag, 
  Users, 
  BarChart2, 
  Wallet, 
  Settings,
  ShieldCheck,
  Megaphone
} from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import './layout.css';

const Sidebar = () => {
  const { hasPermission } = useRoles();

  const allMenuItems = [
    { path: '/',            name: 'Dashboard',        icon: <LayoutDashboard size={20} />, permKey: 'dashboard', exact: true },
    { path: '/products',   name: 'Mahsulotlar',      icon: <ShoppingCart size={20} />,    permKey: 'products' },
    { path: '/sales',      name: 'Sotuvlar',          icon: <Tag size={20} />,              permKey: 'sales' },
    { path: '/customers',  name: 'Mijozlar',          icon: <Users size={20} />,            permKey: 'customers' },
    { path: '/marketing',  name: 'Marketing',         icon: <Megaphone size={20} />,        permKey: 'marketing' },
    { path: '/reports',    name: 'Hisobotlar',        icon: <BarChart2 size={20} />,        permKey: 'reports' },
    { path: '/finance',    name: 'Moliyalashtirish',  icon: <Wallet size={20} />,           permKey: 'finance' },
    { path: '/management', name: 'Boshqaruv',         icon: <ShieldCheck size={20} />,      permKey: 'management' },
    { path: '/settings',   name: 'Sozlamalar',        icon: <Settings size={20} />,         permKey: 'settings' },
  ];

  // Faqat ruxsati bor menyularni ko'rsatamiz
  const visibleItems = allMenuItems.filter(item => hasPermission(item.permKey));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">P</div>
          PROJECT
        </div>
      </div>
      <nav className="nav-menu">
        {visibleItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
