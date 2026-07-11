import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import PingMeter from './components/PingMeter';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';

import ProductsLayout from './pages/Products/ProductsLayout';
import Catalog from './pages/Products/Catalog';
import NewProduct from './pages/Products/NewProduct';
import Orders from './pages/Products/Orders';
import NewOrder from './pages/Products/NewOrder';
import Suppliers from './pages/Products/Suppliers';
import Import from './pages/Products/Import';
import Inventory from './pages/Products/Inventory';
import Transfer from './pages/Products/Transfer';
import Revaluation from './pages/Products/Revaluation';
import Writeoff from './pages/Products/Writeoff';

import SalesLayout from './pages/Sales/SalesLayout';
import NewSale from './pages/Sales/NewSale';
import SalesHistory from './pages/Sales/SalesHistory';

import Customers from './pages/Customers/Customers';

import ManagementLayout from './pages/Management/ManagementLayout';
import Roles from './pages/Management/Roles';
import Employees from './pages/Management/Employees';
import NewEmployee from './pages/Management/NewEmployee';

import Settings from './pages/Settings/Settings';

function App() {
  return (
    <BrowserRouter>
      <PingMeter />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Mahsulotlar */}
          <Route path="products" element={<PermissionRoute permKey="products"><ProductsLayout /></PermissionRoute>}>
            <Route index element={<Navigate to="catalog" replace />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="catalog/new" element={<NewProduct />} />
            <Route path="import" element={<Import />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<NewOrder />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="transfer" element={<Transfer />} />
            <Route path="revaluation" element={<Revaluation />} />
            <Route path="writeoff" element={<Writeoff />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="*" element={<div style={{padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Tez kunda ishga tushadi</div>} />
          </Route>

          {/* Sotuvlar */}
          <Route path="sales" element={<PermissionRoute permKey="sales"><SalesLayout /></PermissionRoute>}>
            <Route index element={<Navigate to="new" replace />} />
            <Route path="new" element={<NewSale />} />
            <Route path="history" element={<SalesHistory />} />
          </Route>

          {/* Mijozlar */}
          <Route path="customers" element={<PermissionRoute permKey="customers"><Customers /></PermissionRoute>} />

          {/* Boshqaruv */}
          <Route path="management" element={<PermissionRoute permKey="management"><ManagementLayout /></PermissionRoute>}>
            <Route index element={<Navigate to="employees" replace />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/new" element={<NewEmployee />} />
            <Route path="roles" element={<Roles />} />
          </Route>

          {/* Hisobotlar, Marketing, Moliya - tez kunda */}
          <Route path="reports" element={<PermissionRoute permKey="reports"><div style={{padding: '2rem'}}><h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Hisobotlar</h1><p style={{color: 'var(--text-secondary)'}}>Bu bo'lim tez kunda ishga tushadi.</p></div></PermissionRoute>} />
          <Route path="marketing" element={<PermissionRoute permKey="marketing"><div style={{padding: '2rem'}}><h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Marketing</h1><p style={{color: 'var(--text-secondary)'}}>Bu bo'lim tez kunda ishga tushadi.</p></div></PermissionRoute>} />
          <Route path="finance" element={<PermissionRoute permKey="finance"><div style={{padding: '2rem'}}><h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Moliyalashtirish</h1><p style={{color: 'var(--text-secondary)'}}>Bu bo'lim tez kunda ishga tushadi.</p></div></PermissionRoute>} />

          {/* Sozlamalar */}
          <Route path="settings" element={<PermissionRoute permKey="settings"><Settings /></PermissionRoute>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
