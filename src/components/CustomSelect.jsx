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
      style={{ position: 'relative', width: '100%', fontFamily: "'Poppins','Segoe UI',sans-serif", ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: disabled ? '#F7FAFF' : '#fff',
          border: isOpen ? '1.5px solid #4A90E2' : '1.5px solid #DCE8F5',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: '#1A2538',
          transition: 'all 0.2s',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 3px rgba(74,144,226,0.12)' : 'none',
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {Icon && <Icon size={16} color="#8A9BB5" />}
          <span style={{ 
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: selectedOption ? '#1A2538' : '#8A9BB5',
            fontWeight: selectedOption ? 500 : 400,
          }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: 8 }}>
          <ChevronDown size={16} color={isOpen ? '#4A90E2' : '#8A9BB5'} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1.5px solid #DCE8F5',
              borderRadius: '14px',
              boxShadow: '0 16px 40px -12px rgba(0,0,0,0.18), 0 4px 12px -4px rgba(74,144,226,0.12)',
              zIndex: 9999,
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '6px',
            }}
          >
            {options.length === 0 ? (
              <div style={{ padding: '12px 16px', textAlign: 'center', color: '#8A9BB5', fontSize: '13px' }}>
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
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '9px',
                      backgroundColor: isSelected ? '#EBF4FF' : 'transparent',
                      color: isSelected ? '#4A90E2' : '#1A2538',
                      fontWeight: isSelected ? 700 : 400,
                      fontSize: '14px',
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F4F8FF';
                        e.currentTarget.style.color = '#1A2538';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#1A2538';
                      }
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4A90E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </div>
                    )}
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
