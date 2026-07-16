import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDocs, writeBatch, increment, orderBy } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Search, ChevronDown, ChevronUp, Plus, Minus, CreditCard, Trash2, Calendar } from 'lucide-react';

const Debts = () => {
  const [allDebts, setAllDebts] = useState([]);
  const [customers, setCustomers] = useState([]); // All customers for new debt dropdown
  const [search, setSearch] = useState('');
  
  // Expanded customer state
  const [expandedId, setExpandedId] = useState(null);
  const [customerDebts, setCustomerDebts] = useState({}); // { customerId: [debts] }
  
  const { addToast } = useToast();
  const { userProfile, hasPermission } = useRoles();
  const { settings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  // New Debt Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newDebtData, setNewDebtData] = useState({ customerId: '', amount: '', dueDate: '', note: '' });

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({ debtId: null, customerId: null, amount: '', maxAmount: 0 });

  // Legacy Debt Modals
  const [isLegacyAddOpen, setIsLegacyAddOpen] = useState(false);
  const [isLegacyPayOpen, setIsLegacyPayOpen] = useState(false);
  const [legacyCustomer, setLegacyCustomer] = useState(null);
  const [legacyAmount, setLegacyAmount] = useState('');

  // Load all debts and customers
  useEffect(() => {
    if (!storeId) return;
    const unsubDebts = onSnapshot(query(collection(db, `users/${storeId}/customerDebts`)), (snapshot) => {
      setAllDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubAll = onSnapshot(query(collection(db, `users/${storeId}/customers`)), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubDebts(); unsubAll(); };
  }, [storeId]);

  const debtors = React.useMemo(() => {
    const debtMap = {};
    allDebts.forEach(d => {
      if (d.status === 'active' || d.status === 'partial') {
        if (!debtMap[d.customerId]) debtMap[d.customerId] = 0;
        debtMap[d.customerId] += Number(d.remainingAmount || 0);
      }
    });

    return Object.keys(debtMap).map(custId => {
      const cust = customers.find(c => c.id === custId) || {};
      return {
        id: custId,
        fullName: cust.fullName || 'Noma\'lum mijoz',
        phone: cust.phone || '',
        currentDebt: debtMap[custId]
      };
    }).filter(d => d.currentDebt > 0);
  }, [allDebts, customers]);

  const toggleExpand = async (customerId) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    
    // Fetch debts for this customer from memory
    const debts = allDebts.filter(d => d.customerId === customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setCustomerDebts(prev => ({ ...prev, [customerId]: debts }));
  };

  const handleAddDebt = async () => {
    if (!newDebtData.customerId || !newDebtData.amount || !newDebtData.dueDate) {
      addToast('Mijoz, summa va muddat kiritilishi majburiy', 'warning');
      return;
    }

    try {
      const amount = Number(newDebtData.amount);
      const batch = writeBatch(db);
      
      const newDebtRef = doc(collection(db, `users/${storeId}/customerDebts`));
      batch.set(newDebtRef, {
        customerId: newDebtData.customerId,
        amount: amount,
        remainingAmount: amount,
        dueDate: newDebtData.dueDate,
        note: newDebtData.note,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });
      
      const custRef = doc(db, `users/${storeId}/customers`, newDebtData.customerId);
      batch.update(custRef, {
        currentDebt: increment(amount)
      });
      
      await batch.commit();
      
      addToast('Qarz qo\'shildi', 'success');
      setIsDrawerOpen(false);
      setNewDebtData({ customerId: '', amount: '', dueDate: '', note: '' });
      if (expandedId === newDebtData.customerId) {
        toggleExpand(newDebtData.customerId); // refresh
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openPaymentModal = (debt, customerId) => {
    setPaymentData({
      debtId: debt.id,
      customerId: customerId,
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
      const debtRef = doc(db, `users/${storeId}/customerDebts`, paymentData.debtId);
      const custRef = doc(db, `users/${storeId}/customers`, paymentData.customerId);
      
      const newRemaining = paymentData.maxAmount - payAmount;
      const newStatus = newRemaining <= 0 ? 'paid' : 'partially_paid';
      
      batch.update(debtRef, { remainingAmount: newRemaining, status: newStatus });
      batch.update(custRef, { currentDebt: increment(-payAmount) });
      
      const paymentRef = doc(collection(db, `users/${storeId}/customerDebts/${paymentData.debtId}/payments`));
      batch.set(paymentRef, {
        amount: payAmount,
        date: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });
      
      await batch.commit();
      
      addToast('To\'lov qabul qilindi', 'success');
      setIsPaymentModalOpen(false);
      toggleExpand(paymentData.customerId); // refresh
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelDebt = async (debt, customerId) => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
      addToast('Bu amalni bajarish uchun huquqingiz yo\'q', 'error');
      return;
    }
    
    if (!window.confirm('Haqiqatan ham bu qarzni bekor qilmoqchimisiz?')) return;
    
    try {
      const batch = writeBatch(db);
      const debtRef = doc(db, `users/${storeId}/customerDebts`, debt.id);
      const custRef = doc(db, `users/${storeId}/customers`, customerId);
      
      batch.update(debtRef, { status: 'cancelled' });
      batch.update(custRef, { currentDebt: increment(-debt.remainingAmount) });
      
      await batch.commit();
      
      addToast('Qarz bekor qilindi', 'info');
      toggleExpand(customerId);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openLegacyAddModal = (customer) => {
    setLegacyCustomer(customer);
    setLegacyAmount('');
    setIsLegacyAddOpen(true);
  };

  const openLegacyPayModal = (customer) => {
    setLegacyCustomer(customer);
    setLegacyAmount('');
    setIsLegacyPayOpen(true);
  };

  const handleLegacyAction = async (type) => {
    const amount = Number(legacyAmount);
    if (!amount || amount <= 0) {
      addToast('Noto\'g\'ri summa kiritildi', 'error');
      return;
    }
    if (type === 'pay' && amount > legacyCustomer.currentDebt) {
      addToast('To\'lov summasi qarzdan oshib ketmasligi kerak', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const custRef = doc(db, `users/${storeId}/customers`, legacyCustomer.id);
      
      // For legacy, we just add a generic record and adjust balance
      const newDebtRef = doc(collection(db, `users/${storeId}/customerDebts`));
      if (type === 'add') {
        batch.set(newDebtRef, {
          customerId: legacyCustomer.id,
          amount: amount,
          remainingAmount: amount,
          dueDate: new Date().toISOString(), // immediate
          note: 'Qo\'lda qo\'shilgan qarz',
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });
        batch.update(custRef, { currentDebt: increment(amount) });
      } else {
        batch.set(newDebtRef, {
          customerId: legacyCustomer.id,
          type: 'legacy_payment',
          amount: amount,
          date: new Date().toISOString(),
          note: 'Qo\'lda qarzni kamaytirish',
          createdBy: userProfile?.name || 'Admin'
        });
        batch.update(custRef, { currentDebt: increment(-amount) });
      }

      await batch.commit();
      addToast('Amal muvaffaqiyatli bajarildi', 'success');
      setIsLegacyAddOpen(false);
      setIsLegacyPayOpen(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleClearLegacyDebt = async (customer) => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
      addToast('Bu amalni bajarish uchun huquqingiz yo\'q', 'error');
      return;
    }
    
    if (!window.confirm('Haqiqatan ham bu mijozning UMUMIY qarzini to\'liq o\'chirmoqchimisiz?')) return;
    
    try {
      const batch = writeBatch(db);
      const custRef = doc(db, `users/${storeId}/customers`, customer.id);
      
      batch.update(custRef, { currentDebt: 0 });
      await batch.commit();
      
      addToast('Mijoz qarzi to\'liq o\'chirildi', 'info');
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

  const filteredDebtors = debtors.filter(d => d.fullName?.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search));

  // Calc Stats
  const totalDebtSum = debtors.reduce((acc, d) => acc + Number(d.currentDebt || 0), 0);
  const totalPaymentsSum = 0; // In a full implementation, you'd calculate this from all payments
  const totalDebtorsCount = debtors.length;

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={() => window.history.back()}>← Orqaga</button>
        <h1 className="h1" style={{ margin: 0 }}>Qarzlar ro'yxati</h1>
      </div>

      <div className="flex-between">
        <h2 className="h2">Mijozlar Qarzlari</h2>
        <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
          <Plus size={18} /> Qarz qo'shish
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
        {/* Left: Main Table */}
        <div className="glass-panel flex-col" style={{ flex: 2, minWidth: '60%', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Ism yoki telefon orqali qidirish..." 
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
                <th style={{ padding: '1rem' }}>F.I.O</th>
                <th style={{ padding: '1rem' }}>Telefon</th>
                <th style={{ padding: '1rem' }}>Umumiy qarz summasi</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebtors.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Qarzdorlar yo'q</td></tr>
              ) : filteredDebtors.map(customer => (
                <React.Fragment key={customer.id}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: expandedId === customer.id ? 'var(--bg-main)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleExpand(customer.id)}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{customer.fullName}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{customer.phone}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--danger)' }}><CurrencyDisplay amount={customer.currentDebt} /></td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {expandedId === customer.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </td>
                  </tr>
                  {expandedId === customer.id && (
                    <tr>
                      <td colSpan="4" style={{ padding: 0 }}>
                        <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderBottom: '2px solid var(--primary)' }}>
                          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Qarz yozuvlari:</h4>
                          {customerDebts[customer.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').length > 0 ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                              {customerDebts[customer.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').map(debt => (
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
                                    <button className="btn btn-success" onClick={() => openPaymentModal(debt, customer.id)} style={{ padding: '0.5rem 1rem' }}>To'lov qabul qilish</button>
                                    {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                      <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => handleCancelDebt(debt, customer.id)} title="Qarzni bekor qilish">
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
                                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Qarz yozuvlari mavjud emas</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                  Mijozning umumiy qarzi mavjud. Bu yerdan qarzni boshqarishingiz mumkin.
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-success" onClick={() => openLegacyPayModal(customer)}><Minus size={18} /> Qarzni to'lash</button>
                                <button className="btn btn-primary" onClick={() => openLegacyAddModal(customer)}><Plus size={18} /> Qarz qo'shish</button>
                                {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                  <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={() => handleClearLegacyDebt(customer)} title="To'liq o'chirish">
                                    <Trash2 size={18} />
                                  </button>
                                )}
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
        
        {/* Right: Stats Panel */}
        <div style={{ flex: 1, minWidth: '300px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between' }} onClick={() => alert('Ommaviy to\'lov tez orada qo\'shiladi')}>
            <span><CreditCard size={18} style={{ display: 'inline', marginRight: '0.5rem' }}/> Ommaviy to'lov</span>
            <span>→</span>
          </button>
          
          <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', backgroundColor: '#3B82F6' }} onClick={() => alert('SMS-tarqatish tez orada qo\'shiladi')}>
            <span>💬 Qarzdorlarga SMS-tarqatish</span>
            <span>→</span>
          </button>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Qarzlar summasi</div>
            <div className="h2" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}><CurrencyDisplay amount={totalDebtSum} /></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>To'lovlar summasi</span>
              <span style={{ color: 'var(--success)' }}><CurrencyDisplay amount={totalPaymentsSum} /></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tizimli to'lovlar</span>
              <span><CurrencyDisplay amount={0} /></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              <span>Qarzlar qoldig'i</span>
              <span style={{ color: 'var(--danger)' }}><CurrencyDisplay amount={totalDebtSum} /></span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Qarzdorlar soni</div>
            <div className="h2" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {totalDebtorsCount} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>mijozlar</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>To'langanlar</span>
              <span style={{ color: 'var(--success)' }}>0 qarzlar</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>To'lanmaganlar</span>
              <span style={{ color: 'var(--danger)' }}>{totalDebtorsCount} qarzlar</span>
            </div>
          </div>
        </div>
      </div>

      <Drawer position="right" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Yangi qarz qo'shish">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mijozni tanlang</label>
            <select 
              value={newDebtData.customerId} 
              onChange={e => setNewDebtData({...newDebtData, customerId: e.target.value})}
              style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="">-- Tanlang --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}
            </select>
          </div>
          
          <FormInput label={`Qarz summasi (${curr})`} type="number" value={newDebtData.amount} onChange={e => setNewDebtData({...newDebtData, amount: e.target.value})} placeholder="0" required />
          <FormInput label="To'lov muddati" type="date" value={newDebtData.dueDate} onChange={e => setNewDebtData({...newDebtData, dueDate: e.target.value})} required />
          <FormInput label="Izoh (ixtiyoriy)" value={newDebtData.note} onChange={e => setNewDebtData({...newDebtData, note: e.target.value})} placeholder="Masalan: Televizor uchun nasiya" />
          
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddDebt}>Saqlash</button>
          </div>
        </div>
      </Drawer>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="To'lov qabul qilish">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Joriy Qarz</div>
            <div className="h2" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}><CurrencyDisplay amount={paymentData.maxAmount} /></div>
          </div>
          <FormInput 
            label={`Qabul qilinayotgan summa (${curr})`} 
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

      <Modal isOpen={isLegacyAddOpen} onClose={() => setIsLegacyAddOpen(false)} title="Qarz qo'shish (Eski usul)">
        {legacyCustomer && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <FormInput label={`Qo'shiladigan summa (${curr})`} type="number" value={legacyAmount} onChange={e => setLegacyAmount(e.target.value)} placeholder="0" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsLegacyAddOpen(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={() => handleLegacyAction('add')}><Plus size={18} /> Qo'shish</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isLegacyPayOpen} onClose={() => setIsLegacyPayOpen(false)} title="Qarzni kamaytirish">
        {legacyCustomer && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
              Joriy qarz: <CurrencyDisplay amount={legacyCustomer.currentDebt} />
            </div>
            <FormInput label={`To'lov summasi (${curr})`} type="number" value={legacyAmount} onChange={e => setLegacyAmount(e.target.value)} placeholder="0" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsLegacyPayOpen(false)}>Bekor qilish</button>
              <button className="btn btn-success" onClick={() => handleLegacyAction('pay')}><Minus size={18} /> Kamaytirish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Debts;
