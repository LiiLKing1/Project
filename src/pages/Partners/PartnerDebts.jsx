import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Search, ChevronDown, ChevronUp, Plus, Minus, CreditCard, Trash2, Calendar } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
const PartnerDebts = () => {
  const [allDebts, setAllDebts] = useState([]);
  const [partners, setPartners] = useState([]); 
  const [search, setSearch] = useState('');
  
  const [expandedId, setExpandedId] = useState(null);
  const [partnerDebtsData, setPartnerDebtsData] = useState({}); 
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newDebtData, setNewDebtData] = useState({ partnerId: '', amount: '', dueDate: '', note: '' });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({ debtId: null, partnerId: null, amount: '', maxAmount: 0 });

  const [isLegacyPayOpen, setIsLegacyPayOpen] = useState(false);
  const [legacyPartner, setLegacyPartner] = useState(null);
  const [legacyAmount, setLegacyAmount] = useState('');

  useEffect(() => {
    if (!storeId) return;
    const unsubDebts = onSnapshot(query(collection(db, `users/${storeId}/partnerDebts`)), (snapshot) => {
      setAllDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubAll = onSnapshot(query(collection(db, `users/${storeId}/partners`)), (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubDebts(); unsubAll(); };
  }, [storeId]);

  const debtors = React.useMemo(() => {
    const debtMap = {};
    allDebts.forEach(d => {
      if (d.status === 'active' || d.status === 'partially_paid') {
        if (!debtMap[d.partnerId]) debtMap[d.partnerId] = 0;
        debtMap[d.partnerId] += Number(d.remainingAmount || 0);
      }
    });

    // Merge with partners that might have currentPayable from legacy or manual additions
    partners.forEach(p => {
      if (p.currentPayable > 0 && !debtMap[p.id]) {
        debtMap[p.id] = p.currentPayable;
      }
    });

    return Object.keys(debtMap).map(partId => {
      const part = partners.find(p => p.id === partId) || {};
      return {
        id: partId,
        companyName: part.companyName || 'Noma\'lum hamkor',
        contactPerson: part.contactPerson || '',
        phone: part.phone || '',
        currentPayable: debtMap[partId]
      };
    }).filter(d => d.currentPayable > 0);
  }, [allDebts, partners]);

  const toggleExpand = async (partnerId) => {
    if (expandedId === partnerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(partnerId);
    
    const debts = allDebts.filter(d => d.partnerId === partnerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setPartnerDebtsData(prev => ({ ...prev, [partnerId]: debts }));
  };

  const handleAddDebt = async () => {
    if (!newDebtData.partnerId || !newDebtData.amount || !newDebtData.dueDate) {
      addToast('Hamkor, summa va muddat kiritilishi majburiy', 'warning');
      return;
    }

    try {
      const amount = Number(newDebtData.amount);
      const batch = writeBatch(db);
      
      const newDebtRef = doc(collection(db, `users/${storeId}/partnerDebts`));
      batch.set(newDebtRef, {
        partnerId: newDebtData.partnerId,
        amount: amount,
        remainingAmount: amount,
        dueDate: newDebtData.dueDate,
        note: newDebtData.note,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });
      
      const partRef = doc(db, `users/${storeId}/partners`, newDebtData.partnerId);
      batch.update(partRef, {
        currentPayable: increment(amount)
      });
      
      await batch.commit();
      
      addToast('Qarz qo\'shildi', 'success');
      setIsDrawerOpen(false);
      setNewDebtData({ partnerId: '', amount: '', dueDate: '', note: '' });
      if (expandedId === newDebtData.partnerId) {
        toggleExpand(newDebtData.partnerId);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openPaymentModal = (debt, partnerId) => {
    setPaymentData({
      debtId: debt.id,
      partnerId: partnerId,
      amount: debt.remainingAmount,
      maxAmount: debt.remainingAmount
    });
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = async () => {
    const payAmount = Number(paymentData.amount);
    if (!payAmount || payAmount <= 0 || payAmount > paymentData.maxAmount) {
      addToast('Noto\'g\'ri summa kiritildi', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const debtRef = doc(db, `users/${storeId}/partnerDebts`, paymentData.debtId);
      const partRef = doc(db, `users/${storeId}/partners`, paymentData.partnerId);
      
      const newRemaining = paymentData.maxAmount - payAmount;
      const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';
      
      batch.update(debtRef, { remainingAmount: newRemaining, status: newStatus });
      batch.update(partRef, { currentPayable: increment(-payAmount) });
      
      const paymentRef = doc(collection(db, `users/${storeId}/partnerDebts/${paymentData.debtId}/payments`));
      batch.set(paymentRef, {
        amount: payAmount,
        date: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });

      const expenseRef = doc(collection(db, `users/${storeId}/expenses`));
      batch.set(expenseRef, {
        category: 'Hamkorga to\'lov',
        amount: payAmount,
        note: `Hamkor qarzi uchun to'lov`,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });
      
      await batch.commit();
      
      addToast('To\'lov qabul qilindi', 'success');
      setIsPaymentModalOpen(false);
      toggleExpand(paymentData.partnerId); 
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelDebt = async (debt, partnerId) => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
      addToast('Bu amalni bajarish uchun huquqingiz yo\'q', 'error');
      return;
    }
    
    if (!window.confirm('Haqiqatan ham bu qarzni bekor qilmoqchimisiz?')) return;
    
    try {
      const batch = writeBatch(db);
      const debtRef = doc(db, `users/${storeId}/partnerDebts`, debt.id);
      const partRef = doc(db, `users/${storeId}/partners`, partnerId);
      
      batch.update(debtRef, { status: 'cancelled' });
      batch.update(partRef, { currentPayable: increment(-debt.remainingAmount) });
      
      await batch.commit();
      
      addToast('Qarz bekor qilindi', 'info');
      toggleExpand(partnerId);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openLegacyPayModal = (partner) => {
    setLegacyPartner(partner);
    setLegacyAmount('');
    setIsLegacyPayOpen(true);
  };

  const handleLegacyAction = async () => {
    const amount = Number(legacyAmount);
    if (!amount || amount <= 0) {
      addToast('Noto\'g\'ri summa kiritildi', 'error');
      return;
    }
    if (amount > legacyPartner.currentPayable) {
      addToast('To\'lov summasi qarzdan oshib ketmasligi kerak', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const partRef = doc(db, `users/${storeId}/partners`, legacyPartner.id);
      
      const newDebtRef = doc(collection(db, `users/${storeId}/partnerDebts`));
      batch.set(newDebtRef, {
        partnerId: legacyPartner.id,
        type: 'legacy_payment',
        amount: amount,
        date: new Date().toISOString(),
        note: 'Qo\'lda qarzni kamaytirish',
        createdBy: userProfile?.name || 'Admin'
      });
      batch.update(partRef, { currentPayable: increment(-amount) });

      const expenseRef = doc(collection(db, `users/${storeId}/expenses`));
      batch.set(expenseRef, {
        category: 'Hamkorga to\'lov',
        amount: amount,
        note: `Hamkor umumiy qarzi uchun to'lov`,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });

      await batch.commit();
      addToast('To\'lov muvaffaqiyatli bajarildi', 'success');
      setIsLegacyPayOpen(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getStatusBadge = (status, dueDate) => {
    if (status === 'cancelled') return <span className="badge" style={{ backgroundColor: 'var(--text-secondary)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Bekor qilingan</span>;
    if (status === 'paid') return <span className="badge" style={{ backgroundColor: 'var(--success)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Yopilgan</span>;
    
    const isOverdue = new Date(dueDate) < new Date();
    if (isOverdue) return <span className="badge" style={{ backgroundColor: 'var(--danger)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Muddati o'tgan</span>;
    return <span className="badge" style={{ backgroundColor: 'var(--warning)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Faol</span>;
  };

  const filteredDebtors = debtors.filter(d => d.companyName?.toLowerCase().includes(search.toLowerCase()) || d.contactPerson?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Hamkor Qarzlari (Kreditorlik)</h1>
        <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
          <Plus size={18} /> Qo'lda qarz qo'shish
        </button>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Kompaniya yoki mas'ul shaxs orqali qidirish..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Hamkor Kompaniya</th>
                <th style={{ padding: '1rem' }}>Mas'ul shaxs / Telefon</th>
                <th style={{ padding: '1rem' }}>Umumiy qarz (Sizning qarzingiz)</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Qarzdorlik yo'q</td></tr>
              ) : filteredDebtors.map(partner => (
                <React.Fragment key={partner.id}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: expandedId === partner.id ? 'var(--bg-main)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleExpand(partner.id)}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{partner.companyName}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{partner.contactPerson} ({partner.phone})</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--danger)' }}><CurrencyDisplay amount={partner.currentPayable} /></td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {expandedId === partner.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </td>
                  </tr>
                  {expandedId === partner.id && (
                    <tr>
                      <td colSpan="4" style={{ padding: 0 }}>
                        <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderBottom: '2px solid var(--primary)' }}>
                          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Qarz yozuvlari:</h4>
                          {partnerDebtsData[partner.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').length > 0 ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                              {partnerDebtsData[partner.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').map(debt => (
                                <div key={debt.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', gap: '0.25rem' }}>Qoldiq: <CurrencyDisplay amount={debt.remainingAmount} /></div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                                      Boshlang'ich summa: <CurrencyDisplay amount={debt.amount} /> | Muddat: {new Date(debt.dueDate).toLocaleDateString()}
                                    </div>
                                    {debt.note && <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Izoh: {debt.note}</div>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {getStatusBadge(debt.status, debt.dueDate)}
                                    <button className="btn btn-success" onClick={() => openPaymentModal(debt, partner.id)} style={{ padding: '0.5rem 1rem' }}>To'lov qilish</button>
                                    {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                      <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => handleCancelDebt(debt, partner.id)} title="Qarzni bekor qilish">
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                              <div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Aktiv qarz yozuvlari mavjud emas</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                  Lekin hamkorning umumiy qarzdorlik balansi mavjud. Bu yerdan to'lov qilishingiz mumkin.
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-success" onClick={() => openLegacyPayModal(partner)}><Minus size={18} /> To'lov qilish</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <Drawer position="right" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Qo'lda qarz yozish">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Hamkorni tanlang</label>
            <CustomSelect 
              value={newDebtData.partnerId} 
              onChange={v => setNewDebtData({...newDebtData, partnerId: v})}
              options={[
                {value: '', label: '-- Tanlang --'},
                ...partners.map(c => ({value: c.id, label: `${c.companyName} (${c.contactPerson})`}))
              ]}
            />
          </div>
          
          <FormInput label={`Qarz summasi (${curr})`} type="number" value={newDebtData.amount} onChange={e => setNewDebtData({...newDebtData, amount: e.target.value})} placeholder="0" required />
          <FormInput label="To'lov muddati" type="date" value={newDebtData.dueDate} onChange={e => setNewDebtData({...newDebtData, dueDate: e.target.value})} required />
          <FormInput label="Izoh (ixtiyoriy)" value={newDebtData.note} onChange={e => setNewDebtData({...newDebtData, note: e.target.value})} placeholder="Masalan: Maxsus xizmat uchun" />
          
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddDebt}>Saqlash</button>
          </div>
        </div>
      </Drawer>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="To'lov qilish">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Joriy Qarz</div>
            <div className="h2" style={{ color: 'var(--danger)', display: 'flex', justifyContent: 'center' }}><CurrencyDisplay amount={paymentData.maxAmount} /></div>
          </div>
          <FormInput 
            label={`To'lanayotgan summa (${curr})`} 
            type="number" 
            value={paymentData.amount} 
            onChange={e => setPaymentData({...paymentData, amount: e.target.value})}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsPaymentModalOpen(false)}>Bekor qilish</button>
            <button className="btn btn-success" onClick={handleProcessPayment}><CreditCard size={18} /> Tasdiqlash</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isLegacyPayOpen} onClose={() => setIsLegacyPayOpen(false)} title="Umumiy qarzdan kamaytirish">
        {legacyPartner && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
              Joriy qarz: <CurrencyDisplay amount={legacyPartner.currentPayable} />
            </div>
            <FormInput label={`To'lov summasi (${curr})`} type="number" value={legacyAmount} onChange={e => setLegacyAmount(e.target.value)} placeholder="0" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsLegacyPayOpen(false)}>Bekor qilish</button>
              <button className="btn btn-success" onClick={handleLegacyAction}><Minus size={18} /> To'lov qilish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PartnerDebts;
