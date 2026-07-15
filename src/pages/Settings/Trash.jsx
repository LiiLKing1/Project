import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { RefreshCcw, Trash2, AlertCircle } from 'lucide-react';
import { logAudit } from '../../utils/firebaseUtils';

const Trash = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  const loadTrash = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const collectionsToCheck = [
        { name: 'products', label: 'Mahsulot', nameField: 'name' },
        { name: 'customers', label: 'Mijoz', nameField: 'fullName' },
      ];

      let allArchived = [];
      const now = new Date();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      for (const col of collectionsToCheck) {
        const snap = await getDocs(collection(db, `users/${storeId}/${col.name}`));
        for (const d of snap.docs) {
          const data = d.data();
          if (data.status === 'archived') {
            const archivedDate = data.archivedAt ? new Date(data.archivedAt) : new Date(data.updatedAt || data.createdAt);
            const ageMs = now.getTime() - archivedDate.getTime();
            
            // Auto hard-delete if older than 30 days
            if (ageMs > THIRTY_DAYS_MS) {
              await deleteDoc(doc(db, `users/${storeId}/${col.name}`, d.id));
              continue;
            }

            allArchived.push({
              id: d.id,
              collectionName: col.name,
              typeLabel: col.label,
              displayName: data[col.nameField] || 'Nomsiz',
              archivedAt: archivedDate.toISOString(),
              data
            });
          }
        }
      }

      // Sort by recently archived
      allArchived.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
      setItems(allArchived);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, [storeId]);

  const handleRestore = async (item) => {
    if (!window.confirm(`${item.displayName} qayta tiklansinmi?`)) return;
    try {
      await updateDoc(doc(db, `users/${storeId}/${item.collectionName}`, item.id), {
        status: 'active',
        updatedAt: new Date().toISOString()
      });
      await logAudit(storeId, userProfile, 'RESTORE', item.collectionName, item.displayName);
      addToast('Muvaffaqiyatli tiklandi', 'success');
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleHardDelete = async (item) => {
    if (!window.confirm(`DIQQAT! ${item.displayName} butunlay o'chib ketadi. Buni ortga qaytarib bo'lmaydi. Davom etasizmi?`)) return;
    try {
      await deleteDoc(doc(db, `users/${storeId}/${item.collectionName}`, item.id));
      await logAudit(storeId, userProfile, 'HARD_DELETE', item.collectionName, item.displayName);
      addToast('Butunlay o\'chirildi', 'success');
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Chiqindi qutisi</h1>
        <button className="btn btn-outline" onClick={loadTrash} disabled={loading}>
          <RefreshCcw size={18} /> Yangilash
        </button>
      </div>
      
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--warning-light)', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--warning)' }}>
        <AlertCircle size={24} color="var(--warning)" />
        <div>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Avtomatik tozalash</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Chiqindi qutisidagi ma'lumotlar 30 kundan so'ng avtomatik ravishda butunlay o'chiriladi.</p>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>O'chirilgan sana</th>
                <th style={{ padding: '1rem' }}>Turi</th>
                <th style={{ padding: '1rem' }}>Nomi</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Yuklanmoqda...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Chiqindi qutisi bo'sh</td></tr>
              ) : items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.archivedAt).toLocaleDateString()} {new Date(item.archivedAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-main)' }}>{item.typeLabel}</span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{item.displayName}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-success" style={{ padding: '0.5rem' }} title="Qayta tiklash" onClick={() => handleRestore(item)}>
                      <RefreshCcw size={16} /> Tiklash
                    </button>
                    {userProfile?.role === 'admin' && (
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }} title="Butunlay o'chirish" onClick={() => handleHardDelete(item)}>
                        <Trash2 size={16} /> O'chirish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>
    </div>
  );
};

export default Trash;
