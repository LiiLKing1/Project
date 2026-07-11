import React, { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStoreId } from '../../context/useStoreId';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const Suppliers = () => {
  const storeId = useStoreId();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [storeId]);

  const fetchSuppliers = async () => {
    if (!storeId) return;
    try {
      const querySnapshot = await getDocs(collection(db, `users/${storeId}/suppliers`));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setSuppliers(data);
    } catch (error) {
      console.error("Yetkazib beruvchilarni olishda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !storeId) return;

    setIsSubmitting(true);
    try {
      const supplierData = {
        name: newName,
        phone: newPhone,
        debt: 0,
        ordersSum: 0,
        payments: 0,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, `users/${storeId}/suppliers`), supplierData);
      setSuppliers([{ id: docRef.id, ...supplierData }, ...suppliers]);
      setShowModal(false);
      setNewName('');
      setNewPhone('');
    } catch (error) {
      console.error("Qo'shishda xatolik:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Yetkazib beruvchilar</h1>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Kompaniya, qarz, buyurtma summa, telefon bo'yicha qidiruv" 
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}
          />
        </div>
        <button style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px solid var(--border-color)' }}>
          To'lov qo'shish
        </button>
        <button 
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          <Plus size={18} />
          Yangi yetkazib beruvchi
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Nomi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Qarz summasi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Buyurtmalar summasi</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>To'lovlar</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Hozircha yetkazib beruvchilar mavjud emas. Yuqoridagi tugma orqali qo'shing.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--primary)' }}>{s.name}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{formatMoney(s.debt)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{formatMoney(s.ordersSum)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{formatMoney(s.payments)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{s.phone || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal oyna */}
      {showModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Yangi yetkazib beruvchi</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Kompaniya nomi yoki F.I.Sh</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Telefon raqami</label>
                <input 
                  type="text" 
                  placeholder="+998"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
