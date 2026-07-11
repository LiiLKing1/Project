import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PackageSearch, Download, ClipboardList, Package, ArrowRightLeft, Tags, Trash2, Truck } from 'lucide-react';

const ProductsLayout = () => {
  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', paddingLeft: '1rem' }}>Mahsulotlar</h2>
        
        <NavLink to="/products/catalog" style={navStyle}>
          <PackageSearch size={18} /> Katalog
        </NavLink>
        <NavLink to="/products/import" style={navStyle}>
          <Download size={18} /> Import
        </NavLink>
        <NavLink to="/products/orders" style={navStyle}>
          <ClipboardList size={18} /> Buyurtmalar
        </NavLink>
        <NavLink to="/products/inventory" style={navStyle}>
          <Package size={18} /> Inventarizatsiya
        </NavLink>
        <NavLink to="/products/transfer" style={navStyle}>
          <ArrowRightLeft size={18} /> Transfer
        </NavLink>
        <NavLink to="/products/revaluation" style={navStyle}>
          <Tags size={18} /> Qayta baholash
        </NavLink>
        <NavLink to="/products/writeoff" style={navStyle}>
          <Trash2 size={18} /> Hisobdan chiqarish
        </NavLink>
        <NavLink to="/products/suppliers" style={navStyle}>
          <Truck size={18} /> Yetkazib beruvchilar
        </NavLink>
      </div>
      
      <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
};

const navStyle = ({ isActive }) => ({
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
  color: isActive ? 'var(--primary)' : 'var(--text-main)',
  fontWeight: isActive ? '600' : '500',
  textDecoration: 'none'
});

export default ProductsLayout;
