import React, { useState } from 'react';
import { useWarehouse } from '../../context/WarehouseContext';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, runTransaction } from 'firebase/firestore';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import { ArrowRight, Search, CheckCircle } from 'lucide-react';

const TransferDrawer = ({ isOpen, onClose }) => {
  const { warehouses } = useWarehouse();
  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async () => {
    if (!search.trim() || !storeId) return;
    try {
      // Just a simple search on client or fetch all and filter. 
      // For a robust system, we might need a separate search, but since this is a drawer, let's fetch matching barcode or name
      const q = query(collection(db, `users/${storeId}/products`), where('status', '==', 'active'));
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
      ).slice(0, 5);
      
      setSearchResults(results);
      if (results.length === 0) {
        addToast('Mahsulot topilmadi', 'warning');
      }
    } catch(e) {
      addToast(e.message, 'error');
    }
  };

  const handleTransfer = async () => {
    if (!sourceId || !destId) {
      addToast('Omborlarni tanlang', 'warning');
      return;
    }
    if (sourceId === destId) {
      addToast('Bir xil ombor tanlandi', 'warning');
      return;
    }
    if (!selectedProduct) {
      addToast('Mahsulot tanlang', 'warning');
      return;
    }
    const numQty = Number(qty);
    if (!numQty || numQty <= 0) {
      addToast('To\'g\'ri miqdor kiriting', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, `users/${storeId}/products`, selectedProduct.id);
        const prodSnap = await transaction.get(prodRef);
        
        if (!prodSnap.exists()) throw new Error('Mahsulot topilmadi');
        
        const data = prodSnap.data();
        const sourceStock = data.stockByWarehouse?.[sourceId] || 0;
        const destStock = data.stockByWarehouse?.[destId] || 0;
        
        if (sourceStock < numQty) {
          throw new Error('Tanlangan omborda yetarli qoldiq yo\'q (Mavjud: ' + sourceStock + ')');
        }
        
        transaction.update(prodRef, {
          [`stockByWarehouse.${sourceId}`]: sourceStock - numQty,
          [`stockByWarehouse.${destId}`]: destStock + numQty,
          updatedAt: new Date().toISOString()
        });
      });
      
      addToast('Muvaffaqiyatli ko\'chirildi!', 'success');
      setSearch('');
      setSearchResults([]);
      setSelectedProduct(null);
      setQty('');
    } catch(err) {
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Drawer position="right" isOpen={isOpen} onClose={onClose} title="Stok Ko'chirish">
      <div className="flex-col" style={{ gap: '1.5rem', paddingBottom: '2rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div className="flex-col" style={{ gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Qaysi ombordan</label>
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <option value="">-- Tanlang --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <ArrowRight size={20} color="var(--text-secondary)" style={{ marginTop: '1.5rem' }} />
          <div className="flex-col" style={{ gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Qaysi omborga</label>
            <select value={destId} onChange={e => setDestId(e.target.value)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <option value="">-- Tanlang --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>

        {sourceId && destId && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mahsulotni qidiring</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Nomi yoki shtrix-kodi..."
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
              />
              <button className="btn btn-outline" onClick={handleSearch}><Search size={18}/></button>
            </div>
            
            {searchResults.length > 0 && !selectedProduct && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {searchResults.map(p => (
                  <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.barcode}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mavjud qoldiq:</div>
                      <div style={{ fontWeight: 600, color: (p.stockByWarehouse?.[sourceId] || 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {p.stockByWarehouse?.[sourceId] || 0} {p.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {selectedProduct && (
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', position: 'relative' }}>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--danger)' }}
                >✕</button>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  Yuboruvchi ombordagi qoldiq: <strong>{selectedProduct.stockByWarehouse?.[sourceId] || 0} {selectedProduct.unit}</strong>
                </div>
                
                <FormInput 
                  label={`Ko'chiriladigan miqdor (${selectedProduct.unit})`} 
                  type="number" 
                  value={qty} 
                  onChange={e => setQty(e.target.value)} 
                />
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '2rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Yopish</button>
          <button className="btn btn-primary" onClick={handleTransfer} disabled={isProcessing || !selectedProduct || !qty || sourceId === destId}>
            {isProcessing ? 'Bajarilmoqda...' : 'Ko\'chirish'}
          </button>
        </div>

      </div>
    </Drawer>
  );
};

export default TransferDrawer;
