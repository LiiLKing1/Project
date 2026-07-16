import React from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

const Roles = () => {
  const roles = [
    { id: 660894, role: 'Admin', count: '', desc: 'Admin' },
    { id: 282801, role: 'Upravlyayushiy magazina', count: '', desc: '' },
    { id: 381758, role: 'Kassir', count: '', desc: '' },
    { id: 643448, role: 'Upravlyayushiy brenda', count: '', desc: '' },
    { id: 114473, role: 'Kontent-menedjer', count: '', desc: '' },
    { id: 895304, role: 'Upravlyayushiy kompanii', count: '', desc: '' },
    { id: 278060, role: 'Prodavets', count: '', desc: '' },
  ];

  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Rollar</h1>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', padding: '0.5rem 0', borderBottom: '2px solid var(--text-main)' }}>Faol rollar (7)</button>
        <button style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)', padding: '0.5rem 0' }}>O'chirilgan rollar (0)</button>
      </div>

      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <input type="text" placeholder="ID, ism, do'kon" style={{ padding: '0.75rem 1rem', width: '300px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }} />
          <button className="btn btn-primary"><PlusCircle size={18} /> Yangi rol</button>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}><input type="checkbox"/></th>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Rol</th>
                <th style={{ padding: '1rem' }}>Miqdori</th>
                <th style={{ padding: '1rem' }}>Do'kon</th>
                <th style={{ padding: '1rem' }}>Tavsif</th>
                <th style={{ padding: '1rem' }}>Harakat</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}><input type="checkbox"/></td>
                  <td style={{ padding: '1rem' }}>{r.id}</td>
                  <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 500 }}>{r.role}</td>
                  <td style={{ padding: '1rem' }}>{r.count}</td>
                  <td style={{ padding: '1rem' }}></td>
                  <td style={{ padding: '1rem' }}>{r.desc}</td>
                  <td style={{ padding: '1rem' }}>
                    <button className="btn btn-danger" style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Roles;
