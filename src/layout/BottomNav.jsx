import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, LayoutGrid, Users, Settings } from 'lucide-react';

const BottomNav = () => {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <ShoppingCart size={24} />
        <span>Sotuv</span>
      </NavLink>
      <NavLink to="/catalog" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <LayoutGrid size={24} />
        <span>Katalog</span>
      </NavLink>
      <NavLink to="/customers" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <Users size={24} />
        <span>Mijozlar</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={24} />
        <span>Sozlamalar</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
