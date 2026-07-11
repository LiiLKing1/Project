import React, { useState, useEffect } from 'react';
import { Save, Store, DollarSign } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';

const Settings = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [usdRate, setUsdRate] = useState('12500');
  const [currency, setCurrency] = useState('UZS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, `users/${storeId}/settings/store`));
        if (snap.exists()) {
          const d = snap.data();
          setStoreName(d.storeName || '');
          setStoreAddress(d.storeAddress || '');
          setStorePhone(d.storePhone || '');
          setUsdRate(d.usdRate || '12500');
          setCurrency(d.currency || 'UZS');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, `users/${storeId}/settings/store`), {
        storeName, storeAddress, storePhone, usdRate, currency
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Sozlamalar</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: saved ? 'var(--success)' : 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Save size={16} />
          {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi ✓' : 'Saqlash'}
        </button>
      </div>

      <section style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}><Store size={20} color="var(--primary)" /></div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Do'kon ma'lumotlari</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Do'kon nomi</label>
            <input value={storeName} onChange={e => setStoreName(e.target.value)} type="text" placeholder="Masalan: Supermarket «Bahor»" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Manzil</label>
            <input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} type="text" placeholder="Shahar, ko'cha, uy raqami" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Telefon raqami</label>
            <input value={storePhone} onChange={e => setStorePhone(e.target.value)} type="text" placeholder="+998..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}><DollarSign size={20} color="var(--success)" /></div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Valyuta sozlamalari</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Asosiy valyuta</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}>
              <option value="UZS">O'zbek so'mi (UZS)</option>
              <option value="USD">AQSh dollari (USD)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>1 USD = ? UZS (Kurs)</label>
            <input value={usdRate} onChange={e => setUsdRate(e.target.value)} type="number" placeholder="12500" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
