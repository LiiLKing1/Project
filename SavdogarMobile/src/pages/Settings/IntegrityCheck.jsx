import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCcw, Wrench } from 'lucide-react';
import { logAudit } from '../../utils/firebaseUtils';

const IntegrityCheck = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fixingId, setFixingId] = useState(null);
  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;

  const runCheck = async () => {
    if (!storeId) return;
    setLoading(true);
    setIssues([]);
    const newIssues = [];

    try {
      // 1. Check Products for Negative Stock
      const prodSnap = await getDocs(collection(db, `users/${storeId}/products`));
      prodSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() };
        if (p.stockByWarehouse) {
          for (const [wId, amount] of Object.entries(p.stockByWarehouse)) {
            if (amount < 0) {
              newIssues.push({
                id: `prod_${p.id}_${wId}`,
                type: 'negative_stock',
                title: 'Manfiy qoldiq (Mahsulot)',
                description: `${p.name} mahsuloti omborda manfiy qoldiqqa ega (${amount}).`,
                actionLabel: 'Nolga tenglashtirish (0)',
                docRef: doc(db, `users/${storeId}/products`, p.id),
                fixData: { [`stockByWarehouse.${wId}`]: 0 },
                auditDetail: `${p.name} manfiy qoldig'i 0 ga to'g'irlandi`
              });
            }
          }
        }
      });

      // 2. Check Customers for Negative Debt
      const custSnap = await getDocs(collection(db, `users/${storeId}/customers`));
      custSnap.docs.forEach(d => {
        const c = { id: d.id, ...d.data() };
        if (c.currentDebt < 0) {
          newIssues.push({
            id: `cust_${c.id}`,
            type: 'negative_debt',
            title: 'Manfiy qarz (Mijoz)',
            description: `${c.fullName} ning qarzi manfiy (${c.currentDebt}). Mijoz haqdor bo'lib qolgan bo'lishi mumkin.`,
            actionLabel: 'Nolga tenglashtirish (0)',
            docRef: doc(db, `users/${storeId}/customers`, c.id),
            fixData: { currentDebt: 0 },
            auditDetail: `${c.fullName} manfiy qarzi 0 ga to'g'irlandi`
          });
        }
      });

      setIssues(newIssues);
      if (newIssues.length === 0) {
        addToast('Barcha ma\'lumotlar to\'g\'ri!', 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fixIssue = async (issue) => {
    if (!(await confirm({ message: 'Haqiqatan ham bu xatoni avtomatik to\'g\'irlamoqchimisiz?' }))) return;
    setFixingId(issue.id);
    try {
      await updateDoc(issue.docRef, issue.fixData);
      await logAudit(storeId, userProfile, 'UPDATE', 'integrity', issue.auditDetail);
      addToast('Muvaffaqiyatli to\'g\'irlandi', 'success');
      setIssues(prev => prev.filter(i => i.id !== issue.id));
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setFixingId(null);
    }
  };

  const fixAll = async () => {
    if (issues.length === 0) return;
    if (!(await confirm({ message: `Jami ${issues.length} ta xatolikni barchasini to'g'irlamoqchimisiz?` }))) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const issue of issues) {
        batch.update(issue.docRef, issue.fixData);
      }
      await batch.commit();
      await logAudit(storeId, userProfile, 'UPDATE', 'integrity', `${issues.length} ta xatolik ommaviy to'g'irlandi`);
      addToast('Barcha xatoliklar to\'g\'irlandi', 'success');
      setIssues([]);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Ma'lumotlar Yaxlitligini Tekshirish</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {issues.length > 0 && (
            <button className="btn btn-primary" onClick={fixAll} disabled={loading}>
              <Wrench size={18} /> Barchasini to'g'irlash
            </button>
          )}
          <button className="btn btn-outline" onClick={runCheck} disabled={loading}>
            <RefreshCcw size={18} /> {issues.length === 0 && !loading ? 'Tekshirish' : 'Qayta tekshirish'}
          </button>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Bu sahifa orqali tizimdagi bazaviy xatoliklarni aniqlashingiz mumkin (masalan: manfiy qoldiqqa kirib qolgan mahsulotlar yoki xato hisoblangan qarzlar).
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCcw size={32} className="spin" style={{ marginBottom: '1rem' }} />
            <p>Ma'lumotlar tekshirilmoqda...</p>
          </div>
        ) : issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle2 size={64} style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Barcha ma'lumotlar joyida!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Hech qanday mantiqiy xatolik yoki manfiy ko'rsatkich topilmadi.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {issues.map(issue => (
              <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', backgroundColor: 'var(--warning-light)', borderLeft: '4px solid var(--warning)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={24} color="var(--warning)" style={{ marginTop: '0.25rem' }} />
                  <div>
                    <h4 style={{ margin: 0, marginBottom: '0.25rem', fontWeight: 600 }}>{issue.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{issue.description}</p>
                  </div>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  onClick={() => fixIssue(issue)}
                  disabled={fixingId === issue.id}
                >
                  <Wrench size={18} /> {fixingId === issue.id ? 'To\'g\'irlanmoqda...' : issue.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrityCheck;
