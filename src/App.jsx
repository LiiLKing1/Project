import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';

import Dashboard from './pages/Dashboard/Dashboard';
import POS from './pages/Sales/POS';
import Catalog from './pages/Products/Catalog';
import Customers from './pages/Customers/Customers';
import Marketing from './pages/Marketing/Marketing';
import Reports from './pages/Reports/Reports';
import Finance from './pages/Finance/Finance';
import Employees from './pages/Management/Employees';
import Settings from './pages/Settings/Settings';

import Login from './pages/Auth/Login';
import Onboarding from './pages/Auth/Onboarding';
import ReceiptView from './pages/Public/ReceiptView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/receipt/:storeId/:saleId" element={<ReceiptView />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Products / Mahsulotlar */}
          <Route path="products" element={<PermissionRoute permKey="products"><Catalog /></PermissionRoute>} />

          {/* Sales / Sotuvlar (POS) */}
          <Route path="sales" element={<PermissionRoute permKey="sales"><POS /></PermissionRoute>} />

          {/* Customers / Mijozlar */}
          <Route path="customers" element={<PermissionRoute permKey="customers"><Customers /></PermissionRoute>} />

          {/* Marketing */}
          <Route path="marketing" element={<PermissionRoute permKey="marketing"><Marketing /></PermissionRoute>} />

          {/* Reports */}
          <Route path="reports" element={<PermissionRoute permKey="reports"><Reports /></PermissionRoute>} />

          {/* Finance */}
          <Route path="finance" element={<PermissionRoute permKey="finance"><Finance /></PermissionRoute>} />

          {/* Management / Boshqaruv */}
          <Route path="management" element={<PermissionRoute permKey="management"><Employees /></PermissionRoute>} />

          {/* Settings */}
          <Route path="settings" element={<PermissionRoute permKey="settings"><Settings /></PermissionRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
