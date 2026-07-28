import React, { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TitleBar from '../components/TitleBar';
import BottomNav from './BottomNav';
import './layout.css';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const lastScrollY = useRef(0);
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  const handleScroll = (e) => {
    if (window.innerWidth > 1024) return;
    const currentScrollY = e.target.scrollTop;
    if (currentScrollY > 50 && currentScrollY > lastScrollY.current) {
      setIsTopbarHidden(true);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY <= 50) {
      setIsTopbarHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

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
          <div className={`topbar-wrapper ${isTopbarHidden ? 'hidden' : ''}`}>
            <Topbar toggleSidebar={toggleSidebar} />
          </div>
          <main className="page-content" onScroll={handleScroll}>
            <Outlet />
          </main>
          <BottomNav onMenuClick={toggleSidebar} />
        </div>
      </div>
    </>
  );
};

export default MainLayout;
