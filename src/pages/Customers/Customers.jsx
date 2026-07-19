import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2, CreditCard } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { saveDoc, editDoc, softDeleteDoc, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
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
  const { confirm } = useConfirm();
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
    if (await confirm({ message: 'Haqiqatan ham bu mijozni o\'chirmoqchimisiz? (Arxivga tushadi)', confirmStyle: 'danger' })) {
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
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mijozlar</h1>
          <p className="page-subtitle">{totalCustomers} ta faol mijoz</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <UserPlus size={18} /> Yangi mijoz
        </button>
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Jami mijozlar</span>
          <span className="stat-card-value blue">{totalCustomers}</span>
          <span className="stat-card-sub">Faol ro'yxat</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Bu hafta yangi</span>
          <span className="stat-card-value green">+{newThisWeek}</span>
          <span className="stat-card-sub">Yangi qo'shilgan</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Faol emas</span>
          <span className="stat-card-value amber">{inactiveCustomers}</span>
          <span className="stat-card-sub">3 oydan ko'p</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Tug'ilgan kunlar</span>
          <span className="stat-card-value" style={{ color: '#8B5CF6' }}>{birthdays}</span>
          <span className="stat-card-sub">Bu oyda</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="page-card">
        <div className="page-card-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Ism yoki telefon raqam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="page-table">
            <thead>
              <tr>
                <th>F.I.O</th>
                <th>Telefon</th>
                <th>Jami xarid</th>
                <th>Bonus</th>
                <th>Qarz</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Mijozlar topilmadi
                  </td>
                </tr>
              ) : filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A2538' }}>
                      {c.fullName}
                      {c.isVip && <span className="badge badge-amber" style={{ marginLeft: 6 }}>VIP</span>}
                      {c.bonusPercent > 0 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>{c.bonusPercent}% Bonus</span>}
                    </div>
                  </td>
                  <td style={{ color: '#8A9BB5', fontFamily: 'monospace', fontSize: 13 }}>{c.phone}</td>
                  <td style={{ fontWeight: 600 }}><CurrencyDisplay amount={c.totalPurchases} /></td>
                  <td style={{ fontWeight: 600, color: '#4A90E2' }}><CurrencyDisplay amount={c.bonusBalance} /></td>
                  <td>
                    {c.currentDebt > 0
                      ? <span style={{ fontWeight: 700, color: '#EF4B4B' }}><CurrencyDisplay amount={c.currentDebt} /></span>
                      : <span className="badge badge-green">Yo'q</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" onClick={() => openModal(c)} title="Tahrirlash"><Edit size={14}/></button>
                      <button className="action-btn delete" onClick={() => handleDelete(c)} title="O'chirish"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <Drawer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Mijozni tahrirlash' : 'Yangi mijoz'}>
        <FormInput label="F.I.O" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} error={formErrors.fullName} required />
        <FormInput label="Telefon raqami" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} error={formErrors.phone} required placeholder="+998901234567" />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Tug'ilgan sana" type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A2538' }}>Jinsi</label>
            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
              style={{ padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #DCE8F5', backgroundColor: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">Tanlang</option>
              <option value="erkak">Erkak</option>
              <option value="ayol">Ayol</option>
            </select>
          </div>
        </div>

        {editingId && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label={`Joriy qarz (${curr})`} type="number" value={formData.currentDebt} onChange={e => setFormData({...formData, currentDebt: e.target.value})} placeholder="0" />
            <FormInput label={`Bonus balansi (${curr})`} type="number" value={formData.bonusBalance} onChange={e => setFormData({...formData, bonusBalance: e.target.value})} placeholder="0" />
          </div>
        )}

        <FormInput label="Xarid bonusi foizi (%)" type="number" value={formData.bonusPercent} onChange={e => setFormData({...formData, bonusPercent: e.target.value})} placeholder="Masalan: 1" />

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 14px', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1.5px solid #FEF3C7', marginBottom: 14 }}>
          <input type="checkbox" checked={formData.isVip} onChange={e => setFormData({...formData, isVip: e.target.checked})} style={{ transform: 'scale(1.2)', accentColor: '#F59E0B' }} />
          <span style={{ fontWeight: 600, color: '#D97706', fontSize: 14 }}>⭐ VIP mijoz</span>
        </label>

        <FormInput label="Izoh" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Saqlash</button>
        </div>
      </Drawer>
    </div>
  );
};

export default Customers;

