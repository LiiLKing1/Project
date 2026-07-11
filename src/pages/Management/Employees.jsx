import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreHorizontal, Trash2, KeyRound } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';
import { useRoles } from '../../context/RolesContext';

const Employees = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const { roles } = useRoles();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [currentUser]);

  const fetchEmployees = async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(collection(db, `users/${storeId}/employees`));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setEmployees(data);
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (empId) => {
    if (!window.confirm("Xodimni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, `users/${storeId}/employees`, empId));
      setEmployees(employees.filter(e => e.id !== empId));
    } catch (error) {
      console.error("O'chirishda xatolik:", error);
    }
  };

  const filtered = employees.filter(e => 
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.includes(search) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleName = (roleKey) => roles[roleKey]?.name || roleKey;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Xodimlar</h1>
      </div>
      
      <div style={{ padding: '0 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button style={{ padding: '1rem 0', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', fontWeight: '600' }}>
          Joriy xodimlar ({employees.length})
        </button>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki email bo'yicha qidiruv" 
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
        <button 
          onClick={() => navigate('/management/employees/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Plus size={18} />
          Yangi xodim
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>F.I.Sh.</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Email (Login)</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Telefon</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Rol</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Holat</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Harakat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {employees.length === 0 ? 'Hozircha xodimlar yo\'q. Yangi xodim qo\'shing.' : 'Qidiruv bo\'yicha topilmadi.'}
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--primary)' }}>{emp.name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{emp.phone || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
                        {getRoleName(emp.role)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
                        Faol
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        style={{ padding: '0.4rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Employees;
