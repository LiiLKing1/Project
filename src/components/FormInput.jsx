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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {label && (
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <input
        type={isNumber ? 'text' : type}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-color)'}`,
          outline: 'none',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-main)',
          transition: 'border-color 0.2s',
          fontFamily: isNumber ? 'monospace' : 'inherit',
          fontSize: '1rem'
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};

export default FormInput;
