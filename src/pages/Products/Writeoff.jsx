import React from 'react';

const Writeoff = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Hisobdan chiqarish (Spisaniya)</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
        Yaroqsiz holga kelgan yoki muddati o'tgan tovarlarni ombor va do'kon hisobidan chiqarish.
      </p>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
        Hisobdan chiqarish
      </button>
    </div>
  );
};

export default Writeoff;
