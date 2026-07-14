import React from 'react';

const FormInput = ({ label, type = 'text', value, onChange, error, placeholder, required = false, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-color)'}`,
          outline: 'none',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-main)',
          transition: 'border-color 0.2s'
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};

export default FormInput;
