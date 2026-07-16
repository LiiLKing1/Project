import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Tanlang...', 
  icon: Icon,
  style = {},
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div 
      ref={containerRef} 
      style={{ position: 'relative', width: '100%', ...style }}
      className={disabled ? 'disabled' : ''}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-main)',
          transition: 'all 0.2s',
          outline: 'none',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          {Icon && <Icon size={18} color="var(--text-secondary)" />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedOption ? 'inherit' : 'var(--text-secondary)' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="var(--text-secondary)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              maxHeight: '250px',
              overflowY: 'auto',
              padding: '0.5rem'
            }}
          >
            {options.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Ma'lumot topilmadi
              </div>
            ) : (
              options.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {option.label}
                    </span>
                    {isSelected && <Check size={16} color="var(--primary)" />}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
