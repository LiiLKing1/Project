import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { RolesProvider } from './context/RolesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RolesProvider>
        <App />
      </RolesProvider>
    </AuthProvider>
  </React.StrictMode>,
);
