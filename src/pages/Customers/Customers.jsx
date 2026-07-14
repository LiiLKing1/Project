import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, CreditCard } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { saveDoc, editDoc, removeDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '+998', birthDate: '', gender: '', note: '' });
  const [formErrors, setFormErrors] = useState({});

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtCustomer, setDebtCustomer] = useState(null);
  const [debtPayment, setDebtPayment] = useState('');

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/customers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [addToast, storeId]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDebtModalOpen) {
          setIsDebtModalOpen(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebtModalOpen, isModalOpen]);

  const validate = async () => {
    const errors = {};
    if (!formData.fullName.trim() || formData.fullName.length < 3) errors.fullName = 'F.I.O kamida 3 ta belgi bo\'lishi kerak';
    
    // Phone validation
    const phoneRegex = /^\+998[0-9]{9}$/;
    const phoneClean = formData.phone.replace(/\s+/g, '');
    if (!phoneRegex.test(phoneClean)) {
      errors.phone = 'Noto\'g\'ri format (Masalan: +998901234567)';
    } else {
      // Check duplicate phone locally instead of network
      const isDuplicate = customers.some(c => c.phone === phoneClean && c.id !== editingId);
      if (isDuplicate) {
        errors.phone = 'Bunday raqamli mijoz allaqachon mavjud!';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!(await validate()) || !storeId) return;

    const payload = {
      ...formData,
      phone: formData.phone.replace(/\s+/g, ''),
      totalPurchases: editingId ? undefined : 0,
      bonusPoints: editingId ? undefined : 0,
      currentDebt: editingId ? undefined : 0,
      visits: editingId ? undefined : 0,
    };
    // Clean undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      if (editingId) {
        await editDoc(doc(db, `users/${storeId}/customers`, editingId), payload);
        addToast('Mijoz muvaffaqiyatli yangilandi', 'success');
      } else {
        await saveDoc(collection(db, `users/${storeId}/customers`), payload);
        addToast('Mijoz muvaffaqiyatli qo\'shildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDebtPayment = async () => {
    if (!debtPayment || Number(debtPayment) <= 0) {
      addToast('Noto\'g\'ri summa kiritildi', 'error');
      return;
    }
    if (Number(debtPayment) > debtCustomer.currentDebt) {
      addToast('To\'lov summasi qarzdan oshib ketmasligi kerak', 'error');
      return;
    }
    if (!storeId) return;

    try {
      // Create payment log
      await saveDoc(collection(db, `users/${storeId}/customerDebts`), {
        customerId: debtCustomer.id,
        type: 'payment',
        amount: Number(debtPayment),
        date: new Date().toISOString()
      });

      // Update customer balance
      await editDoc(doc(db, `users/${storeId}/customers`, debtCustomer.id), {
        currentDebt: debtCustomer.currentDebt - Number(debtPayment)
      });

      addToast('Qarz muvaffaqiyatli yopildi', 'success');
      setIsDebtModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!storeId) return;
    if (window.confirm('Haqiqatan ham bu mijozni o\'chirmoqchimisiz?')) {
      try {
        await removeDoc(doc(db, `users/${storeId}/customers`, id));
        addToast('Mijoz o\'chirildi', 'success');
      } catch (error) {
        addToast(error.message, 'error');
      }
    }
  };

  const openModal = (customer = null) => {
    setFormErrors({});
    if (customer) {
      setEditingId(customer.id);
      setFormData({ fullName: customer.fullName, phone: customer.phone, birthDate: customer.birthDate || '', gender: customer.gender || '', note: customer.note || '' });
    } else {
      setEditingId(null);
      setFormData({ fullName: '', phone: '+998', birthDate: '', gender: '', note: '' });
    }
    setIsModalOpen(true);
  };

  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  const cleanPhoneSearch = search.replace(/\s+/g, '').toLowerCase();
  const cleanNameSearch = search.trim().toLowerCase();
  const filteredCustomers = customers.filter(c => 
    (c?.fullName || '').toLowerCase().includes(cleanNameSearch) || 
    (c?.phone || '').includes(cleanPhoneSearch)
  );

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Mijozlar</h1>
        <button className="btn btn-primary" onClick={() => openModal()}><UserPlus size={18} /> Yangi mijoz</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '350px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Ism yoki telefon raqam..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>F.I.O</th>
                  <th style={{ padding: '1rem' }}>Telefon</th>
                  <th style={{ padding: '1rem' }}>Umumiy xarid</th>
                  <th style={{ padding: '1rem' }}>Tashriflar soni</th>
                  <th style={{ padding: '1rem' }}>Qarzdorlik</th>
                  <th style={{ padding: '1rem' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Mijozlar topilmadi</td></tr>
                ) : filteredCustomers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{c.fullName}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{formatMoney(c.totalPurchases)}</td>
                    <td style={{ padding: '1rem' }}>{c.visits || 0} marta</td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: c.currentDebt > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {c.currentDebt > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {formatMoney(c.currentDebt)}
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setDebtCustomer(c); setDebtPayment(''); setIsDebtModalOpen(true); }}>Yopish</button>
                        </div>
                      ) : 'Yo\'q'}
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--primary)' }} onClick={() => openModal(c)}><Edit size={16} /></button>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* Mijoz Qo'shish Modali */}
      <Drawer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Mijozni tahrirlash' : 'Yangi mijoz'}>
        <FormInput label="F.I.O" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} error={formErrors.fullName} required />
        <FormInput label="Telefon raqami" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} error={formErrors.phone} required placeholder="+998901234567" />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Tug'ilgan sana" type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Jinsi</label>
            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <option value="">Tanlang</option>
              <option value="erkak">Erkak</option>
              <option value="ayol">Ayol</option>
            </select>
          </div>
        </div>

        <FormInput label="Izoh" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
        </div>
      </Drawer>

      {/* Qarz Yopish Modali */}
      <Modal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} title="Qarzni yopish">
        {debtCustomer && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              Joriy qarz: {formatMoney(debtCustomer.currentDebt)}
            </div>
            <FormInput label="To'lov summasi (UZS)" type="number" value={debtPayment} onChange={e => setDebtPayment(e.target.value)} placeholder="0" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDebtModalOpen(false)}>Bekor qilish</button>
              <button className="btn btn-success" onClick={handleDebtPayment}><CreditCard size={18} /> Qabul qilish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
