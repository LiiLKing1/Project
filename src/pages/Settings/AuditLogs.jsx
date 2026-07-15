import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { Search } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;
    
    // We listen in real-time or just fetch. Since it can be huge, we might limit it, but let's just limit to 200 for now.
    // If you don't have indexes, orderBy might fail, so we might need to rely on client sort if Firebase complains.
    const q = query(
      collection(db, `users/${storeId}/auditLogs`),
      orderBy('createdAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      // If index is missing, it will throw. Fallback to no orderBy and client sort.
      if (error.message.includes('index')) {
        onSnapshot(collection(db, `users/${storeId}/auditLogs`), (fallbackSnap) => {
          const unsorted = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          unsorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setLogs(unsorted);
          setLoading(false);
        });
      } else {
        addToast(error.message, 'error');
        setLoading(false);
      }
    });

    return () => unsub();
  }, [storeId]);

  const filteredLogs = logs.filter(l => 
    l.userName?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'var(--success)';
      case 'UPDATE': return 'var(--primary)';
      case 'ARCHIVE': return 'var(--warning)';
      case 'DELETE':
      case 'HARD_DELETE': return 'var(--danger)';
      case 'RESTORE': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Audit Jurnali</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '350px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Qidirish (ism, amal, ma'lumot)..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)', zIndex: 1 }}>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Sana va Vaqt</th>
                <th style={{ padding: '1rem' }}>Xodim</th>
                <th style={{ padding: '1rem' }}>Rol</th>
                <th style={{ padding: '1rem' }}>Amal</th>
                <th style={{ padding: '1rem' }}>Bo'lim (Resurs)</th>
                <th style={{ padding: '1rem' }}>Ma'lumot</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Yuklanmoqda...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Tarix topilmadi</td></tr>
              ) : filteredLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {new Date(log.createdAt).toLocaleString('uz-UZ')}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{log.userName}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-surface)' }}>{log.userRole}</span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: getActionColor(log.action) }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{log.resource}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{log.details}</td>
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

export default AuditLogs;
