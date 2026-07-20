import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TitleBar from '../components/TitleBar';
import './layout.css';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      <TitleBar />
      <div className="app-container" style={{ paddingTop: isElectron ? '40px' : '0' }}>
        {/* Sidebar overlay for mobile */}
        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
          onClick={closeSidebar}
        ></div>
        
        <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        
        <div className="main-content">
          <Topbar toggleSidebar={toggleSidebar} />
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default MainLayout;
