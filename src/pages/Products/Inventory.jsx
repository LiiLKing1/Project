import React from 'react';

const Inventory = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Inventarizatsiya</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
        Do'kondagi mahsulotlarni sanash va ombordagi qoldiqlar bilan solishtirish. Hozircha faol tekshiruvlar yo'q.
      </p>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
        Tekshiruvni boshlash
      </button>
    </div>
  );
};

export default Inventory;
