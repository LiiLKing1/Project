import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import TitleBar from '../components/TitleBar';
import './layout.css';

const MainLayout = () => {
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden relative">
      <TitleBar />
      <div className="flex flex-col flex-1" style={{ paddingTop: isElectron ? '40px' : '0' }}>
        <Topbar />
        
        {/* Main Content Area (Scrollable) */}
        <main className="flex-1 overflow-y-auto pb-[70px]">
          <Outlet />
        </main>
        
        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
