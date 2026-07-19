import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Percent, Check, Send } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketing va Aksiyalar</h1>
          <p className="page-subtitle">Aksiyalar va mijozlarga SMS xabarnomalar</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsPromoModalOpen(true)}>
          <Plus size={18} /> Yangi aksiya
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
        
        {/* Promos */}
        <div className="page-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="page-card-header" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={20} color="#4A90E2" />
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A2538', margin: 0 }}>Aktiv Aksiyalar</h2>
            </div>
          </div>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? <div className="flex-center" style={{color: '#8A9BB5'}}>Yuklanmoqda...</div> : promotions.length === 0 ? <div className="flex-center" style={{color: '#8A9BB5'}}>Aksiyalar yo'q</div> : null}
            {promotions.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #DCE8F5', borderRadius: '12px', backgroundColor: p.isActive ? '#fff' : '#F9FAFB' }}>
                <div>
                  <div style={{ fontWeight: 600, color: p.isActive ? '#1A2538' : '#8A9BB5' }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#8A9BB5' }}>{p.discountType === 'percent' ? p.discountValue + '%' : p.discountValue + ` ${curr}`} chegirma</div>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={p.isActive} onChange={() => toggleActive(p)} style={{ accentColor: '#4A90E2', width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, color: p.isActive ? '#10B981' : '#8A9BB5', fontWeight: 500 }}>Aktiv</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SMS Campaigns */}
        <div className="page-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="page-card-header" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} color="#4A90E2" />
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1A2538', margin: 0 }}>SMS Yuborish</h2>
            </div>
          </div>
          <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Kimga yuboriladi?</label>
              <CustomSelect 
                value="all"
                onChange={() => {}}
                options={[
                  {value: 'all', label: 'Barcha mijozlarga'},
                  {value: 'vip', label: 'VIP mijozlarga'},
                  {value: 'debtors', label: 'Qarzdorlarga'},
                  {value: 'birthday', label: "Bugun tug'ilgan kuni bo'lganlarga"}
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Xabar matni</label>
              <textarea 
                rows="5"
                placeholder="Xabar matnini kiriting. (O'zgaruvchilar: {ism}, {qarz})"
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #DCE8F5', backgroundColor: '#fff', resize: 'none', outline: 'none', color: '#1A2538', fontFamily: 'inherit' }}
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
          <CustomSelect 
            value={formData.type} 
            onChange={v => setFormData({...formData, type: v})}
            options={[
              {value: 'discount', label: 'Umumiy chegirma'},
              {value: 'bundle', label: "To'plam (1+1=3)"}
            ]}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Chegirma qiymati" type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Qiymat turi</label>
            <CustomSelect 
              value={formData.discountType} 
              onChange={v => setFormData({...formData, discountType: v})}
              options={[
                {value: 'percent', label: 'Foiz (%)'},
                {value: 'amount', label: `Summa (${curr})`}
              ]}
            />
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
