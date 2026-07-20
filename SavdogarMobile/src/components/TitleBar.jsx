import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar({ transparent = false, hideLogo = false }) {
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  if (!isElectron) return null;

  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '40px',
    userSelect: 'none',
    zIndex: 9999,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: transparent ? 'transparent' : '#000',
    color: transparent ? '#d1d5db' : '#9ca3af',
    borderBottom: transparent ? 'none' : '1px solid #111827',
    WebkitAppRegion: 'drag'
  };

  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 1rem',
    height: '100%'
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  };

  const textStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#d1d5db'
  };

  const controlsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    height: '100%'
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '3rem',
    height: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
    WebkitAppRegion: 'no-drag'
  };

  return (
    <div style={containerStyle}>
      {/* App Logo / Name */}
      <div style={logoContainerStyle}>
        {!hideLogo && (
          <div style={logoStyle}>
            {/* Constellation-style triangle logo */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" stroke="#8052ff" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span style={textStyle}>Savdogar</span>
          </div>
        )}
      </div>

      {/* Window Controls */}
      <div style={controlsContainerStyle}>
        <button
          onClick={handleMinimize}
          style={buttonStyle}
          title="Minimize"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1f2937'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'inherit'; }}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        
        <button
          onClick={handleMaximize}
          style={buttonStyle}
          title="Maximize"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1f2937'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'inherit'; }}
        >
          <Square size={14} strokeWidth={2} />
        </button>
        
        <button
          onClick={handleClose}
          style={buttonStyle}
          title="Close"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'inherit'; }}
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
