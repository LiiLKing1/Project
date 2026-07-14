import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Store, CreditCard, MessageSquare } from 'lucide-react';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { putDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import FormInput from '../../components/FormInput';

const Settings = () => {
  const [formData, setFormData] = useState({
    storeName: '', address: '', taxRate: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;
    const unsub = onSnapshot(doc(db, `users/${storeId}/settings/storeInfo`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          storeName: data.storeName || '',
          address: data.address || '',
          taxRate: data.taxRate || ''
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      await putDoc(doc(db, `users/${storeId}/settings/storeInfo`), {
        storeName: formData.storeName,
        address: formData.address,
        taxRate: Number(formData.taxRate || 0),
        currency: 'UZS',
        updatedAt: new Date().toISOString()
      });
      addToast('Sozlamalar muvaffaqiyatli saqlandi', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Sozlamalar</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}><Save size={18} /> {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Do'kon ma'lumotlari */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Store size={20} color="var(--primary)" />
            <h2 className="h2" style={{ fontSize: '1.25rem' }}>Do'kon ma'lumotlari</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <FormInput label="Do'kon nomi" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
            <FormInput label="Manzil" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            <FormInput label="Soliq stavkasi (%)" type="number" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
