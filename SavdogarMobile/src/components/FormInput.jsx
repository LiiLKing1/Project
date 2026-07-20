import React from 'react';

const FormInput = ({ label, type = 'text', value, onChange, error, placeholder, required = false, ...props }) => {
  const isNumber = type === 'number';

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const strVal = String(val);
    const parts = strVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  };

  const displayValue = isNumber ? formatNumber(value) : value;

  const handleChange = (e) => {
    if (isNumber) {
      let rawValue = e.target.value.replace(/[^\d.-]/g, '');
      const parts = rawValue.split('.');
      if (parts.length > 2) {
        rawValue = parts[0] + '.' + parts.slice(1).join('');
      }
      e.target.value = rawValue;
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontFamily: "'Poppins','Segoe UI',sans-serif" }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A2538', letterSpacing: '0.01em' }}>
          {label} {required && <span style={{ color: '#EF4B4B' }}>*</span>}
        </label>
      )}
      <input
        type={isNumber ? 'text' : type}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          border: `1.5px solid ${error ? '#EF4B4B' : '#DCE8F5'}`,
          outline: 'none',
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: props.disabled ? '#F7FAFF' : '#fff',
          color: '#1A2538',
          transition: 'all 0.2s',
          fontFamily: isNumber ? 'monospace' : 'inherit',
          fontSize: '14px',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = '#4A90E2';
            e.target.style.boxShadow = '0 0 0 3px rgba(74,144,226,0.12)';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = '#DCE8F5';
            e.target.style.boxShadow = 'none';
          }
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '12px', color: '#EF4B4B', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
};

export default FormInput;
