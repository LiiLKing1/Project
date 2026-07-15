import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { RolesProvider } from './context/RolesContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import { WarehouseProvider } from './context/WarehouseContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RolesProvider>
        <SettingsProvider>
          <WarehouseProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </WarehouseProvider>
        </SettingsProvider>
      </RolesProvider>
    </AuthProvider>
  </React.StrictMode>,
);
