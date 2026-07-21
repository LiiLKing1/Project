import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Debts.css';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDocs, writeBatch, increment, orderBy, serverTimestamp } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { formatCurrency } from '../../utils/formatters';
import { Search, ChevronDown, ChevronUp, Plus, Minus, CreditCard, Trash2, Calendar, Zap, CheckSquare, MessageSquare } from 'lucide-react';

const Debts = () => {
  const [allDebts, setAllDebts] = useState([]);
  const [customers, setCustomers] = useState([]); // All customers for new debt dropdown
  const [search, setSearch] = useState('');
  
  // Actions bounce menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef(null);
  
  // Expanded customer state
  const [expandedId, setExpandedId] = useState(null);
  const [customerDebts, setCustomerDebts] = useState({}); // { customerId: [debts] }
  
  const { addToast } = useToast();
  const { userProfile, hasPermission } = useRoles();
  const { settings } = useSettings();
  const { confirm } = useConfirm();
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

  // Quick Close Modal
  const [isQuickCloseOpen, setIsQuickCloseOpen] = useState(false);
  const [quickCloseData, setQuickCloseData] = useState({ customerId: '', amount: '' });

  // Bulk Payment Modal (Multi-select)
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [bulkSelections, setBulkSelections] = useState({}); // { [customerId]: amount }

  // Pay All Debts Modal
  const [isPayAllOpen, setIsPayAllOpen] = useState(false);
  const [payAllCustomer, setPayAllCustomer] = useState(null);
  const [payAllAmount, setPayAllAmount] = useState('');

  // SMS Modal
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsData, setSmsData] = useState({ message: '' });

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

  // Click outside for actions menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

  const debtors = React.useMemo(() => {
    const debtMap = {};
    allDebts.forEach(d => {
      if (d.status === 'active' || d.status === 'partial' || d.status === 'partially_paid') {
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

  const openPayAllModal = (customer) => {
    setPayAllCustomer(customer);
    setPayAllAmount('');
    setIsPayAllOpen(true);
  };

  // Distribute payment across debts oldest-first
  const getPayAllDistribution = () => {
    if (!payAllCustomer) return [];
    const activeDebts = (customerDebts[payAllCustomer.id] || [])
      .filter(d => d.status !== 'cancelled' && d.status !== 'paid')
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    let remaining = Number(payAllAmount) || 0;
    return activeDebts.map(debt => {
      const paying = Math.min(remaining, debt.remainingAmount);
      remaining = Math.max(0, remaining - paying);
      return { ...debt, paying, newRemaining: debt.remainingAmount - paying };
    });
  };

  const handleProcessPayAll = async () => {
    if (!payAllCustomer || !storeId) return;
    const payAmount = Number(payAllAmount);
    if (!payAmount || payAmount <= 0) {
      addToast('To\'g\'ri summa kiriting', 'error');
      return;
    }
    const distribution = getPayAllDistribution();
    const totalDebt = distribution.reduce((s, d) => s + d.remainingAmount, 0);
    if (payAmount > totalDebt) {
      addToast('Kiritilgan summa umumiy qarzdan ko\'proq', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const custRef = doc(db, `users/${storeId}/customers`, payAllCustomer.id);
      let actualPaid = 0;

      for (const debt of distribution) {
        if (debt.paying <= 0) continue;
        const debtRef = doc(db, `users/${storeId}/customerDebts`, debt.id);
        const newStatus = debt.newRemaining <= 0 ? 'paid' : 'partially_paid';
        batch.update(debtRef, { remainingAmount: debt.newRemaining, status: newStatus });

        const paymentRef = doc(collection(db, `users/${storeId}/customerDebts/${debt.id}/payments`));
        batch.set(paymentRef, {
          amount: debt.paying,
          date: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });

        const cashFlowRef = doc(collection(db, `users/${storeId}/cashFlow`));
        batch.set(cashFlowRef, {
          type: 'income',
          source: 'debt_payment',
          amount: debt.paying,
          customerId: payAllCustomer.id,
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });

        actualPaid += debt.paying;
      }

      batch.update(custRef, { currentDebt: increment(-actualPaid) });
      await batch.commit();

      addToast(`${formatCurrency(actualPaid, curr)} miqdorida to'lov qabul qilindi!`, 'success');
      setIsPayAllOpen(false);
      setPayAllCustomer(null);
      setPayAllAmount('');
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
      
      const cashFlowRef = doc(collection(db, `users/${storeId}/cashFlow`));
      batch.set(cashFlowRef, {
        type: 'income',
        source: 'debt_payment',
        amount: payAmount,
        customerId: paymentData.customerId,
        createdAt: new Date().toISOString(),
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

  const handleProcessQuickClose = async () => {
    const payAmount = Number(quickCloseData.amount);
    const custId = quickCloseData.customerId;
    
    if (!custId || !payAmount || payAmount <= 0) {
      addToast('Mijoz va to\'g\'ri summa kiriting', 'warning');
      return;
    }

    try {
      // Get all active debts for this customer, sorted oldest first
      const q = query(collection(db, `users/${storeId}/customerDebts`), where('customerId', '==', custId), where('status', 'in', ['active', 'partial']));
      const snap = await getDocs(q);
      let custDebts = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      let remainingPayment = payAmount;
      const batch = writeBatch(db);

      for (const debt of custDebts) {
        if (remainingPayment <= 0) break;
        
        const currentDebtAmount = Number(debt.remainingAmount || 0);
        let amountToPayThisDebt = 0;
        
        if (remainingPayment >= currentDebtAmount) {
          amountToPayThisDebt = currentDebtAmount;
          remainingPayment -= currentDebtAmount;
        } else {
          amountToPayThisDebt = remainingPayment;
          remainingPayment = 0;
        }

        const newRemaining = currentDebtAmount - amountToPayThisDebt;
        const debtRef = doc(db, `users/${storeId}/customerDebts`, debt.id);
        
        // Update debt doc
        batch.update(debtRef, {
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'paid' : 'partial',
          updatedAt: new Date().toISOString()
        });

        // Write to payments subcollection
        const paymentRef = doc(collection(db, `users/${storeId}/customerDebts/${debt.id}/payments`));
        batch.set(paymentRef, {
          amount: amountToPayThisDebt,
          date: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin',
          note: 'Qarzni tezkor yopish'
        });

        // Write to cashFlow
        const cashFlowRef = doc(collection(db, `users/${storeId}/cashFlow`));
        batch.set(cashFlowRef, {
          type: 'income',
          source: 'debt_payment',
          amount: amountToPayThisDebt,
          customerId: custId,
          debtId: debt.id,
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });

        // Create transaction history
        const transRef = doc(collection(db, `users/${storeId}/transactions`));
        batch.set(transRef, {
          debtId: debt.id,
          customerId: custId,
          type: 'debt_payment',
          amount: amountToPayThisDebt,
          paymentMethod: 'cash',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });
      }

      // Update customer total debt
      const custRef = doc(db, `users/${storeId}/customers`, custId);
      const totalPaidInDb = payAmount - remainingPayment; // amount actually applied to debts
      
      if (totalPaidInDb > 0) {
        batch.update(custRef, {
          currentDebt: increment(-totalPaidInDb)
        });
        await batch.commit();
        addToast(`Muvaffaqiyatli ${formatCurrency(totalPaidInDb, curr)} qarz qoplandi.`, 'success');
        if (remainingPayment > 0) {
          addToast(`Ortib qolgan summa: ${formatCurrency(remainingPayment, curr)} (qarzi to'liq yopildi)`, 'info');
        }
      } else {
        addToast('Bu mijozning ochiq qarzlari topilmadi', 'warning');
      }
      
      setIsQuickCloseOpen(false);
      setQuickCloseData({ customerId: '', amount: '' });
      if (expandedId === custId) {
        toggleExpand(custId); // refresh UI
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleProcessBulkPayment = async () => {
    const selectedCustIds = Object.keys(bulkSelections).filter(id => Number(bulkSelections[id]) > 0);
    if (selectedCustIds.length === 0) {
      addToast('Kamida bitta mijoz va summa kiriting', 'warning');
      return;
    }

    try {
      const batch = writeBatch(db);
      let totalProcessed = 0;

      for (const custId of selectedCustIds) {
        const payAmount = Number(bulkSelections[custId]);
        
        // Fetch active debts for this customer
        const q = query(collection(db, `users/${storeId}/customerDebts`), where('customerId', '==', custId), where('status', 'in', ['active', 'partial']));
        const snap = await getDocs(q);
        let custDebts = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        let remainingPayment = payAmount;
        let customerTotalPaid = 0;

        for (const debt of custDebts) {
          if (remainingPayment <= 0) break;
          
          const currentDebtAmount = Number(debt.remainingAmount || 0);
          let amountToPayThisDebt = 0;
          
          if (remainingPayment >= currentDebtAmount) {
            amountToPayThisDebt = currentDebtAmount;
            remainingPayment -= currentDebtAmount;
          } else {
            amountToPayThisDebt = remainingPayment;
            remainingPayment = 0;
          }

          customerTotalPaid += amountToPayThisDebt;
          const newRemaining = currentDebtAmount - amountToPayThisDebt;
          const debtRef = doc(db, `users/${storeId}/customerDebts`, debt.id);
          
          batch.update(debtRef, {
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'paid' : 'partial',
            updatedAt: new Date().toISOString()
          });

          // Write to payments
          const paymentRef = doc(collection(db, `users/${storeId}/customerDebts/${debt.id}/payments`));
          batch.set(paymentRef, {
            amount: amountToPayThisDebt,
            date: new Date().toISOString(),
            createdBy: userProfile?.name || 'Admin',
            note: 'Ommaviy to\'lov'
          });

          // Write to cashFlow
          const cashFlowRef = doc(collection(db, `users/${storeId}/cashFlow`));
          batch.set(cashFlowRef, {
            type: 'income',
            source: 'debt_payment',
            amount: amountToPayThisDebt,
            customerId: custId,
            debtId: debt.id,
            createdAt: new Date().toISOString(),
            createdBy: userProfile?.name || 'Admin'
          });
        }

        if (customerTotalPaid > 0) {
          const custRef = doc(db, `users/${storeId}/customers`, custId);
          batch.update(custRef, { currentDebt: increment(-customerTotalPaid) });
          totalProcessed += customerTotalPaid;
        }
      }

      await batch.commit();
      addToast(`Muvaffaqiyatli ${formatCurrency(totalProcessed, curr)} ommaviy to'lov qabul qilindi`, 'success');
      setIsBulkPaymentOpen(false);
      setBulkSelections({});
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSendSms = async () => {
    if (!smsData.message.trim()) {
      addToast('SMS matnini kiriting', 'warning');
      return;
    }
    try {
      const batch = writeBatch(db);
      const campRef = doc(collection(db, `users/${storeId}/smsCampaigns`));
      
      batch.set(campRef, {
        message: smsData.message,
        target: 'debtors',
        recipientCount: debtors.length,
        status: 'queued',
        createdAt: serverTimestamp(),
        createdBy: userProfile?.name || 'Admin'
      });
      
      await batch.commit();
      addToast(`${debtors.length} ta qarzdorga SMS jo'natish navbatga qo'yildi`, 'success');
      setIsSmsModalOpen(false);
      setSmsData({ message: '' });
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelDebt = async (debt, customerId) => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
      addToast('Bu amalni bajarish uchun huquqingiz yo\'q', 'error');
      return;
    }
    if (!(await confirm({ message: 'Haqiqatan ham bu qarzni bekor qilmoqchimisiz?', confirmStyle: 'danger' }))) return;
    
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
    if (!(await confirm({ message: 'Haqiqatan ham bu mijozning UMUMIY qarzini to\'liq o\'chirmoqchimisiz?', confirmStyle: 'danger' }))) return;
    
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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Qarzlar ro'yxati (Debitorlik)</h1>
          <p className="page-subtitle">Mijozlarning do'kondan bo'lgan qarzlari</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Actions Button Wrapper */}
          <div style={{ position: 'relative' }} ref={actionsMenuRef}>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, borderColor: '#3B82F6', color: '#2563EB' }}
            >
              <Zap size={16} /> Amallar {showActionsMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Spring Bounce Popover directly under Amallar button */}
            <AnimatePresence>
              {showActionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '8px',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: '200px',
                    zIndex: 90
                  }}
                >
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#1E293B', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setIsQuickCloseOpen(true); setShowActionsMenu(false); }}
                  >
                    <CreditCard size={16} color="#2563EB" /> Tezkor yopish
                  </button>

                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#1E293B', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setIsBulkPaymentOpen(true); setShowActionsMenu(false); }}
                  >
                    <CheckSquare size={16} color="#059669" /> Ommaviy to'lov
                  </button>

                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#1E293B', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setIsSmsModalOpen(true); setShowActionsMenu(false); }}
                  >
                    <MessageSquare size={16} color="#D97706" /> SMS Tarqatish
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add Debt Button */}
          <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
            <Plus size={16} /> Qarz qo'shish
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Qarzdorlar soni</span>
          <span className="stat-card-value amber">{totalDebtorsCount} ta mijoz</span>
          <span className="stat-card-sub">Faol ro'yxat</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Qarzlar qoldig'i (Jami)</span>
          <span className="stat-card-value red"><CurrencyDisplay amount={totalDebtSum} /></span>
          <span className="stat-card-sub">Olinmagan qarzlar</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">To'lovlar summasi</span>
          <span className="stat-card-value green"><CurrencyDisplay amount={totalPaymentsSum} /></span>
          <span className="stat-card-sub">Jami qabul qilingan</span>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Ism yoki telefon orqali qidirish..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="debts-table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="debts-table-header">
            <div>F.I.O</div>
            <div>Telefon</div>
            <div>Umumiy qarz summasi</div>
            <div style={{ textAlign: 'right' }}>Batafsil</div>
          </div>

          {filteredDebtors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
              Qarzdorlar topilmadi
            </div>
          ) : filteredDebtors.map(customer => {
            const isExpanded = expandedId === customer.id;

            return (
              <React.Fragment key={customer.id}>
                <div 
                  className={`debts-table-row ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleExpand(customer.id)}
                >
                  <div className="debt-col-name">{customer.fullName}</div>
                  <div className="debt-col-phone">{customer.phone}</div>
                  <div className="debt-col-amount"><CurrencyDisplay amount={customer.currentDebt} /></div>
                  <div className="debt-col-expand">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                {/* Expanded Customer Debt Records */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="customer-debts-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderBottom: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: 8 }}>
                          <h4 style={{ color: '#0F172A', fontWeight: 600, fontSize: 13, margin: 0 }}>Qarz yozuvlari:</h4>
                          {customerDebts[customer.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').length > 1 && (
                            <button
                              className="btn btn-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 10px', fontSize: 12 }}
                              onClick={(e) => { e.stopPropagation(); openPayAllModal(customer); }}
                            >
                              <CreditCard size={14} /> Barcha qarzlarni to'lash
                            </button>
                          )}
                        </div>

                        {customerDebts[customer.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {customerDebts[customer.id]?.filter(d => d.status !== 'cancelled' && d.status !== 'paid').map(debt => (
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
                                  <button className="btn btn-primary" onClick={() => openPaymentModal(debt, customer.id)} style={{ padding: '6px 12px', fontSize: 12 }}>To'lov qabul qilish</button>
                                  {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                    <button className="action-btn delete" onClick={() => handleCancelDebt(debt, customer.id)} title="Qarzni bekor qilish">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px dashed #E2E8F0' }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Aktiv qarz yozuvlari mavjud emas</div>
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                Lekin mijozning umumiy qarzdorlik balansi mavjud. Bu yerdan qarzni boshqarishingiz mumkin.
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button className="btn btn-outline" style={{ color: '#10B981', borderColor: '#10B981', padding: '6px 12px', fontSize: 12 }} onClick={() => openLegacyPayModal(customer)}><Minus size={14} /> To'lash</button>
                              <button className="btn btn-outline" style={{ color: '#3B82F6', borderColor: '#3B82F6', padding: '6px 12px', fontSize: 12 }} onClick={() => openLegacyAddModal(customer)}><Plus size={14} /> Qo'shish</button>
                              {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                                <button className="action-btn delete" onClick={() => handleClearLegacyDebt(customer)} title="To'liq o'chirish">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
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

      {/* Quick Close Modal */}
      {isQuickCloseOpen && (
        <Modal isOpen={isQuickCloseOpen} onClose={() => setIsQuickCloseOpen(false)} title="Qarzni tezkor yopish">
          <div className="flex-col" style={{ gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Mijozning barcha qarzlarini ketma-ket (eng eskilaridan boshlab) bitta to'lov bilan yopish.</p>
            <div className="flex-col" style={{ gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mijoz</label>
              <select 
                value={quickCloseData.customerId} 
                onChange={e => setQuickCloseData({...quickCloseData, customerId: e.target.value})}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
              >
                <option value="">-- Mijozni tanlang --</option>
                {debtors.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} (Qarzi: {formatCurrency(c.currentDebt, curr)})</option>
                ))}
              </select>
            </div>
            <FormInput 
              label="To'lanayotgan summa" 
              type="number" 
              value={quickCloseData.amount} 
              onChange={e => setQuickCloseData({...quickCloseData, amount: e.target.value})} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsQuickCloseOpen(false)}>Bekor qilish</button>
              <button className="btn btn-success" onClick={handleProcessQuickClose}>To'lash</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Payment Modal */}
      {isBulkPaymentOpen && (
        <Modal isOpen={isBulkPaymentOpen} onClose={() => setIsBulkPaymentOpen(false)} title="Ommaviy to'lov (Ko'p mijozlarga)">
          <div className="flex-col" style={{ gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bir vaqtning o'zida bir nechta mijozlardan to'lov qabul qilish.</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Mijoz</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Qarz</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>To'lov summasi</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map(c => (
                    <tr key={c.id}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', fontWeight: 500 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={bulkSelections[c.id] !== undefined}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelections(prev => ({ ...prev, [c.id]: c.currentDebt })); // default to full debt
                              } else {
                                const newSel = { ...bulkSelections };
                                delete newSel[c.id];
                                setBulkSelections(newSel);
                              }
                            }}
                          />
                          {c.fullName}
                        </label>
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--danger)' }}>
                        <CurrencyDisplay amount={c.currentDebt} />
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        {bulkSelections[c.id] !== undefined ? (
                          <input 
                            type="number"
                            className="form-input"
                            value={bulkSelections[c.id]}
                            onChange={e => setBulkSelections(prev => ({...prev, [c.id]: e.target.value}))}
                            style={{ padding: '0.5rem', width: '120px' }}
                          />
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Tanlanganlar: {Object.keys(bulkSelections).length}</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                Jami to'lov: <CurrencyDisplay amount={Object.values(bulkSelections).reduce((a, b) => a + Number(b || 0), 0)} />
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsBulkPaymentOpen(false)}>Bekor qilish</button>
              <button className="btn btn-success" onClick={handleProcessBulkPayment} disabled={Object.keys(bulkSelections).length === 0}>
                Tasdiqlash va Yopish
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pay All Debts Modal */}
      {isPayAllOpen && payAllCustomer && (() => {
        const distribution = getPayAllDistribution();
        const totalDebt = distribution.reduce((s, d) => s + d.remainingAmount, 0);
        const payAmount = Number(payAllAmount) || 0;
        const isValid = payAmount > 0 && payAmount <= totalDebt;
        return (
          <Modal isOpen={isPayAllOpen} onClose={() => { setIsPayAllOpen(false); setPayAllAmount(''); }} title={`${payAllCustomer.fullName} — Qarzlarni to'lash`} maxWidth="520px">
            <div className="flex-col" style={{ gap: '1.25rem' }}>

              {/* Amount Input */}
              <div className="flex-col" style={{ gap: '0.5rem' }}>
                <label style={{ fontWeight: 600 }}>Mijoz olib kelgan summa:</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ flex: 1, fontSize: '1.1rem', padding: '0.75rem 1rem' }}
                    placeholder="Masalan: 75000"
                    value={payAllAmount}
                    autoFocus
                    onChange={e => setPayAllAmount(e.target.value)}
                  />
                  <button
                    className="btn btn-outline"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => setPayAllAmount(String(totalDebt))}
                  >Barchasini</button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Umumiy qarz: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(totalDebt, curr)}</strong>
                </div>
              </div>

              {/* Distribution Preview */}
              {payAmount > 0 && (
                <div className="flex-col" style={{ gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>To'lov taqsimoti (eng eskisidan):</div>
                  {distribution.map((debt, idx) => (
                    <div key={debt.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.6rem 0.9rem',
                      backgroundColor: debt.paying > 0 ? 'var(--success-light, rgba(34,197,94,0.1))' : 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${debt.paying >= debt.remainingAmount ? 'var(--success)' : 'var(--border-color)'}`,
                      opacity: debt.paying === 0 ? 0.5 : 1
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          Qarz #{idx + 1} {debt.note ? `• ${debt.note}` : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Qoldiq: {formatCurrency(debt.remainingAmount, curr)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {debt.paying > 0 ? (
                          <>
                            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>-{formatCurrency(debt.paying, curr)}</div>
                            {debt.newRemaining > 0 && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Qoladi: {formatCurrency(debt.newRemaining, curr)}</div>
                            )}
                            {debt.newRemaining <= 0 && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓ To'liq yopildi</div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To'lanmaydi</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary row */}
              {payAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 600 }}>Jami to'lov:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: isValid ? 'var(--primary)' : 'var(--danger)' }}>
                    {formatCurrency(payAmount, curr)}
                    {payAmount > totalDebt && <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>(qarzdan oshib ketdi!)</span>}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => { setIsPayAllOpen(false); setPayAllAmount(''); }}>Bekor qilish</button>
                <button className="btn btn-success" disabled={!isValid} onClick={handleProcessPayAll}>✓ Tasdiqlash</button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {isSmsModalOpen && (
        <Modal isOpen={isSmsModalOpen} onClose={() => setIsSmsModalOpen(false)} title="Qarzdorlarga SMS tarqatish">
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--primary)', fontWeight: 600 }}>Jami qarzdorlar: {debtors.length} ta</p>
            </div>
            <div className="flex-col" style={{ gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>SMS Matni</label>
              <textarea 
                className="form-input" 
                rows="4" 
                value={smsData.message}
                onChange={e => setSmsData({...smsData, message: e.target.value})}
                placeholder="Hurmatli mijoz, sizning do'konimizdan qarzingiz mavjud..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsSmsModalOpen(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSendSms}>Jo'natish</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Debts;
