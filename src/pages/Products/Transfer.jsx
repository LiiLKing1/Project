import React from 'react';

const Transfer = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Transfer (Ko'chirishlar)</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
        Do'konlar o'rtasida yoki ombordan filialga tovar ko'chirish jarayoni.
      </p>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
        Yangi transfer
      </button>
    </div>
  );
};

export default Transfer;
