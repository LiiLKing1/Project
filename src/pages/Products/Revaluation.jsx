import React from 'react';
import { Tag, PlusCircle } from 'lucide-react';

const Revaluation = () => {
  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Qayta baholash</h1>
        <button className="btn btn-primary"><PlusCircle size={18}/> Yangi qayta baholash</button>
      </div>

      <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <Tag size={48} color="var(--border-color)" />
        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>Hozircha qayta baholashlar yo'q</div>
        <div>Tovarlar narxini ommaviy o'zgartirish uchun hujjat yarating</div>
      </div>
    </div>
  );
};

export default Revaluation;
