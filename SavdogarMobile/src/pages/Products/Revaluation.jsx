import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, writeBatch, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Tag, Search, PlusCircle, Save, CheckSquare, Square, CheckCircle } from 'lucide-react';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import FormInput from '../../components/FormInput';

const Revaluation = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('percent'); // 'percent' or 'fixed'
  const [targetPrice, setTargetPrice] = useState('sellPrice'); // 'sellPrice' or 'costPrice'
  const [direction, setDirection] = useState('increase'); // 'increase' or 'decrease'

  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;
    const unsub = onSnapshot(query(collection(db, `users/${storeId}/products`)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [storeId]);

  const filteredProducts = products.filter(p => 
    p.status === 'active' && 
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const calculateNewPrice = (oldPrice) => {
    const val = Number(oldPrice) || 0;
    const change = Number(amount) || 0;
    
    if (change === 0) return val;

    let newPrice = val;
    if (unit === 'percent') {
      const modifier = (val * change) / 100;
      newPrice = direction === 'increase' ? val + modifier : val - modifier;
    } else {
      newPrice = direction === 'increase' ? val + change : val - change;
    }
    
    return Math.max(0, newPrice); // No negative prices
  };

  const handleApply = async () => {
    if (selectedIds.length === 0) {
      addToast('Mahsulotlarni tanlang', 'warning');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      addToast('O\'zgarish miqdorini kiriting', 'warning');
      return;
    }
    if (!(await confirm({ message: `${selectedIds.length} ta mahsulot narxi o'zgartiriladi. Tasdiqlaysizmi?` }))) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      selectedIds.forEach(id => {
        const prod = products.find(p => p.id === id);
        if (!prod) return;
        
        const oldPrice = prod[targetPrice];
        const newPrice = calculateNewPrice(oldPrice);
        
        if (oldPrice !== newPrice) {
          const ref = doc(db, `users/${storeId}/products`, id);
          batch.update(ref, {
            [targetPrice]: newPrice,
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Optionally log revaluation history
      const logRef = doc(collection(db, `users/${storeId}/revaluationLogs`));
      batch.set(logRef, {
        productIds: selectedIds,
        amount: Number(amount),
        unit,
        targetPrice,
        direction,
        createdBy: userProfile?.name || 'Admin',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      addToast('Narxlar muvaffaqiyatli yangilandi', 'success');
      setSelectedIds([]);
      setAmount('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Qayta baholash (Revaluation)</h1>
          <p className="page-subtitle">Mahsulotlarning narxlarini ommaviy o'zgartirish</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left: Products List */}
        <div className="page-card" style={{ minHeight: '60vh' }}>
          <div className="page-card-header">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Mahsulotlarni qidiring..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
            <table className="page-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <div onClick={toggleSelectAll} style={{ cursor: 'pointer', color: selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? '#4A90E2' : '#8A9BB5' }}>
                      {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                    </div>
                  </th>
                  <th>Mahsulot</th>
                  <th style={{ textAlign: 'right' }}>Tan narx</th>
                  <th style={{ textAlign: 'right' }}>Sotuv narx</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} style={{ backgroundColor: selectedIds.includes(p.id) ? '#F4F8FF' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <div onClick={() => toggleSelect(p.id)} style={{ cursor: 'pointer', color: selectedIds.includes(p.id) ? '#4A90E2' : '#8A9BB5' }}>
                        {selectedIds.includes(p.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1A2538' }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: '#8A9BB5', fontFamily: 'monospace' }}>{p.barcode}</div>
                    </td>
                    <td style={{ textAlign: 'right', color: '#8A9BB5' }}><CurrencyDisplay amount={p.costPrice || 0} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#1A2538' }}><CurrencyDisplay amount={p.sellPrice || 0} /></div>
                      {selectedIds.includes(p.id) && amount > 0 && (
                        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500, color: direction === 'increase' ? '#10B981' : '#EF4B4B' }}>
                          → <CurrencyDisplay amount={calculateNewPrice(targetPrice === 'sellPrice' ? p.sellPrice : p.costPrice)} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A2538', margin: 0 }}>Narxni o'zgartirish</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Qaysi narxni?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: targetPrice === 'sellPrice' ? '#4A90E2' : '#fff', color: targetPrice === 'sellPrice' ? '#fff' : '#1A2538', border: targetPrice === 'sellPrice' ? '1px solid #4A90E2' : '1px solid #DCE8F5' }}
                onClick={() => setTargetPrice('sellPrice')}
              >Sotuv narxi</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: targetPrice === 'costPrice' ? '#4A90E2' : '#fff', color: targetPrice === 'costPrice' ? '#fff' : '#1A2538', border: targetPrice === 'costPrice' ? '1px solid #4A90E2' : '1px solid #DCE8F5' }}
                onClick={() => setTargetPrice('costPrice')}
              >Tan narxi</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Qanday o'zgartirish?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: direction === 'increase' ? '#10B981' : '#fff', color: direction === 'increase' ? '#fff' : '#1A2538', border: direction === 'increase' ? '1px solid #10B981' : '1px solid #DCE8F5' }}
                onClick={() => setDirection('increase')}
              >Oshirish (+)</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: direction === 'decrease' ? '#EF4B4B' : '#fff', color: direction === 'decrease' ? '#fff' : '#1A2538', border: direction === 'decrease' ? '1px solid #EF4B4B' : '1px solid #DCE8F5' }}
                onClick={() => setDirection('decrease')}
              >Tushirish (-)</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Birlik</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: unit === 'percent' ? '#4A90E2' : '#fff', color: unit === 'percent' ? '#fff' : '#1A2538', border: unit === 'percent' ? '1px solid #4A90E2' : '1px solid #DCE8F5' }}
                onClick={() => setUnit('percent')}
              >Foiz (%)</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, backgroundColor: unit === 'fixed' ? '#4A90E2' : '#fff', color: unit === 'fixed' ? '#fff' : '#1A2538', border: unit === 'fixed' ? '1px solid #4A90E2' : '1px solid #DCE8F5' }}
                onClick={() => setUnit('fixed')}
              >Summa</button>
            </div>
          </div>

          <FormInput 
            label="O'zgarish miqdori" 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder={unit === 'percent' ? 'Masalan: 10' : 'Masalan: 5000'}
          />

          <div style={{ padding: '16px', backgroundColor: '#F4F8FF', borderRadius: '12px', border: '1px solid #DCE8F5' }}>
            <div style={{ fontWeight: 600, color: '#4A90E2', fontSize: 14 }}>Tanlanganlar: {selectedIds.length} ta</div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: 'auto', fontWeight: 600 }} 
            onClick={handleApply}
            disabled={isProcessing || selectedIds.length === 0 || !amount}
          >
            {isProcessing ? 'Bajarilmoqda...' : 'Tasdiqlash va saqlash'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Revaluation;
