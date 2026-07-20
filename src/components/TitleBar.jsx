import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  if (!isElectron) return null;

  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  return (
    <div
      className="flex justify-between items-center w-full h-10 bg-black text-gray-400 select-none z-50 fixed top-0 left-0 right-0 border-b border-gray-900"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* App Logo / Name */}
      <div className="flex items-center px-4 h-full">
        <div className="flex items-center justify-center gap-2">
          {/* Constellation-style triangle logo */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22H22L12 2Z" stroke="#8052ff" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-300">Savdogar</span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-full hover:bg-gray-800 hover:text-white transition-colors duration-100"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Minimize"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-full hover:bg-gray-800 hover:text-white transition-colors duration-100"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Maximize"
        >
          <Square size={14} strokeWidth={2} />
        </button>
        
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-full hover:bg-red-600 hover:text-white transition-colors duration-100"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Close"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
