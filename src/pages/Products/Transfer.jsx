import React, { useState } from 'react';
import { ArrowRightLeft, PlusCircle } from 'lucide-react';
import TransferDrawer from './TransferDrawer';

const Transfer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transfer (Ko'chirish)</h1>
          <p className="page-subtitle">Omborlar va filiallar o'rtasida mahsulotlarni ko'chirish</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
          <PlusCircle size={18}/> Yangi transfer
        </button>
      </div>

      <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#8A9BB5' }}>
        <ArrowRightLeft size={64} color="#DCE8F5" />
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1A2538' }}>Ko'chirish jarayoni</div>
        <div style={{ fontSize: 14 }}>Omborlar orasida tovar ko'chirish uchun "Yangi transfer" tugmasini bosing</div>
      </div>

      <TransferDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default Transfer;
