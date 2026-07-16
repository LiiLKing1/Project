import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, CreditCard } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { saveDoc, editDoc, softDeleteDoc, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', phone: '+998', birthDate: '', gender: '', note: '', currentDebt: '', isVip: false, bonusBalance: '', bonusPercent: '' });
  const [formErrors, setFormErrors] = useState({});

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
        if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

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
      currentDebt: formData.currentDebt ? Number(formData.currentDebt) : 0,
      bonusBalance: formData.bonusBalance ? Number(formData.bonusBalance) : (editingId ? undefined : 0),
      bonusPercent: formData.bonusPercent ? Number(formData.bonusPercent) : 0,
      isVip: formData.isVip,
      phone: formData.phone.replace(/\s+/g, ''),
      totalPurchases: editingId ? undefined : 0,
      visits: editingId ? undefined : 0,
    };
    // Clean undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      if (editingId) {
        const originalCustomer = customers.find(c => c.id === editingId);
        const diffStr = generateDiff(originalCustomer, payload);
        const auditDetails = diffStr ? `${formData.fullName} (O'zgarishlar: ${diffStr})` : formData.fullName;
        const auditData = { storeId, userProfile, resource: 'customers', details: auditDetails };
        
        await editDoc(doc(db, `users/${storeId}/customers`, editingId), payload, auditData);
        addToast('Mijoz muvaffaqiyatli yangilandi', 'success');
      } else {
        const auditData = { storeId, userProfile, resource: 'customers', details: formData.fullName };
        await saveDoc(collection(db, `users/${storeId}/customers`), payload, auditData);
        addToast('Mijoz muvaffaqiyatli qo\'shildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (customer) => {
    if (!storeId) return;
    if (window.confirm('Haqiqatan ham bu mijozni o\'chirmoqchimisiz? (Arxivga tushadi)')) {
      try {
        const auditData = { storeId, userProfile, resource: 'customers', details: customer.fullName };
        await softDeleteDoc(doc(db, `users/${storeId}/customers`, customer.id), auditData);
        addToast('Mijoz arxivlandi', 'success');
      } catch (error) {
        addToast(error.message, 'error');
      }
    }
  };

  const openModal = (customer = null) => {
    setFormErrors({});
    if (customer) {
      setEditingId(customer.id);
      setFormData({ 
        fullName: customer.fullName, 
        phone: customer.phone, 
        birthDate: customer.birthDate || '', 
        gender: customer.gender || '', 
        note: customer.note || '', 
        currentDebt: customer.currentDebt || '',
        isVip: customer.isVip || false,
        bonusBalance: customer.bonusBalance !== undefined ? customer.bonusBalance : '',
        bonusPercent: customer.bonusPercent !== undefined ? customer.bonusPercent : ''
      });
    } else {
      setEditingId(null);
      setFormData({ fullName: '', phone: '+998', birthDate: '', gender: '', note: '', currentDebt: '', isVip: false, bonusBalance: '', bonusPercent: '' });
    }
    setIsModalOpen(true);
  };



  const cleanPhoneSearch = search.replace(/\s+/g, '').toLowerCase();
  const cleanNameSearch = search.trim().toLowerCase();
  const filteredCustomers = customers.filter(c => 
    c.status !== 'archived' && (
      (c?.fullName || '').toLowerCase().includes(cleanNameSearch) || 
      (c?.phone || '').includes(cleanPhoneSearch)
    )
  );

  // Summaries
  const totalCustomers = customers.filter(c => c.status !== 'archived').length;
  
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - (startOfThisWeek.getDay() === 0 ? 6 : startOfThisWeek.getDay() - 1));
  const newThisWeek = customers.filter(c => c.status !== 'archived' && c.createdAt && new Date(c.createdAt) >= startOfThisWeek).length;

  const inactiveLimitDate = new Date(now);
  inactiveLimitDate.setMonth(inactiveLimitDate.getMonth() - 3); // 3 oy
  const inactiveCustomers = customers.filter(c => c.status !== 'archived' && (!c.lastPurchaseDate || new Date(c.lastPurchaseDate) < inactiveLimitDate)).length;

  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const birthdays = customers.filter(c => c.status !== 'archived' && c.birthDate && c.birthDate.split('-')[1] === currentMonth).length;

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Barcha mijozlar</h1>
        <button className="btn btn-primary" onClick={() => openModal()}><UserPlus size={18} /> Yangi mijoz</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Jami mijozlar</div>
          <div className="h2" style={{ color: 'var(--primary)' }}>{totalCustomers} <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'normal' }}>mijozlar</span></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>O'tgan hafta</div>
          <div className="h2" style={{ color: 'var(--success)' }}>+{newThisWeek} <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'normal' }}>mijozlar</span></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Qaytib kelmaydiganlar</div>
          <div className="h2" style={{ color: 'var(--warning)' }}>{inactiveCustomers} <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'normal' }}>mijozlar</span></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tug'ilgan kunlar</div>
          <div className="h2" style={{ color: '#8B5CF6' }}>{birthdays} <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'normal' }}>mijozlar</span></div>
        </div>
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
          <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>F.I.O</th>
                  <th style={{ padding: '1rem' }}>Telefon</th>
                  <th style={{ padding: '1rem' }}>Umumiy xarid</th>
                  <th style={{ padding: '1rem' }}>Bonus</th>
                  <th style={{ padding: '1rem' }}>Qarzdorlik</th>
                  <th style={{ padding: '1rem' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Mijozlar topilmadi</td></tr>
                ) : filteredCustomers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      {c.fullName}
                      {c.isVip && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', backgroundColor: '#fbbf24', color: '#000', borderRadius: '1rem', fontWeight: 600 }}>VIP</span>}
                      {c.bonusPercent > 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '1rem', fontWeight: 600 }}>{c.bonusPercent}% Bonus</span>}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}><CurrencyDisplay amount={c.totalPurchases} /></td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}><CurrencyDisplay amount={c.bonusBalance} /></td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: c.currentDebt > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {c.currentDebt > 0 ? <CurrencyDisplay amount={c.currentDebt} /> : 'Yo\'q'}
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--primary)' }} onClick={() => openModal(c)}><Edit size={16} /></button>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(c)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {editingId && (
            <FormInput label={`Joriy qarz (${curr})`} type="number" value={formData.currentDebt} onChange={e => setFormData({...formData, currentDebt: e.target.value})} placeholder="0" />
          )}
          {editingId && (
            <FormInput label={`Bonus balansi (${curr})`} type="number" value={formData.bonusBalance} onChange={e => setFormData({...formData, bonusBalance: e.target.value})} placeholder="0" />
          )}
        </div>

        <FormInput label="Xarid bonusi foizi (%)" type="number" value={formData.bonusPercent} onChange={e => setFormData({...formData, bonusPercent: e.target.value})} placeholder="Masalan: 1" />

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
          <input type="checkbox" checked={formData.isVip} onChange={e => setFormData({...formData, isVip: e.target.checked})} style={{ transform: 'scale(1.2)' }} />
          <span style={{ fontWeight: 600, color: 'var(--warning)' }}>VIP mijoz (Yana qandaydir ustunliklar uchun ishlating)</span>
        </label>

        <FormInput label="Izoh" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
        </div>
      </Drawer>
    </div>
  );
};

export default Customers;
