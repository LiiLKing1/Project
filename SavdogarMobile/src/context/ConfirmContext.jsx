import React, { createContext, useContext, useState, useCallback } from 'react';
import Modal from '../components/Modal';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({});
  const [resolvePromise, setResolvePromise] = useState(null);

  const confirm = useCallback((opts) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal isOpen={isOpen} onClose={handleCancel} title={options.title || 'Tasdiqlash'} maxWidth="400px">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.5 }}>
            {options.message || 'Haqiqatan ham ushbu amalni bajarasizmi?'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-outline" onClick={handleCancel}>
              {options.cancelText || 'Yo\'q'}
            </button>
            <button 
              className={`btn ${options.confirmStyle === 'danger' ? '' : 'btn-primary'}`} 
              style={options.confirmStyle === 'danger' ? { backgroundColor: 'var(--danger)', color: '#fff' } : {}} 
              onClick={handleConfirm}
            >
              {options.confirmText || 'Ha'}
            </button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};
