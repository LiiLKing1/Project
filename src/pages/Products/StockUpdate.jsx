import React, { useState, useEffect } from 'react';
import { Search, Save, Package } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, updateDoc, writeBatch } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useToast } from '../../context/ToastContext';
import AnimatedNumber from '../../components/AnimatedNumber';

const StockUpdate = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Local state for stock inputs before saving
  const [stockInputs, setStockInputs] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkQty, setBulkQty] = useState('');

  const { userProfile } = useRoles();
  const { selectedWarehouseId } = useWarehouse();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

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

  const handleStockChange = (id, value) => {
    setStockInputs(prev => ({
      ...prev,
      [id]: value === '' ? '' : Number(value)
    }));
  };

  const saveStock = async (product) => {
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
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSave = async () => {
    if (bulkQty === '' || isNaN(bulkQty)) {
      addToast("Ommaviy miqdorni kiriting", "warning");
      return;
    }
    
    setUpdatingId('bulk');
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const productRef = doc(db, `users/${storeId}/products`, id);
        batch.update(productRef, {
          [`stockByWarehouse.${selectedWarehouseId}`]: Number(bulkQty)
        });
      });
      await batch.commit();
      addToast(`${selectedIds.length} ta mahsulot qoldig'i yangilandi`, "success");
      
      setStockInputs(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => { next[id] = Number(bulkQty); });
        return next;
      });
      
      setSelectedIds([]);
      setBulkQty('');
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.status === 'active' && 
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tezkor Qoldiq</h1>
          <p className="page-subtitle">Mahsulotlar sonini to'g'ridan-to'g'ri o'zgartirish</p>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card-header" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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
          
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)', marginRight: '1rem' }}>{selectedIds.length} ta tanlandi</span>
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

        <div style={{ overflowX: 'auto' }}>
          <table className="page-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th>Mahsulot</th>
                <th>Shtrix kod</th>
                <th style={{ textAlign: 'center' }}>Joriy Qoldiq</th>
                <th style={{ width: '200px' }}>Yangi Qoldiq</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {loading ? 'Yuklanmoqda...' : 'Hech narsa topilmadi'}
                  </td>
                </tr>
              ) : filteredProducts.map(p => {
                const currentStock = p.stockByWarehouse?.[selectedWarehouseId] ?? p.stock ?? 0;
                const inputValue = stockInputs[p.id];
                const hasChanged = inputValue !== '' && Number(inputValue) !== Number(currentStock);
                
                return (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <Package size={16} />
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 13 }}>{p.barcode || '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary)', fontSize: '1.1rem' }}>
                      <AnimatedNumber value={currentStock} /> <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>{p.unit || 'dona'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="number"
                          value={inputValue !== undefined ? inputValue : ''}
                          onChange={(e) => handleStockChange(p.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasChanged && !updatingId) saveStock(p);
                          }}
                          placeholder="Miqdor"
                          style={{ 
                            padding: '8px 12px', 
                            width: '100px', 
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
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className={`btn ${hasChanged ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => saveStock(p)}
                        disabled={!hasChanged || updatingId === p.id}
                        style={{ padding: '0.4rem 1rem', minWidth: '90px' }}
                      >
                        {updatingId === p.id ? '...' : <><Save size={16} style={{ marginRight: '4px' }}/> Saqlash</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockUpdate;
