import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Store, Globe, LogOut, Gift } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { putDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';

const Settings = () => {
  const [formData, setFormData] = useState({
    storeName: '', address: '', taxRate: ''
  });
  const [generalData, setGeneralData] = useState({
    theme: 'light', language: 'uz', currency: 'UZS', showUsdConversion: false, usdRate: 12500, rubRate: 140
  });
  const [loyaltyData, setLoyaltyData] = useState({
    bonusPercent: 0, minPurchaseForBonus: 0, vipMultiplier: 1
  });
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutConfirmText, setLogoutConfirmText] = useState('');
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings, updateSettings } = useSettings();
  const { logout } = useAuth();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (settings) {
      setGeneralData({
        theme: settings.theme || 'light',
        language: settings.language || 'uz',
        currency: settings.currency || 'UZS',
        showUsdConversion: settings.showUsdConversion || false,
        usdRate: settings.usdRate || 12500,
        rubRate: settings.rubRate || 140,
      });
    }
  }, [settings]);

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
    const unsubLoyalty = onSnapshot(doc(db, `users/${storeId}/settings/loyalty`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLoyaltyData({
          bonusPercent: data.bonusPercent || 0,
          minPurchaseForBonus: data.minPurchaseForBonus || 0,
          vipMultiplier: data.vipMultiplier || 1
        });
      }
    });
    return () => { unsub(); unsubLoyalty(); };
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      await putDoc(doc(db, `users/${storeId}/settings/storeInfo`), {
        storeName: formData.storeName,
        address: formData.address,
        taxRate: Number(formData.taxRate || 0),
        updatedAt: new Date().toISOString()
      });
      await putDoc(doc(db, `users/${storeId}/settings/loyalty`), {
        bonusPercent: Number(loyaltyData.bonusPercent || 0),
        minPurchaseForBonus: Number(loyaltyData.minPurchaseForBonus || 0),
        vipMultiplier: Number(loyaltyData.vipMultiplier || 1),
        updatedAt: new Date().toISOString()
      });
      await updateSettings({
        ...generalData,
        usdRate: Number(generalData.usdRate),
        rubRate: Number(generalData.rubRate)
      });
      addToast('Sozlamalar muvaffaqiyatli saqlandi', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunMigration = async () => {
    if (!storeId) return;
    if (!window.confirm("Barcha mahsulotlarning 'stock' qoldig'i yangi 'Filiallar (Multi-Warehouse)' tizimiga o'tkaziladi. Buni faqat bir marta bajaring! Zaxira (Export) olganmisiz?")) return;
    
    setIsSaving(true);
    try {
      const warehouseRef = doc(db, `users/${storeId}/warehouses`, 'main');
      await setDoc(warehouseRef, { name: 'Asosiy Filial', createdAt: new Date().toISOString() }, { merge: true });

      const prodSnap = await getDocs(collection(db, `users/${storeId}/products`));
      
      const batch = writeBatch(db);
      let count = 0;
      prodSnap.docs.forEach(d => {
        const data = d.data();
        if (data.stock !== undefined && !data.stockByWarehouse) {
           batch.update(d.ref, {
             stockByWarehouse: { 'main': data.stock || 0 }
           });
           count++;
        }
      });
      await batch.commit();

      addToast(`Migratsiya yakunlandi. ${count} ta mahsulot yangilandi.`, "success");
    } catch (err) {
      addToast(err.message, "error");
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
        
        {/* Umumiy (Tizim) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Globe size={20} color="var(--primary)" />
            <h2 className="h2" style={{ fontSize: '1.25rem' }}>Tizim sozlamalari</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Til (Language)</label>
              <CustomSelect 
                value={generalData.language} 
                onChange={v => setGeneralData({...generalData, language: v})} 
                options={[
                  {value: 'uz', label: "O'zbekcha"},
                  {value: 'ru', label: "Русский"},
                  {value: 'en', label: "English"}
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mavzu (Theme)</label>
              <CustomSelect 
                value={generalData.theme} 
                onChange={v => setGeneralData({...generalData, theme: v})} 
                options={[
                  {value: 'light', label: "Yorug' (Light)"},
                  {value: 'dark', label: "Qorong'i (Dark)"}
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Asosiy Valyuta</label>
              <CustomSelect 
                value={generalData.currency} 
                onChange={v => setGeneralData({...generalData, currency: v})} 
                options={[
                  {value: 'UZS', label: "UZS (So'm)"},
                  {value: 'USD', label: "USD ($)"},
                  {value: 'RUB', label: "RUB (₽)"}
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem' }}>
                <input type="checkbox" checked={generalData.showUsdConversion} onChange={e => setGeneralData({...generalData, showUsdConversion: e.target.checked})} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Chet el valyutasi (USD/RUB) kiritilsa tagida UZS da ko'rsatilsin</span>
              </label>
            </div>
            <FormInput label="USD kursi (1 $ = ... UZS)" type="number" value={generalData.usdRate} onChange={e => setGeneralData({...generalData, usdRate: e.target.value})} />
            <FormInput label="RUB kursi (1 ₽ = ... UZS)" type="number" value={generalData.rubRate} onChange={e => setGeneralData({...generalData, rubRate: e.target.value})} />
          </div>

          {userProfile?.role === 'admin' && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>Baza Migratsiyasi (Multi-Warehouse)</h3>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Ushbu tugma barcha mavjud mahsulotlarning <b>stock</b> (qoldiq) maydonini yangi tizimga (`stockByWarehouse`) o'tkazadi va <b>Asosiy Filial</b> ni yaratadi. Buni faqat bir marta bajaring!
              </p>
              <button className="btn btn-outline" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={handleRunMigration} disabled={isSaving}>
                {isSaving ? 'Bajarilmoqda...' : 'Migratsiyani boshlash'}
              </button>
            </div>
          )}
        </div>

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

        {/* Xavfsizlik (Sign Out) */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <LogOut size={20} color="var(--danger)" />
            <h2 className="h2" style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>Hisobdan chiqish</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Tizimdan chiqish uchun quyidagi tugmani bosing. Xavfsizlik maqsadida do'koningiz nomini kiritish talab qilinadi.
          </p>
          <button 
            className="btn btn-outline" 
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', gap: '0.5rem' }}
            onClick={() => { setLogoutConfirmText(''); setIsLogoutModalOpen(true); }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>

      </div>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Hisobdan chiqishni tasdiqlang">
        <div className="flex-col" style={{ gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Ushbu qurilmadan hisobingizdan chiqmoqchisiz. Davom etish uchun pastdagi maydonga aynan <strong>{formData.storeName || "Do'kon nomi"}</strong> deb yozing.
          </div>
          <FormInput 
            label={`Tasdiqlash uchun yozing: ${formData.storeName}`} 
            value={logoutConfirmText} 
            onChange={(e) => setLogoutConfirmText(e.target.value)}
            placeholder={formData.storeName}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setIsLogoutModalOpen(false)}>Bekor qilish</button>
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: 'var(--danger)' }} 
              disabled={logoutConfirmText !== formData.storeName}
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Settings;
