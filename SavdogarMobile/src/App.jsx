import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import TitleBar from './components/TitleBar';

import Dashboard from './pages/Dashboard/Dashboard';
import POS from './pages/Sales/POS';
import Catalog from './pages/Products/Catalog';
import Inventory from './pages/Products/Inventory';
import Transfer from './pages/Products/Transfer';
import Revaluation from './pages/Products/Revaluation';
import WriteOff from './pages/Products/WriteOff';
import Customers from './pages/Customers/Customers';
import Debts from './pages/Customers/Debts';
import Marketing from './pages/Marketing/Marketing';
import Reports from './pages/Reports/Reports';
import Finance from './pages/Finance/Finance';
import Employees from './pages/Management/Employees';
import Payroll from './pages/Management/Payroll';
import Settings from './pages/Settings/Settings';
import Loyalty from './pages/Settings/Loyalty';
import Trash from './pages/Settings/Trash';
import AuditLogs from './pages/Settings/AuditLogs';
import Backup from './pages/Settings/Backup';
import IntegrityCheck from './pages/Settings/IntegrityCheck';
import Suppliers from './pages/Orders/Suppliers';
import Orders from './pages/Orders/Orders';
import Partners from './pages/Partners/Partners';
import PartnerDebts from './pages/Partners/PartnerDebts';

import Login from './pages/Auth/Login';
import LinkAccount from './pages/Auth/LinkAccount';
import Onboarding from './pages/Auth/Onboarding';
import ReceiptView from './pages/Public/ReceiptView';
import Landing from './pages/Landing/Landing';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/link-account" element={<LinkAccount />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/receipt/:storeId/:saleId" element={<ReceiptView />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Products / Mahsulotlar */}
          <Route path="products" element={<PermissionRoute permKey="products"><Catalog /></PermissionRoute>} />
          <Route path="products/inventory" element={<PermissionRoute permKey="products"><Inventory /></PermissionRoute>} />
          <Route path="products/transfer" element={<PermissionRoute permKey="products"><Transfer /></PermissionRoute>} />
          <Route path="products/revaluation" element={<PermissionRoute permKey="products"><Revaluation /></PermissionRoute>} />
          <Route path="products/write-off" element={<PermissionRoute permKey="products"><WriteOff /></PermissionRoute>} />

          {/* Sales / Sotuvlar (POS) */}
          <Route path="sales" element={<PermissionRoute permKey="sales"><POS /></PermissionRoute>} />

          {/* Customers / Mijozlar */}
          <Route path="customers" element={<PermissionRoute permKey="customers"><Customers /></PermissionRoute>} />
          <Route path="customers/debts" element={<PermissionRoute permKey="customers"><Debts /></PermissionRoute>} />

          {/* Partners / Hamkorlar */}
          <Route path="partners" element={<PermissionRoute permKey="customers"><Partners /></PermissionRoute>} />
          <Route path="partners/debts" element={<PermissionRoute permKey="customers"><PartnerDebts /></PermissionRoute>} />

          {/* Orders & Suppliers */}
          <Route path="orders" element={<PermissionRoute permKey="products"><Orders /></PermissionRoute>} />
          <Route path="orders/suppliers" element={<PermissionRoute permKey="products"><Suppliers /></PermissionRoute>} />

          {/* Marketing */}
          <Route path="marketing" element={<PermissionRoute permKey="marketing"><Marketing /></PermissionRoute>} />

          {/* Reports */}
          <Route path="reports" element={<PermissionRoute permKey="reports"><Reports /></PermissionRoute>} />

          {/* Finance */}
          <Route path="finance" element={<PermissionRoute permKey="finance"><Finance /></PermissionRoute>} />

          {/* Management / Boshqaruv */}
          <Route path="management" element={<PermissionRoute permKey="management"><Employees /></PermissionRoute>} />
          <Route path="management/payroll" element={<PermissionRoute permKey="management"><Payroll /></PermissionRoute>} />

          {/* Settings */}
          <Route path="settings" element={<PermissionRoute permKey="settings"><Settings /></PermissionRoute>} />
          <Route path="settings/loyalty" element={<PermissionRoute permKey="settings"><Loyalty /></PermissionRoute>} />
          <Route path="settings/trash" element={<PermissionRoute permKey="settings"><Trash /></PermissionRoute>} />
          <Route path="settings/audit" element={<PermissionRoute permKey="settings"><AuditLogs /></PermissionRoute>} />
          <Route path="settings/backup" element={<PermissionRoute permKey="importExport"><Backup /></PermissionRoute>} />
          <Route path="settings/integrity" element={<PermissionRoute permKey="settings"><IntegrityCheck /></PermissionRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
