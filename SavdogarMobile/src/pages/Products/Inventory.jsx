import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, Search, Save, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, writeBatch, serverTimestamp } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isTakingInventory, setIsTakingInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState({}); // { [productId]: actualQty }
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { userProfile } = useRoles();
  const { selectedWarehouseId } = useWarehouse();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/products`)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [storeId]);

  const handleStartInventory = () => {
    setIsTakingInventory(true);
    setInventoryItems({});
  };

  const handleCancelInventory = async () => {
    if (Object.keys(inventoryItems).length > 0) {
      if (!(await confirm({ message: 'Kiritilgan ma\'lumotlar bekor qilinadi. Rozimisiz?' }))) return;
    }
    setIsTakingInventory(false);
    setInventoryItems({});
  };

  const handleQtyChange = (productId, val) => {
    setInventoryItems(prev => ({
      ...prev,
      [productId]: val === '' ? '' : Number(val)
    }));
  };

  const handleCompleteInventory = async () => {
    if (Object.keys(inventoryItems).length === 0) {
      addToast('Hech qanday mahsulot tekshirilmadi', 'warning');
      return;
    }
    if (!(await confirm({ message: 'Kiritilgan qoldiqlar asosida ombor yangilanadi. Tasdiqlaysizmi?' }))) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const inventoryLogRef = doc(collection(db, `users/${storeId}/inventoryChecks`));
      
      const changes = [];
      let totalDiscrepancyAmount = 0;

      for (const [productId, actualQty] of Object.entries(inventoryItems)) {
        if (actualQty === '' || isNaN(actualQty)) continue;
        
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        const expectedQty = Number(product.stockByWarehouse?.[selectedWarehouseId] || 0);
        const actual = Number(actualQty);
        const difference = actual - expectedQty;

        if (difference !== 0) {
          changes.push({
            productId,
            name: product.name,
            expectedQty,
            actualQty: actual,
            difference,
            valueDifference: difference * (product.costPrice || 0)
          });
          totalDiscrepancyAmount += difference * (product.costPrice || 0);

          const productRef = doc(db, `users/${storeId}/products`, productId);
          batch.update(productRef, {
            [`stockByWarehouse.${selectedWarehouseId}`]: actual
          });
        }
      }

      if (changes.length > 0) {
        batch.set(inventoryLogRef, {
          warehouseId: selectedWarehouseId,
          changes,
          totalDiscrepancyAmount,
          createdBy: userProfile?.name || 'Admin',
          createdAt: serverTimestamp()
        });

        await batch.commit();
        addToast(`Inventarizatsiya yakunlandi. ${changes.length} ta mahsulot yangilandi`, 'success');
      } else {
        addToast('Barcha tovarlar qoldig\'i to\'g\'ri, o\'zgarishlar yo\'q', 'info');
      }
      
      setIsTakingInventory(false);
      setInventoryItems({});
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
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
          <h1 className="page-title">Inventarizatsiya</h1>
          <p className="page-subtitle">Ombordagi haqiqiy qoldiqlarni tekshirish va to'g'irlash</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isTakingInventory ? (
            <button className="btn btn-primary" onClick={handleStartInventory}>
              <PlusCircle size={18}/> Yangi inventarizatsiya
            </button>
          ) : (
            <>
              <button className="btn btn-outline" onClick={handleCancelInventory} disabled={isProcessing}>
                <XCircle size={18}/> Bekor qilish
              </button>
              <button className="btn btn-success" onClick={handleCompleteInventory} disabled={isProcessing}>
                <Save size={18}/> Saqlash
              </button>
            </>
          )}
        </div>
      </div>

      {!isTakingInventory ? (
        <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '50vh' }}>
          <ClipboardList size={64} color="#DCE8F5" />
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A2538' }}>Hozircha inventarizatsiya jarayoni yo'q</div>
          <div style={{ color: '#8A9BB5' }}>Ombordagi tovarlarni tekshirish uchun yangi jarayonni boshlang</div>
        </div>
      ) : (
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
            <div style={{ color: '#8A9BB5', fontSize: 14 }}>
              Ombor: <span style={{ fontWeight: 600, color: '#1A2538' }}>{selectedWarehouseId === 'main' ? 'Asosiy Ombor' : selectedWarehouseId}</span>
            </div>
            <div style={{ color: '#8A9BB5', fontSize: 14 }}>
              Belgilanganlar: <span style={{ fontWeight: 600, color: '#4A90E2' }}>{Object.values(inventoryItems).filter(v => v !== '').length}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="page-table">
              <thead>
                <tr>
                  <th>Mahsulot</th>
                  <th>Shtrix kod</th>
                  <th style={{ textAlign: 'center' }}>Kutilayotgan qoldiq</th>
                  <th style={{ width: '150px' }}>Haqiqiy qoldiq</th>
                  <th style={{ textAlign: 'right' }}>Farq</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#8A9BB5' }}>Hech narsa topilmadi</td>
                  </tr>
                ) : filteredProducts.map(p => {
                  const expected = Number(p.stockByWarehouse?.[selectedWarehouseId] || 0);
                  const actual = inventoryItems[p.id] !== undefined && inventoryItems[p.id] !== '' ? Number(inventoryItems[p.id]) : null;
                  const diff = actual !== null ? actual - expected : null;
                  
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#1A2538' }}>{p.name}</td>
                      <td style={{ color: '#8A9BB5', fontFamily: 'monospace', fontSize: 13 }}>{p.barcode || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#1A2538' }}>{expected} <span style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 400 }}>{p.unit || 'dona'}</span></td>
                      <td>
                        <input 
                          type="number"
                          value={inventoryItems[p.id] !== undefined ? inventoryItems[p.id] : ''}
                          onChange={(e) => handleQtyChange(p.id, e.target.value)}
                          placeholder="Miqdor"
                          style={{ 
                            padding: '8px', 
                            width: '100%', 
                            textAlign: 'center', 
                            border: actual !== null ? '2px solid #4A90E2' : '1px solid #DCE8F5',
                            borderRadius: '8px',
                            outline: 'none',
                            fontWeight: actual !== null ? 600 : 400,
                            color: '#1A2538'
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: diff > 0 ? '#10B981' : diff < 0 ? '#EF4B4B' : '#8A9BB5' }}>
                        {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
