import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import FormInput from '../../components/FormInput';
import { Percent } from 'lucide-react';

const Loyalty = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    bonusPercent: 0,
    minPurchaseForBonus: 0,
    vipMultiplier: 1.5,
  });

  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings: globalSettings } = useSettings();
  const storeId = userProfile?.storeOwnerId;
  const curr = globalSettings?.currency || 'UZS';

  useEffect(() => {
    const fetchSettings = async () => {
      if (!storeId) return;
      try {
        const docRef = doc(db, `users/${storeId}/settings/loyalty`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (err) {
        addToast("Sozlamalarni yuklashda xatolik", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [storeId, addToast]);

  const handleSave = async () => {
    if (!storeId) return;
    setSaving(true);
    
    try {
      const docRef = doc(db, `users/${storeId}/settings/loyalty`);
      await setDoc(docRef, {
        bonusPercent: Number(settings.bonusPercent),
        minPurchaseForBonus: Number(settings.minPurchaseForBonus),
        vipMultiplier: Number(settings.vipMultiplier),
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.name || 'Admin'
      }, { merge: true });
      
      addToast("Bonus tizimi sozlamalari saqlandi", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}>Yuklanmoqda...</div>;

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%', maxWidth: '800px' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={() => window.history.back()}>← Orqaga</button>
        <h1 className="h1" style={{ margin: 0 }}>Bonus tizimi (Loyalty)</h1>
      </div>
      
      <div className="glass-panel flex-col" style={{ padding: '2rem', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--primary-light)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: '50%' }}>
            <Percent size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 600 }}>Keshbek va bonuslar</h3>
            <p style={{ margin: 0, marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Xaridorlarga xarid summasidan ma'lum foizni bonus sifatida qaytarish orqali ularning sodiqligini oshiring.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <FormInput 
            label="Asosiy keshbek foizi (%)" 
            type="number" 
            value={settings.bonusPercent} 
            onChange={e => setSettings({...settings, bonusPercent: e.target.value})} 
            placeholder="Masalan: 1"
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '-1rem' }}>
            Har bir xarid summasining necha foizi mijozning bonus balansiga tushishini belgilang.
          </div>

          <FormInput 
            label={`Bonus berish uchun minimal xarid summasi (${curr})`} 
            type="number" 
            value={settings.minPurchaseForBonus} 
            onChange={e => setSettings({...settings, minPurchaseForBonus: e.target.value})} 
            placeholder="Masalan: 50000"
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '-1rem' }}>
            Agar xarid ushbu summadan kam bo'lsa, bonus berilmaydi (0 yozilsa barcha xaridlarga beriladi).
          </div>

          <FormInput 
            label="VIP mijozlar uchun ko'paytma" 
            type="number" 
            step="0.1"
            value={settings.vipMultiplier} 
            onChange={e => setSettings({...settings, vipMultiplier: e.target.value})} 
            placeholder="Masalan: 1.5"
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '-1rem' }}>
            Agar mijoz VIP maqomida bo'lsa, uning bonusi ushbu ko'rsatkichga ko'paytiriladi (Masalan: oddiy 1% bo'lsa, 1.5 kiritilsa VIP uchun 1.5% bo'ladi).
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: '150px' }}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Loyalty;
