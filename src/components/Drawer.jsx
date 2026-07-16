import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Global store to track open drawers to manage z-index and ESC/click-outside logic
const drawerStack = [];

const Drawer = ({ isOpen, onClose, title, children, position = 'right' }) => {
  const [zIndex, setZIndex] = useState(1000);
  const [drawerId] = useState(() => Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (isOpen) {
      drawerStack.push(drawerId);
      // Base z-index + 10 for each drawer to ensure stacking
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
        if (index > -1) {
          drawerStack.splice(index, 1);
        }
      };
    }
  }, [isOpen, drawerId, onClose]);

  const handleBackdropClick = (e) => {
    if (drawerStack[drawerStack.length - 1] === drawerId) {
      onClose();
    }
  };

  const getPanelStyle = () => {
    const baseStyle = {
      position: 'fixed',
      backgroundColor: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: zIndex + 2,
      display: 'flex',
      flexDirection: 'column',
    };

    if (position === 'bottom') {
      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '90vh',
        borderTopLeftRadius: 'var(--radius-xl)',
        borderTopRightRadius: 'var(--radius-xl)',
      };
    } else if (position === 'left') {
      return {
        ...baseStyle,
        top: 0,
        bottom: 0,
        left: 0,
        width: '100%',
        maxWidth: '400px',
      };
    } else { // default right
      return {
        ...baseStyle,
        top: 0,
        bottom: 0,
        right: 0,
        width: '100%',
        maxWidth: '500px',
      };
    }
  };

  const getAnimationVariants = () => {
    if (position === 'bottom') {
      return { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };
    } else if (position === 'left') {
      return { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } };
    } else {
      return { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(4px)',
              zIndex: zIndex
            }}
            onClick={handleBackdropClick}
          />
          
          {/* Sliding Panel */}
          <motion.div
            {...getAnimationVariants()}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
            style={getPanelStyle()}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-main)'
            }}>
              <h2 className="h2">{title}</h2>
              <button onClick={onClose} style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
