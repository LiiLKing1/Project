import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Percent, Check, Send } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { saveDoc, editDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';

const Marketing = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'discount', targetProductIds: '', discountValue: '', discountType: 'percent', isActive: true });

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/promotions`), orderBy('createdAt', 'desc')), (snapshot) => {
      setPromotions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [addToast, storeId]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.discountValue) {
      addToast('Nom va chegirma miqdorini kiriting', 'error');
      return;
    }
    if (!storeId) return;

    try {
      await saveDoc(collection(db, `users/${storeId}/promotions`), {
        ...formData,
        discountValue: Number(formData.discountValue),
      });
      addToast('Aksiya muvaffaqiyatli qo\'shildi', 'success');
      setIsPromoModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const toggleActive = async (promo) => {
    if (!storeId) return;
    try {
      await editDoc(doc(db, `users/${storeId}/promotions`, promo.id), { isActive: !promo.isActive });
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Marketing va Aksiyalar</h1>
        <button className="btn btn-primary" onClick={() => setIsPromoModalOpen(true)}><Plus size={18} /> Yangi aksiya</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        
        {/* Promos */}
        <div className="glass-panel flex-col" style={{ height: '100%' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Percent size={20} color="var(--primary)" />
            <h2 className="h2">Aktiv Aksiyalar</h2>
          </div>
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? <div className="flex-center" style={{color: 'var(--text-secondary)'}}>Yuklanmoqda...</div> : promotions.length === 0 ? <div className="flex-center" style={{color: 'var(--text-secondary)'}}>Aksiyalar yo'q</div> : null}
            {promotions.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: p.isActive ? 'var(--bg-surface)' : 'var(--bg-main)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: p.isActive ? 'var(--text-main)' : 'var(--text-secondary)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.discountType === 'percent' ? p.discountValue + '%' : p.discountValue + ` ${curr}`} chegirma</div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={p.isActive} onChange={() => toggleActive(p)} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Aktiv</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SMS Campaigns */}
        <div className="glass-panel flex-col" style={{ height: '100%' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Megaphone size={20} color="var(--primary)" />
            <h2 className="h2">SMS Yuborish</h2>
          </div>
          <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kimga yuboriladi?</label>
              <select style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                <option>Barcha mijozlarga</option>
                <option>VIP mijozlarga</option>
                <option>Qarzdorlarga</option>
                <option>Bugun tug'ilgan kuni bo'lganlarga</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Xabar matni</label>
              <textarea 
                rows="5"
                placeholder="Xabar matnini kiriting. (O'zgaruvchilar: {ism}, {qarz})"
                style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', resize: 'none' }}
              />
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => addToast('SMS shlyuz integratsiya qilinmagan. Sozlamalardan API kalit kiriting.', 'warning')}><Send size={18} /> Yuborish</button>
            </div>
          </div>
        </div>

      </div>

      <Modal isOpen={isPromoModalOpen} onClose={() => setIsPromoModalOpen(false)} title="Yangi aksiya yaratish">
        <FormInput label="Aksiya nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Aksiya turi</label>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
            <option value="discount">Umumiy chegirma</option>
            <option value="bundle">To'plam (1+1=3)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Chegirma qiymati" type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Qiymat turi</label>
            <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <option value="percent">Foiz (%)</option>
              <option value="amount">Summa ({curr})</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsPromoModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}><Check size={18} /> Saqlash</button>
        </div>
      </Modal>
    </div>
  );
};

export default Marketing;
