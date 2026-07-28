import React, { useState, useEffect, useDeferredValue, useCallback, useRef, memo } from 'react';
import { Search, Save, Package } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, updateDoc, writeBatch } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useToast } from '../../context/ToastContext';
import AnimatedNumber from '../../components/AnimatedNumber';
import { useVirtualizer } from '@tanstack/react-virtual';

// Memoized Row Component
const ProductRow = memo(({ 
  product, 
  isSelected, 
  toggleSelect, 
  currentStock, 
  inputValue, 
  handleStockChange, 
  saveStock, 
  updatingId,
  style 
}) => {
  const hasChanged = inputValue !== '' && Number(inputValue) !== Number(currentStock);
  
  return (
    <div style={{ ...style, display: 'flex', borderBottom: '1px solid var(--border-color)', alignItems: 'center', padding: '0 1rem' }}>
      <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => toggleSelect(product.id)}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      </div>
      <div style={{ flex: 2, fontWeight: 600, color: 'var(--text-main)', minWidth: 0, paddingRight: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
            <Package size={16} />
          </div>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</span>
        </div>
      </div>
      <div style={{ flex: 1.5, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 13, minWidth: 0 }}>
        {product.barcode || '-'}
      </div>
      <div style={{ flex: 1.5, textAlign: 'center', fontWeight: 600, color: 'var(--primary)', fontSize: '1.1rem', minWidth: 0 }}>
        <AnimatedNumber value={currentStock} /> <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>{product.unit || 'dona'}</span>
      </div>
      <div style={{ width: '150px', flexShrink: 0, padding: '0 10px' }}>
        <input 
          type="number"
          value={inputValue !== undefined ? inputValue : ''}
          onChange={(e) => handleStockChange(product.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasChanged && updatingId !== product.id) saveStock(product);
          }}
          placeholder="Miqdor"
          style={{ 
            padding: '8px 12px', 
            width: '100%', 
            textAlign: 'center', 
            border: hasChanged ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            fontWeight: 600,
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-main)'
          }}
        />
      </div>
      <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>
        <button 
          className={`btn ${hasChanged ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => saveStock(product)}
          disabled={!hasChanged || updatingId === product.id}
          style={{ padding: '0.4rem 1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
        >
          {updatingId === product.id ? '...' : <><Save size={16} /> Saqlash</>}
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
         prevProps.currentStock === nextProps.currentStock &&
         prevProps.inputValue === nextProps.inputValue &&
         prevProps.updatingId === nextProps.updatingId &&
         prevProps.style.top === nextProps.style.top;
});

const StockUpdate = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search); // Smooth typing
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Local state for stock inputs before saving
  const [stockInputs, setStockInputs] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkQty, setBulkQty] = useState('');

  const { userProfile } = useRoles();
  const { selectedWarehouseId } = useWarehouse();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;
  const parentRef = useRef(null);

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/products`)), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      
      // Initialize stock inputs for any that haven't been touched
      setStockInputs(prev => {
        const newInputs = { ...prev };
        prods.forEach(p => {
          if (newInputs[p.id] === undefined) {
            newInputs[p.id] = p.stockByWarehouse?.[selectedWarehouseId] ?? p.stock ?? 0;
          }
        });
        return newInputs;
      });
      
      setLoading(false);
    });

    return () => unsub();
  }, [storeId, selectedWarehouseId]);

  const handleStockChange = useCallback((id, value) => {
    setStockInputs(prev => ({
      ...prev,
      [id]: value === '' ? '' : Number(value)
    }));
  }, []);

  const saveStock = useCallback(async (product) => {
    const newValue = stockInputs[product.id];
    if (newValue === '' || isNaN(newValue)) {
      addToast("Noto'g'ri qiymat", "error");
      return;
    }
    
    setUpdatingId(product.id);
    try {
      const productRef = doc(db, `users/${storeId}/products`, product.id);
      await updateDoc(productRef, {
        [`stockByWarehouse.${selectedWarehouseId}`]: Number(newValue)
      });
      addToast(`${product.name} qoldig'i yangilandi`, "success");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setUpdatingId(null);
    }
  }, [stockInputs, storeId, selectedWarehouseId, addToast]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => 
      p.status === 'active' && 
      (p.name.toLowerCase().includes(deferredSearch.toLowerCase()) || (p.barcode || '').includes(deferredSearch))
    );
  }, [products, deferredSearch]);

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredProducts]);

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

  const handleBulkSave = async () => {
    if (bulkQty === '' || isNaN(bulkQty)) {
      addToast("Ommaviy miqdorni kiriting", "warning");
      return;
    }
    
    setUpdatingId('bulk');
    try {
      const idsArray = Array.from(selectedIds);
      const chunkSize = 400; // Firebase batch limit is 500
      
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const productRef = doc(db, `users/${storeId}/products`, id);
          batch.update(productRef, {
            [`stockByWarehouse.${selectedWarehouseId}`]: Number(bulkQty)
          });
        });
        await batch.commit();
      }
      
      addToast(`${selectedIds.size} ta mahsulot qoldig'i yangilandi`, "success");
      
      setStockInputs(prev => {
        const next = { ...prev };
        idsArray.forEach(id => { next[id] = Number(bulkQty); });
        return next;
      });
      
      setSelectedIds(new Set());
      setBulkQty('');
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setUpdatingId(null);
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
          <h1 className="page-title">Tezkor Qoldiq</h1>
          <p className="page-subtitle">Mahsulotlar sonini to'g'ridan-to'g'ri o'zgartirish</p>
        </div>
      </div>

      <div className="page-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
        <div className="page-card-header" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: '300px' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Mahsulot yoki shtrix kodni qidiring..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Ombor: <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedWarehouseId === 'main' ? 'Asosiy Ombor' : selectedWarehouseId}</span>
          </div>
          
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)', marginRight: '1rem' }}>{selectedIds.size} ta tanlandi</span>
              <input 
                type="number"
                placeholder="Yangi qoldiq..."
                value={bulkQty}
                onChange={e => setBulkQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !updatingId) handleBulkSave();
                }}
                style={{ padding: '0.4rem 0.75rem', width: '130px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleBulkSave}
                disabled={updatingId === 'bulk'}
                style={{ padding: '0.4rem 1rem' }}
              >
                {updatingId === 'bulk' ? '...' : 'Saqlash'}
              </button>
            </div>
          )}
        </div>

        {/* Custom Virtualized Table implementation */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', padding: '12px 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', flexShrink: 0 }}>
            <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
              <input 
                type="checkbox" 
                checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                onChange={handleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </div>
            <div style={{ flex: 2, minWidth: 0, paddingRight: '10px' }}>Mahsulot</div>
            <div style={{ flex: 1.5, minWidth: 0 }}>Shtrix kod</div>
            <div style={{ flex: 1.5, textAlign: 'center', minWidth: 0 }}>Joriy Qoldiq</div>
            <div style={{ width: '150px', padding: '0 10px', flexShrink: 0 }}>Yangi Qoldiq</div>
            <div style={{ width: '100px', textAlign: 'right', flexShrink: 0 }}>Amal</div>
          </div>

          {/* Virtualized Body */}
          <div 
            ref={parentRef} 
            style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          >
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {loading ? 'Yuklanmoqda...' : 'Hech narsa topilmadi'}
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
                  const currentStock = p.stockByWarehouse?.[selectedWarehouseId] ?? p.stock ?? 0;
                  const inputValue = stockInputs[p.id];
                  
                  return (
                    <ProductRow 
                      key={virtualRow.key}
                      product={p}
                      isSelected={selectedIds.has(p.id)}
                      toggleSelect={toggleSelect}
                      currentStock={currentStock}
                      inputValue={inputValue}
                      handleStockChange={handleStockChange}
                      saveStock={saveStock}
                      updatingId={updatingId}
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
    </div>
  );
};

export default StockUpdate;

