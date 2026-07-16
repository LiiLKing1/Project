import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              width: '90%',
              maxWidth: maxWidth,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              zIndex: 1001
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 className="h2">{title}</h2>
              <button onClick={onClose} style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
