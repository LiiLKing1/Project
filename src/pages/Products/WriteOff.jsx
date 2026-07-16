import React from 'react';
import { Trash2, PlusCircle } from 'lucide-react';

const WriteOff = () => {
  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Hisobdan chiqarish (Spisaniya)</h1>
        <button className="btn btn-primary"><PlusCircle size={18}/> Yangi hisobdan chiqarish</button>
      </div>

      <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <Trash2 size={48} color="var(--border-color)" />
        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>Hozircha hujjatlar yo'q</div>
        <div>Yaroqsiz tovarlarni hisobdan chiqarish uchun hujjat yarating</div>
      </div>
    </div>
  );
};

export default WriteOff;
