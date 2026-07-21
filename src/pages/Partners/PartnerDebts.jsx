import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../Customers/Debts.css';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, writeBatch, increment } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
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
  const { confirm } = useConfirm();
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
    if (!(await confirm({ message: 'Haqiqatan ham bu qarzni bekor qilmoqchimisiz?', confirmStyle: 'danger' }))) return;
    
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

  const totalDebtors = filteredDebtors.length;
  const totalDebtAmount = filteredDebtors.reduce((acc, d) => acc + (d.currentPayable || 0), 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hamkor Qarzlari (Kreditorlik)</h1>
          <p className="page-subtitle">Sizning yetkazib beruvchilardan bo'lgan qarzlaringiz</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
            <Plus size={18} /> Qo'lda qarz qo'shish
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Qarzdorliklar soni</span>
          <span className="stat-card-value amber">{totalDebtors} ta hamkor</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Umumiy qarzingiz</span>
          <span className="stat-card-value red"><CurrencyDisplay amount={totalDebtAmount} /></span>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Kompaniya yoki mas'ul shaxs orqali qidirish..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="debts-table-wrapper">
          <div className="debts-table-header">
            <div>Hamkor Kompaniya</div>
            <div>Mas'ul shaxs / Telefon</div>
            <div>Umumiy qarz (Sizning qarzingiz)</div>
            <div style={{ textAlign: 'right' }}>Batafsil</div>
          </div>

          {filteredDebtors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
              Qarzdorlik yo'q
            </div>
          ) : filteredDebtors.map(partner => {
            const isExpanded = expandedId === partner.id;

            return (
              <React.Fragment key={partner.id}>
                <div 
                  className={`debts-table-row ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleExpand(partner.id)}
                >
                  <div className="debt-col-name">{partner.companyName}</div>
                  <div className="debt-col-phone">{partner.contactPerson} ({partner.phone})</div>
                  <div className="debt-col-amount"><CurrencyDisplay amount={partner.currentPayable} /></div>
                  <div className="debt-col-expand">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="partner-debts-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderBottom: '1px solid #E2E8F0' }}>
                        <h4 style={{ marginBottom: '12px', color: '#0F172A', fontWeight: 600, fontSize: 13 }}>Qarz yozuvlari:</h4>
                        {partnerDebtsData[partner.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {partnerDebtsData[partner.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').map(debt => (
                              <div key={debt.id} className="debt-item-card">
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', display: 'flex', gap: 6, alignItems: 'center' }}>
                                    Qoldiq: <span style={{ color: '#EF4B4B' }}><CurrencyDisplay amount={debt.remainingAmount} /></span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <span>Boshlang'ich: <CurrencyDisplay amount={debt.amount} /></span>
                                    <span>Muddat: {new Date(debt.dueDate).toLocaleDateString('uz-UZ')}</span>
                                  </div>
                                  {debt.note && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Izoh: {debt.note}</div>}
                                </div>

                                <div className="debt-item-actions">
                                  {getStatusBadge(debt.status, debt.dueDate)}
                                  <button className="btn btn-primary" onClick={() => openPaymentModal(debt, partner.id)} style={{ padding: '6px 12px', fontSize: 12 }}>To'lov qilish</button>
                                  {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                    <button className="action-btn delete" onClick={() => handleCancelDebt(debt, partner.id)} title="Qarzni bekor qilish">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Aktiv qarz yozuvlari mavjud emas</div>
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                Lekin hamkorning umumiy qarzdorlik balansi mavjud. Bu yerdan to'lov qilishingiz mumkin.
                              </div>
                            </div>
                            <button className="btn btn-outline" style={{ color: '#10B981', borderColor: '#10B981', padding: '6px 12px', fontSize: 12, alignSelf: 'flex-start' }} onClick={() => openLegacyPayModal(partner)}>
                              <Minus size={14} /> To'lov qilish
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
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
