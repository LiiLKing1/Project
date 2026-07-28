import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, LayoutGrid, Users, Menu, Home } from 'lucide-react';

const BottomNav = ({ onMenuClick }) => {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} end>
        <Home size={24} />
        <span>Bosh sahifa</span>
      </NavLink>
      <NavLink to="/products" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <LayoutGrid size={24} />
        <span>Katalog</span>
      </NavLink>
      <NavLink to="/sales" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <ShoppingCart size={24} />
        <span>Sotuv</span>
      </NavLink>
      <NavLink to="/customers" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <Users size={24} />
        <span>Mijozlar</span>
      </NavLink>
      <button className="bottom-nav-item" onClick={onMenuClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: 0, margin: 0, fontFamily: 'inherit', color: 'inherit' }}>
        <Menu size={24} />
        <span>Menyu</span>
      </button>
    </div>
  );
};

export default BottomNav;
