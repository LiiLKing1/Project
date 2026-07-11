import React from 'react';

const Revaluation = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Qayta baholash</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
        Valyuta kursi yoki bozordagi holat o'zgarganda tovarlar narxlarini ommaviy o'zgartirish.
      </p>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
        Yangi narx belgilash
      </button>
    </div>
  );
};

export default Revaluation;
