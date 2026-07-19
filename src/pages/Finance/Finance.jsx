import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { saveDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import CustomSelect from '../../components/CustomSelect';

const Finance = () => {
  const [expenses, setExpenses] = useState([]);
  const [partnerDebts, setPartnerDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category: 'ijara', amount: '', note: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/expenses`), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });
    
    const unsubDebts = onSnapshot(collection(db, `users/${storeId}/partnerDebts`), (snapshot) => {
      setPartnerDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubDebts(); };
  }, [addToast, storeId]);

  const handleSave = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      addToast('Noto\'g\'ri summa', 'error');
      return;
    }
    if (!storeId) return;

    try {
      await saveDoc(collection(db, `users/${storeId}/expenses`), {
        ...formData,
        amount: Number(formData.amount),
        createdBy: userProfile?.name || 'Admin',
      });
      addToast('Xarajat muvaffaqiyatli qo\'shildi', 'success');
      setIsModalOpen(false);
      setFormData({ category: 'ijara', amount: '', note: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      addToast(error.message, 'error');
    }
  };



  const categories = [
    { id: 'ijara', name: 'Ijara to\'lovi' },
    { id: 'kommunal', name: 'Kommunal to\'lovlar' },
    { id: 'ish_haqi', name: 'Ish haqi' },
    { id: 'taminot', name: 'Ta\'minotchiga to\'lov' },
    { id: 'boshqa', name: 'Boshqa xarajatlar' }
  ];

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalPartnerDebt = partnerDebts.reduce((acc, curr) => {
    if (curr.status === 'active' || curr.status === 'partial' || curr.status === 'partially_paid') {
      return acc + Number(curr.remainingAmount || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Moliyalashtirish</h1>
          <p className="page-subtitle">Kompaniyaning xarajatlari va qarzdorlik holati</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Xarajat qo'shish
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Jami Xarajatlar (Tanlangan davr)</span>
          <span className="stat-card-value red"><CurrencyDisplay amount={totalExpenses} /></span>
          <span className="stat-card-sub">Chiqimlar jami</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Hamkorlarga jami kreditorlik qarz</span>
          <span className="stat-card-value amber"><CurrencyDisplay amount={totalPartnerDebt} /></span>
          <span className="stat-card-sub">To'lanishi kerak bo'lgan summa</span>
        </div>
      </div>

      <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-card-header" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={20} color="#4A90E2" />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A2538', margin: 0 }}>Xarajatlar tarixi</h2>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="page-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Sana</th>
                <th>Kategoriya</th>
                <th>Izoh</th>
                <th>Summa</th>
                <th>Xodim</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Xarajatlar mavjud emas
                  </td>
                </tr>
              ) : expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ color: '#8A9BB5', fontSize: 14 }}>{e.date}</td>
                  <td style={{ fontWeight: 600, color: '#1A2538' }}>{categories.find(c => c.id === e.category)?.name || e.category}</td>
                  <td style={{ color: '#8A9BB5' }}>{e.note || '-'}</td>
                  <td style={{ fontWeight: 700, color: '#EF4B4B' }}><CurrencyDisplay amount={e.amount} /></td>
                  <td style={{ color: '#8A9BB5', fontSize: 13 }}>{e.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yangi xarajat qo'shish">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kategoriya</label>
            <CustomSelect 
              value={formData.category} 
              onChange={v => setFormData({...formData, category: v})}
              options={categories.map(c => ({value: c.id, label: c.name}))}
            />
          </div>
          <FormInput label="Sana" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        </div>
        
        <FormInput label={`Summa (${curr})`} type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required placeholder="Masalan: 500000" />
        <FormInput label="Izoh" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}><Check size={18} /> Saqlash</button>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
