import React, { useState, useEffect, useDeferredValue, useCallback, useRef, memo } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, writeBatch, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Tag, Search, PlusCircle, Save, CheckSquare, Square, CheckCircle } from 'lucide-react';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import FormInput from '../../components/FormInput';
import { useVirtualizer } from '@tanstack/react-virtual';

// Memoized Row Component
const ProductRow = memo(({ 
  product, 
  isSelected, 
  toggleSelect,
  targetPrice,
  amount,
  direction,
  calculateNewPrice,
  style 
}) => {
  return (
    <div style={{ ...style, display: 'flex', borderBottom: '1px solid var(--border-color)', alignItems: 'center', backgroundColor: isSelected ? '#F4F8FF' : 'transparent', padding: '0 1rem' }}>
      <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
        <div onClick={() => toggleSelect(product.id)} style={{ cursor: 'pointer', color: isSelected ? '#4A90E2' : '#8A9BB5', display: 'flex', justifyContent: 'center' }}>
          {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
        </div>
      </div>
      <div style={{ flex: 2, minWidth: 0, paddingRight: '10px' }}>
        <div style={{ fontWeight: 600, color: '#1A2538', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
        <div style={{ fontSize: 13, color: '#8A9BB5', fontFamily: 'monospace' }}>{product.barcode}</div>
      </div>
      <div style={{ flex: 1.5, textAlign: 'right', color: '#8A9BB5', minWidth: 0 }}>
        <CurrencyDisplay amount={product.costPrice || 0} />
      </div>
      <div style={{ flex: 1.5, textAlign: 'right', minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#1A2538' }}><CurrencyDisplay amount={product.sellPrice || 0} /></div>
        {isSelected && amount > 0 && (
          <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500, color: direction === 'increase' ? '#10B981' : '#EF4B4B' }}>
            → <CurrencyDisplay amount={calculateNewPrice(targetPrice === 'sellPrice' ? product.sellPrice : product.costPrice)} />
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
         prevProps.targetPrice === nextProps.targetPrice &&
         prevProps.amount === nextProps.amount &&
         prevProps.direction === nextProps.direction &&
         prevProps.style.top === nextProps.style.top;
});

const Revaluation = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('percent'); // 'percent' or 'fixed'
  const [targetPrice, setTargetPrice] = useState('sellPrice'); // 'sellPrice' or 'costPrice'
  const [direction, setDirection] = useState('increase'); // 'increase' or 'decrease'
  
  const parentRef = useRef(null);

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

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => 
      p.status === 'active' && 
      (p.name.toLowerCase().includes(deferredSearch.toLowerCase()) || (p.barcode || '').includes(deferredSearch))
    );
  }, [products, deferredSearch]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  }, [selectedIds, filteredProducts]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const calculateNewPrice = useCallback((oldPrice) => {
    const val = Number(oldPrice) || 0;
    const change = Number(amount) || 0;
    
    if (change === 0 && direction !== 'exact') return val;

    let newPrice = val;
    if (direction === 'exact') {
      newPrice = change;
    } else if (unit === 'percent') {
      const modifier = (val * change) / 100;
      newPrice = direction === 'increase' ? val + modifier : val - modifier;
    } else {
      newPrice = direction === 'increase' ? val + change : val - change;
    }
    
    return Math.max(0, newPrice); // No negative prices
  }, [amount, direction, unit]);

  const handleApply = async () => {
    if (selectedIds.size === 0) {
      addToast('Mahsulotlarni tanlang', 'warning');
      return;
    }
    if (amount === '' || isNaN(amount) || Number(amount) < 0) {
      addToast('O\'zgarish miqdorini to\'g\'ri kiriting', 'warning');
      return;
    }
    if (!(await confirm({ message: `${selectedIds.size} ta mahsulot narxi o'zgartiriladi. Tasdiqlaysizmi?` }))) return;

    setIsProcessing(true);
    try {
      const idsArray = Array.from(selectedIds);
      const chunkSize = 400;
      
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(id => {
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

        // Add history log to the first chunk
        if (i === 0) {
          const logRef = doc(collection(db, `users/${storeId}/revaluationLogs`));
          batch.set(logRef, {
            productIds: idsArray,
            amount: Number(amount),
            unit,
            targetPrice,
            direction,
            createdBy: userProfile?.name || 'Admin',
            createdAt: serverTimestamp()
          });
        }

        await batch.commit();
      }

      addToast('Narxlar muvaffaqiyatli yangilandi', 'success');
      setSelectedIds(new Set());
      setAmount('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // estimated row height
    overscan: 10,
  });

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
        <div className="page-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
          <div className="page-card-header" style={{ flexShrink: 0 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', padding: '12px 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', flexShrink: 0 }}>
              <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
                <div onClick={toggleSelectAll} style={{ cursor: 'pointer', color: selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? '#4A90E2' : '#8A9BB5', display: 'flex', justifyContent: 'center' }}>
                  {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                </div>
              </div>
              <div style={{ flex: 2, minWidth: 0, paddingRight: '10px' }}>Mahsulot</div>
              <div style={{ flex: 1.5, textAlign: 'right', minWidth: 0 }}>Tan narx</div>
              <div style={{ flex: 1.5, textAlign: 'right', minWidth: 0 }}>Sotuv narx</div>
            </div>

            {/* Virtualized Body */}
            <div 
              ref={parentRef} 
              style={{ flex: 1, overflow: 'auto', position: 'relative' }}
            >
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Hech narsa topilmadi
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const p = filteredProducts[virtualRow.index];
                    return (
                      <ProductRow 
                        key={virtualRow.key}
                        product={p}
                        isSelected={selectedIds.has(p.id)}
                        toggleSelect={toggleSelect}
                        targetPrice={targetPrice}
                        amount={amount}
                        direction={direction}
                        calculateNewPrice={calculateNewPrice}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
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
                style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, backgroundColor: direction === 'increase' ? '#10B981' : '#fff', color: direction === 'increase' ? '#fff' : '#1A2538', border: direction === 'increase' ? '1px solid #10B981' : '1px solid #DCE8F5' }}
                onClick={() => setDirection('increase')}
              >Oshirish (+)</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, backgroundColor: direction === 'decrease' ? '#EF4B4B' : '#fff', color: direction === 'decrease' ? '#fff' : '#1A2538', border: direction === 'decrease' ? '1px solid #EF4B4B' : '1px solid #DCE8F5' }}
                onClick={() => setDirection('decrease')}
              >Tushirish (-)</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, backgroundColor: direction === 'exact' ? '#4A90E2' : '#fff', color: direction === 'exact' ? '#fff' : '#1A2538', border: direction === 'exact' ? '1px solid #4A90E2' : '1px solid #DCE8F5' }}
                onClick={() => setDirection('exact')}
              >Aniq narx (=)</button>
            </div>
          </div>

          {direction !== 'exact' && (
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
          )}

          <FormInput 
            label={direction === 'exact' ? "Yangi narxni kiriting" : "O'zgarish miqdori"} 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder={unit === 'percent' ? 'Masalan: 10' : 'Masalan: 5000'}
          />

          <div style={{ padding: '16px', backgroundColor: '#F4F8FF', borderRadius: '12px', border: '1px solid #DCE8F5' }}>
            <div style={{ fontWeight: 600, color: '#4A90E2', fontSize: 14 }}>Tanlanganlar: {selectedIds.size} ta</div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: 'auto', fontWeight: 600 }} 
            onClick={handleApply}
            disabled={isProcessing || selectedIds.size === 0 || amount === ''}
          >
            {isProcessing ? 'Bajarilmoqda...' : 'Tasdiqlash va saqlash'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Revaluation;
