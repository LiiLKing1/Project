import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, Settings } from 'lucide-react';
import './layout.css';

const MobileBottomNav = () => {
  const navItems = [
    { path: '/', label: 'Asosiy', icon: <LayoutDashboard size={24} /> },
    { path: '/sales', label: 'Sotuv', icon: <ShoppingCart size={24} /> },
    { path: '/products', label: 'Mahsulotlar', icon: <Package size={24} /> },
    { path: '/customers', label: 'Mijozlar', icon: <Users size={24} /> },
    { path: '/settings', label: 'Sozlamalar', icon: <Settings size={24} /> },
  ];

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item) => (
        <NavLink 
          key={item.path} 
          to={item.path} 
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default MobileBottomNav;
