import React from 'react';
import { ArrowRightLeft, PlusCircle } from 'lucide-react';

const Transfer = () => {
  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Transfer (Ko'chirish)</h1>
        <button className="btn btn-primary"><PlusCircle size={18}/> Yangi transfer</button>
      </div>

      <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <ArrowRightLeft size={48} color="var(--border-color)" />
        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>Hozircha transferlar yo'q</div>
        <div>Do'konlar yoki omborlar o'rtasida tovar ko'chirish uchun yangi transfer yarating</div>
      </div>
    </div>
  );
};

export default Transfer;
