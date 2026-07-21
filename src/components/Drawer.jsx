import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Global store to track open drawers to manage z-index and ESC/click-outside logic
const drawerStack = [];

const Drawer = ({ isOpen, onClose, title, children, position = 'right', width = '500px' }) => {
  const [zIndex, setZIndex] = useState(1000);
  const [drawerId] = useState(() => Math.random().toString(36).substring(2, 9));
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  useEffect(() => {
    if (isOpen) {
      drawerStack.push(drawerId);
      const newZIndex = 1000 + (drawerStack.length - 1) * 10;
      setZIndex(newZIndex);

      const handleEscape = (e) => {
        if (e.key === 'Escape' && drawerStack[drawerStack.length - 1] === drawerId) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
        const index = drawerStack.indexOf(drawerId);
        if (index > -1) drawerStack.splice(index, 1);
      };
    }
  }, [isOpen, drawerId, onClose]);

  const handleBackdropClick = () => {
    if (drawerStack[drawerStack.length - 1] === drawerId) onClose();
  };

  const getPanelStyle = () => {
    const base = {
      position: 'fixed',
      backgroundColor: '#fff',
      boxShadow: '-8px 0 40px -10px rgba(0,0,0,0.2)',
      zIndex: zIndex + 2,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Poppins','Segoe UI',sans-serif",
    };
    if (position === 'top') {
      return { ...base, top: isElectron ? '40px' : 0, left: 0, right: 0, width: '100%', maxHeight: '85vh',
        borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' };
    } else if (position === 'bottom') {
      return { ...base, bottom: 0, left: 0, right: 0, width: '100%', maxHeight: '90vh',
        borderTopLeftRadius: '24px', borderTopRightRadius: '24px' };
    } else if (position === 'left') {
      return { ...base, top: isElectron ? '40px' : 0, bottom: 0, left: 0, width: '100%', maxWidth: width };
    }
    return { ...base, top: isElectron ? '40px' : 0, bottom: 0, right: 0, width: '100%', maxWidth: width };
  };

  const getAnimation = () => {
    if (position === 'top')    return { initial: { y: '-100%' }, animate: { y: 0 }, exit: { y: '-100%' } };
    if (position === 'bottom') return { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };
    if (position === 'left')   return { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } };
    return { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              top: isElectron ? '40px' : 0,
              zIndex: zIndex,
            }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            {...getAnimation()}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.28 }}
            style={getPanelStyle()}
          >
            {/* ── Header with gradient ── */}
            <div style={{
              background: 'linear-gradient(135deg, #4A90E2 0%, #7BCEEB 100%)',
              padding: '0 24px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 300, transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.32)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
              >✕</button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', minHeight: 0 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
