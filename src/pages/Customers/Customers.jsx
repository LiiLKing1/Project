import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Phone, User, CreditCard } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';

const Customers = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => { fetchCustomers(); }, [currentUser]);

  const fetchCustomers = async () => {
    if (!storeId) return;
    try {
      const snap = await getDocs(collection(db, `users/${storeId}/customers`));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.debt || 0) - (a.debt || 0));
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const data = { name, phone, comment, debt: 0, totalPurchases: 0, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, `users/${storeId}/customers`), data);
      setCustomers([{ id: ref.id, ...data }, ...customers]);
      setShowModal(false);
      setName(''); setPhone(''); setComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalDebt = customers.reduce((acc, c) => acc + (c.debt || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Mijozlar</h1>
        <button 
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Plus size={18} />
          Yangi mijoz
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ backgroundColor: 'var(--bg-hover)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}><User size={20} color="var(--primary)" /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Jami mijozlar</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{customers.length}</div>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-hover)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}><CreditCard size={20} color="var(--danger)" /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Umumiy qarz</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatMoney(totalDebt)}</div>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-hover)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}><CreditCard size={20} color="var(--success)" /></div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Qarzsizlar</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
              {customers.filter(c => !c.debt || c.debt === 0).length}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha qidiruv..."
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Ism</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Telefon</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Jami xaridlar</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Qarz</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Holat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Mijozlar yo'q. Yangi mijoz qo'shing.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--primary)' }}>{c.name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} />
                        {c.phone || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{formatMoney(c.totalPurchases || 0)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: c.debt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {c.debt > 0 ? formatMoney(c.debt) : 'Qarz yo\'q'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        backgroundColor: c.debt > 0 ? 'var(--warning-bg)' : 'var(--success-bg)', 
                        color: c.debt > 0 ? 'var(--warning)' : 'var(--success)', 
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '500', fontSize: '0.75rem'
                      }}>
                        {c.debt > 0 ? 'Qarzdor' : 'Sof'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Yangi mijoz</h2>
              <button onClick={() => setShowModal(false)}><X size={20} color="var(--text-secondary)" /></button>
            </div>
            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Ism *</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Mijozning ismi" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Telefon</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="+998..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Izoh</label>
                <input value={comment} onChange={e => setComment(e.target.value)} type="text" placeholder="Qo'shimcha ma'lumot" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
