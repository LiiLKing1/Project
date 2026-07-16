import React from 'react';
import { FileText, PlusCircle } from 'lucide-react';

const SupplierOrders = () => {
  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Buyurtmalar (Yetkazib beruvchilardan)</h1>
        <button className="btn btn-primary"><PlusCircle size={18}/> Yangi buyurtma</button>
      </div>

      <div className="glass-panel flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <FileText size={48} color="var(--border-color)" />
        <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)' }}>Hozircha buyurtmalar yo'q</div>
        <div>Yangi tovar buyurtma qilish uchun "Yangi buyurtma" tugmasini bosing</div>
      </div>
    </div>
  );
};

export default SupplierOrders;
