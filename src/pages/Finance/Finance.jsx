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
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Moliyalashtirish</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={18} /> Xarajat qo'shish</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-lg)' }}><ArrowDownRight size={24} /></div>
              <div>
                <div className="subtitle">Jami Xarajatlar (Tanlangan davr)</div>
                <div className="h2"><CurrencyDisplay amount={totalExpenses} /></div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-lg)' }}><Wallet size={24} /></div>
              <div>
                <div className="subtitle">Hamkorlarga jami kreditorlik qarz</div>
                <div className="h2" style={{ color: 'var(--warning)' }}><CurrencyDisplay amount={totalPartnerDebt} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel flex-col" style={{ height: '100%' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={20} color="var(--primary)" />
            <h2 className="h2">Xarajatlar tarixi</h2>
          </div>
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Sana</th>
                  <th style={{ padding: '1rem' }}>Kategoriya</th>
                  <th style={{ padding: '1rem' }}>Izoh</th>
                  <th style={{ padding: '1rem' }}>Summa</th>
                  <th style={{ padding: '1rem' }}>Xodim</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Xarajatlar mavjud emas</td></tr>
                ) : expenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{e.date}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{categories.find(c => c.id === e.category)?.name || e.category}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{e.note || '-'}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--danger)' }}><CurrencyDisplay amount={e.amount} /></td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{e.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          </div>
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
