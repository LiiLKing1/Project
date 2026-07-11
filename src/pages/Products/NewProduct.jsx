import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStoreId } from '../../context/useStoreId';

const NewProduct = () => {
  const navigate = useNavigate();
  const storeId = useStoreId();
  const [currency, setCurrency] = useState('UZS');
  const [suppliers, setSuppliers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Dona');
  const [quantity, setQuantity] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [costUz, setCostUz] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [priceUz, setPriceUz] = useState('');
  const [priceUsd, setPriceUsd] = useState('');

  useEffect(() => {
    if (storeId) {
      const fetchSuppliers = async () => {
        const querySnapshot = await getDocs(collection(db, `users/${storeId}/suppliers`));
        const data = [];
        querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setSuppliers(data);
      };
      fetchSuppliers();
    }
  }, [storeId]);

  const handleSave = async () => {
    if (!name || !storeId) return alert('Iltimos, mahsulot nomini kiriting');
    
    setIsSubmitting(true);
    try {
      const productData = {
        barcode,
        name,
        unit,
        quantity: Number(quantity) || 0,
        supplierId,
        costUz: Number(costUz) || 0,
        costUsd: Number(costUsd) || 0,
        priceUz: Number(priceUz) || 0,
        priceUsd: Number(priceUsd) || 0,
        currencySettings: currency,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, `users/${storeId}/products`), productData);
      navigate('/products/catalog');
    } catch (error) {
      console.error("Saqlashda xatolik:", error);
      alert("Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '50%' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Yangi mahsulot</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSubmitting}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
        >
          {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
      
      <div style={{ padding: '2rem', overflow: 'auto', flex: 1, display: 'flex', gap: '3rem' }}>
        <div style={{ flex: 1, maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Asosiy ma'lumotlar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mahsulot ID / Shtrixkod</label>
                <input value={barcode} onChange={e=>setBarcode(e.target.value)} type="text" placeholder="ID kiritish yoki generatsiya" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Mahsulot nomi</label>
                <input value={name} onChange={e=>setName(e.target.value)} type="text" placeholder="Nomini kiriting" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>O'lchov turi</label>
                <select value={unit} onChange={e=>setUnit(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}>
                  <option value="Dona">Dona (dona)</option>
                  <option value="Kilogramm">Kilogramm (kg)</option>
                  <option value="Litr">Litr (l)</option>
                  <option value="Metr">Metr (m)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Dastlabki miqdor (qoldiq)</label>
                <input value={quantity} onChange={e=>setQuantity(e.target.value)} type="number" placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Yetkazib beruvchi</label>
                <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }}>
                  <option value="">Tanlang...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '2rem' }}>Narxlar va valyuta</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Valyuta:</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setCurrency('UZS')}
                  style={{ 
                    padding: '0.5rem 2rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: currency === 'UZS' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: currency === 'UZS' ? 'var(--primary-light)' : 'var(--bg-main)',
                    color: currency === 'UZS' ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: '600'
                  }}
                >
                  UZS
                </button>
                <button 
                  onClick={() => setCurrency('USD')}
                  style={{ 
                    padding: '0.5rem 2rem', 
                    borderRadius: 'var(--radius-md)', 
                    border: currency === 'USD' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: currency === 'USD' ? 'var(--primary-light)' : 'var(--bg-main)',
                    color: currency === 'USD' ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: '600'
                  }}
                >
                  USD
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Kelish narxi ({currency})</label>
                <input 
                  type="number" 
                  value={currency === 'USD' ? costUsd : costUz}
                  onChange={e => currency === 'USD' ? setCostUsd(e.target.value) : setCostUz(e.target.value)}
                  placeholder={currency === 'USD' ? '0.00' : '0'} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Sotish narxi ({currency})</label>
                <input 
                  type="number" 
                  value={currency === 'USD' ? priceUsd : priceUz}
                  onChange={e => currency === 'USD' ? setPriceUsd(e.target.value) : setPriceUz(e.target.value)}
                  placeholder={currency === 'USD' ? '0.00' : '0'} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-main)' }} 
                />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default NewProduct;
