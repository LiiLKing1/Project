import React, { useState, useEffect } from 'react';
import { PackageMinus, Search, SearchX } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useToast } from '../../context/ToastContext';
import FormInput from '../../components/FormInput';
import CustomSelect from '../../components/CustomSelect';

const WriteOff = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { userProfile } = useRoles();
  const { selectedWarehouseId } = useWarehouse();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;
    const unsub = onSnapshot(query(collection(db, `users/${storeId}/products`)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [storeId]);

  const handleSearch = () => {
    if (!search.trim()) return;
    const results = products.filter(p => 
      p.status === 'active' && 
      (p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))
    ).slice(0, 5);
    
    setSearchResults(results);
    if (results.length === 0) {
      addToast('Mahsulot topilmadi', 'warning');
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearch('');
    setSearchResults([]);
    setQty('');
    setReason('');
  };

  const handleWriteOff = async () => {
    if (!selectedProduct) return;
    
    const numQty = Number(qty);
    if (!numQty || numQty <= 0) {
      addToast('Yaroqli miqdor kiriting', 'warning');
      return;
    }
    if (!reason.trim()) {
      addToast('Sababni ko\'rsating', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, `users/${storeId}/products`, selectedProduct.id);
        const prodSnap = await transaction.get(prodRef);
        
        if (!prodSnap.exists()) throw new Error('Mahsulot topilmadi');
        
        const data = prodSnap.data();
        const currentStock = data.stockByWarehouse?.[selectedWarehouseId] || 0;
        
        if (currentStock < numQty) {
          throw new Error(`Omborda yetarli qoldiq yo'q (Mavjud: ${currentStock})`);
        }
        
        transaction.update(prodRef, {
          [`stockByWarehouse.${selectedWarehouseId}`]: currentStock - numQty,
          updatedAt: new Date().toISOString()
        });

        const writeOffRef = doc(collection(db, `users/${storeId}/writeOffs`));
        transaction.set(writeOffRef, {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          warehouseId: selectedWarehouseId,
          qty: numQty,
          costPrice: selectedProduct.costPrice || 0,
          totalLoss: numQty * (selectedProduct.costPrice || 0),
          reason,
          createdBy: userProfile?.name || 'Admin',
          createdAt: serverTimestamp()
        });
      });
      
      addToast('Mahsulot hisobdan chiqarildi (Spisaniya qılındi)', 'success');
      setSelectedProduct(null);
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
          <h1 className="page-title">Hisobdan chiqarish (Spisaniya)</h1>
          <p className="page-subtitle">Yaroqsiz, yo'qolgan yoki muddati o'tgan mahsulotlarni ombordan chiqarish</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        <div className="page-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A2538', margin: 0 }}>Mahsulot qidirish</h2>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8A9BB5' }} />
              <input 
                type="text" 
                placeholder="Nomi yoki shtrix-kodi..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1px solid #DCE8F5', backgroundColor: '#fff', outline: 'none', color: '#1A2538' }}
              />
            </div>
            <button className="btn btn-outline" onClick={handleSearch}>Qidirish</button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ border: '1px solid #DCE8F5', borderRadius: '12px', overflow: 'hidden' }}>
              {searchResults.map((p, idx) => (
                <div key={p.id} onClick={() => handleSelectProduct(p)} style={{ padding: '12px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #DCE8F5' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F6FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#1A2538' }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: '#8A9BB5', fontFamily: 'monospace' }}>{p.barcode || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#8A9BB5' }}>Ombordagi qoldiq:</div>
                    <div style={{ fontWeight: 600, color: (p.stockByWarehouse?.[selectedWarehouseId] || 0) > 0 ? '#10B981' : '#EF4B4B' }}>
                      {p.stockByWarehouse?.[selectedWarehouseId] || 0} {p.unit || 'dona'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', minHeight: '300px' }}>
          {selectedProduct ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#4A90E2', margin: '0 0 4px 0' }}>{selectedProduct.name}</h2>
                  <div style={{ color: '#8A9BB5', fontSize: 14 }}>Mavjud qoldiq: <strong style={{ color: '#1A2538' }}>{selectedProduct.stockByWarehouse?.[selectedWarehouseId] || 0} {selectedProduct.unit || 'dona'}</strong></div>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedProduct(null)} style={{ padding: '8px', color: '#8A9BB5', borderColor: '#DCE8F5' }}>✕</button>
              </div>

              <FormInput 
                label={`Chiqariladigan miqdor (${selectedProduct.unit || 'dona'})`} 
                type="number" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                placeholder="Masalan: 5"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#1A2538' }}>Sabab</label>
                <CustomSelect 
                  value={reason} 
                  onChange={v => setReason(v)} 
                  options={[
                    { value: '', label: '-- Sababni tanlang --' },
                    { value: 'Yaroqsiz / Brak', label: 'Yaroqsiz / Brak' },
                    { value: 'Muddati o\'tgan', label: 'Muddati o\'tgan' },
                    { value: 'Yo\'qolgan', label: 'Yo\'qolgan / O\'g\'irlangan' },
                    { value: 'Boshqa', label: 'Boshqa sabab' }
                  ]}
                />
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '16px', marginTop: 'auto', backgroundColor: '#EF4B4B' }}
                onClick={handleWriteOff}
                disabled={isProcessing || !qty || !reason}
              >
                {isProcessing ? 'Bajarilmoqda...' : 'Hisobdan chiqarish'}
              </button>
            </>
          ) : (
            <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
              <PackageMinus size={48} color="var(--border-color)" />
              <div style={{ fontSize: '1.125rem', fontWeight: 500 }}>Mahsulot tanlanmagan</div>
              <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>Chap tomondan kerakli mahsulotni toping va tanlang</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WriteOff;
