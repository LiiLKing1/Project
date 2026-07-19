import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, DollarSign, Calendar, Info } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, where, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';

const Payroll = () => {
  const [staff, setStaff] = useState([]);
  const [sales, setSales] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [bonus, setBonus] = useState('');
  const [deduction, setDeduction] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!storeId) return;
    
    // Fetch staff
    const unsubStaff = onSnapshot(collection(db, `users/${storeId}/staff`), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isActive));
    });

    return () => unsubStaff();
  }, [storeId]);

  useEffect(() => {
    if (!storeId || !selectedPeriod) return;
    
    const fetchPeriodData = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedPeriod.split('-');
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        // Fetch sales
        const salesQuery = query(
          collection(db, `users/${storeId}/sales`),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate)
        );
        const salesSnap = await getDocs(salesQuery);
        setSales(salesSnap.docs.map(d => d.data()));

        // Fetch existing payrolls for this period
        const payrollQuery = query(
          collection(db, `users/${storeId}/payroll`),
          where('period', '==', selectedPeriod)
        );
        const payrollSnap = await getDocs(payrollQuery);
        setPayrolls(payrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPeriodData();
  }, [storeId, selectedPeriod, addToast]);

  const getStaffSales = (staffName) => {
    return sales
      .filter(s => s.cashierId === staffName)
      .reduce((acc, curr) => acc + Number(curr.finalTotal || 0), 0);
  };

  const getCalculatedPayroll = (employee) => {
    const existing = payrolls.find(p => p.staffId === employee.id);
    if (existing) return existing;

    const totalSales = getStaffSales(employee.fullName);
    let fixedPart = 0;
    let percentagePart = 0;

    if (employee.salaryType === 'fixed' || employee.salaryType === 'mixed') {
      fixedPart = employee.fixedSalary || 0;
    }
    if (employee.salaryType === 'percentage' || employee.salaryType === 'mixed') {
      percentagePart = totalSales * ((employee.percentageRate || 0) / 100);
    }

    return {
      staffId: employee.id,
      staffName: employee.fullName,
      period: selectedPeriod,
      totalSales,
      fixedPart,
      percentagePart,
      bonuses: 0,
      deductions: 0,
      status: 'pending'
    };
  };

  const handleOpenAdjust = (employee) => {
    const data = getCalculatedPayroll(employee);
    setSelectedStaff(data);
    setBonus(data.bonuses || '');
    setDeduction(data.deductions || '');
    setNote(data.note || '');
    setIsModalOpen(true);
  };

  const handleSaveAdjust = () => {
    if (!selectedStaff) return;
    
    const finalAmount = (selectedStaff.fixedPart || 0) + (selectedStaff.percentagePart || 0) + Number(bonus || 0) - Number(deduction || 0);
    
    const updated = {
      ...selectedStaff,
      bonuses: Number(bonus || 0),
      deductions: Number(deduction || 0),
      note,
      finalAmount
    };

    setPayrolls(prev => {
      const idx = prev.findIndex(p => p.staffId === updated.staffId);
      if (idx >= 0) {
        const newArr = [...prev];
        newArr[idx] = updated;
        return newArr;
      }
      return [...prev, updated];
    });
    
    setIsModalOpen(false);
    addToast("O'zgarishlar saqlandi (Faqat xotirada, To'landi tugmasini bosganda bazaga yoziladi)", "info");
  };

  const handleMarkAsPaid = async (employee) => {
    if (!storeId) return;
    const data = getCalculatedPayroll(employee);
    
    const finalAmount = data.finalAmount !== undefined ? data.finalAmount : (data.fixedPart + data.percentagePart + data.bonuses - data.deductions);

    if (await confirm({ message: `${employee.fullName} uchun ${new Intl.NumberFormat('uz-UZ').format(finalAmount)} ${curr} ish haqini to'langan deb belgilaysizmi? Bu summa Xarajatlar bo'limiga ham qo'shiladi.` })) {
      try {
        const payload = {
          ...data,
          finalAmount,
          status: 'paid',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        // Save to Payroll
        if (data.id) {
          await setDoc(doc(db, `users/${storeId}/payroll`, data.id), payload, { merge: true });
        } else {
          const ref = await addDoc(collection(db, `users/${storeId}/payroll`), payload);
          payload.id = ref.id;
        }

        // Add to Expenses
        await addDoc(collection(db, `users/${storeId}/expenses`), {
          title: `Ish haqi: ${employee.fullName} (${selectedPeriod})`,
          amount: finalAmount,
          category: 'Ish haqi',
          date: new Date().toISOString().split('T')[0],
          note: payload.note || '',
          createdAt: new Date().toISOString()
        });

        addToast("Ish haqi to'landi va Xarajatlarga qo'shildi", "success");
        
        setPayrolls(prev => {
          const idx = prev.findIndex(p => p.staffId === payload.staffId);
          if (idx >= 0) {
             const n = [...prev]; n[idx] = payload; return n;
          }
          return [...prev, payload];
        });
      } catch (err) {
        addToast(err.message, "error");
      }
    }
  };

  if (loading && staff.length === 0) return <div className="flex-center" style={{ height: '100%' }}>Yuklanmoqda...</div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ish Haqi va KPI</h1>
          <p className="page-subtitle">Xodimlarning oylik maoshlari va bonuslarini hisoblash tizimi</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#8A9BB5" />
          <input 
            type="month" 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DCE8F5', backgroundColor: '#fff', outline: 'none', color: '#1A2538', fontWeight: 500 }}
          />
        </div>
      </div>

      <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="page-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Xodim</th>
                <th>Savdo hajmi</th>
                <th>Fixed qism</th>
                <th>Foiz (%) qism</th>
                <th>Bonus/Jarima</th>
                <th>Yakuniy summa</th>
                <th>Holat</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Xodimlar topilmadi
                  </td>
                </tr>
              ) : null}
              {staff.map(emp => {
                const calc = getCalculatedPayroll(emp);
                const isPaid = calc.status === 'paid';
                const finalAmt = calc.finalAmount !== undefined ? calc.finalAmount : (calc.fixedPart + calc.percentagePart + calc.bonuses - calc.deductions);

                return (
                  <tr key={emp.id} style={{ opacity: isPaid ? 0.7 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1A2538' }}>{emp.fullName}</div>
                      <div style={{ fontSize: 13, color: '#8A9BB5', textTransform: 'capitalize' }}>{emp.salaryType}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1A2538' }}><CurrencyDisplay amount={calc.totalSales} /></div>
                    </td>
                    <td style={{ color: '#1A2538' }}><CurrencyDisplay amount={calc.fixedPart} /></td>
                    <td style={{ color: '#1A2538' }}><CurrencyDisplay amount={calc.percentagePart} /></td>
                    <td>
                      <div style={{ color: '#10B981', fontWeight: 600, fontSize: 13 }}>+{new Intl.NumberFormat('uz-UZ').format(calc.bonuses || 0)}</div>
                      <div style={{ color: '#EF4B4B', fontSize: 13 }}>-{new Intl.NumberFormat('uz-UZ').format(calc.deductions || 0)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#4A90E2', fontSize: 16 }}>
                        <CurrencyDisplay amount={finalAmt} />
                      </div>
                    </td>
                    <td>
                      {isPaid ? (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600, backgroundColor: '#D1FAE5', color: '#10B981'
                        }}>
                          <CheckCircle2 size={14}/> To'langan
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '4px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600, backgroundColor: '#FEF3C7', color: '#F59E0B'
                        }}>
                          Kutilmoqda
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {!isPaid && (
                          <>
                            <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => handleOpenAdjust(emp)} title="Bonus/Jarima qo'shish">
                              <Calculator size={16}/>
                            </button>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => handleMarkAsPaid(emp)}>
                              To'lash
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${selectedStaff?.staffName} uchun hisob-kitob`}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', color: 'var(--primary)' }}>
          <Info size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ushbu o'zgarishlar yakuniy summaga ta'sir qiladi. Summa to'langan deb belgilanguncha saqlab turiladi.</span>
        </div>
        
        <FormInput label="Mukofot puli (Bonus)" type="number" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="0" />
        <FormInput label="Ushlab qolish (Jarima/Avans)" type="number" value={deduction} onChange={e => setDeduction(e.target.value)} placeholder="0" />
        <FormInput label="Izoh" value={note} onChange={e => setNote(e.target.value)} placeholder="Nimaning hisobiga..." />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSaveAdjust}>Saqlash</button>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
