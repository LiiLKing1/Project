import React from 'react';
import { ClipboardList, PlusCircle } from 'lucide-react';

const Inventory = () => {
  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Inventarizatsiya</h1>
        <button className="btn btn-primary"><PlusCircle size={18}/> Yangi inventarizatsiya</button>
      </div>

      <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <ClipboardList size={48} color="var(--border-color)" />
        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>Hozircha inventarizatsiya yo'q</div>
        <div>Ombordagi tovarlarni tekshirish uchun yangi hujjat yarating</div>
      </div>
    </div>
  );
};

export default Inventory;
