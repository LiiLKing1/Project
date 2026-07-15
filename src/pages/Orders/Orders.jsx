import React, { useState, useEffect } from 'react';
import { PackageOpen, Search, Plus, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, getDocs } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { useWarehouse } from '../../context/WarehouseContext';

const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;

  // New Order State
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState([]); // { id?, name, qty, costPrice, isNewProduct }
  
  // New Supplier Quick Add State (Bottom Drawer)
  const [isSupplierDrawerOpen, setIsSupplierDrawerOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ fullName: '', phone: '' });

  // New Product Quick Add State (Left Drawer)
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({ name: '', costPrice: '', qty: '', note: '', unit: 'dona' });

  // Product Search inside Order Drawer
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!storeId) return;

    const unsubOrders = onSnapshot(query(collection(db, `users/${storeId}/purchaseOrders`), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSuppliers = onSnapshot(query(collection(db, `users/${storeId}/suppliers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubOrders(); unsubSuppliers(); unsubProducts(); };
  }, [storeId]);

  // Handle Quick Add Supplier
  const handleQuickAddSupplier = async () => {
    if (!newSupplierData.fullName || !newSupplierData.phone) {
      addToast('Ism va telefon kiritilishi shart', 'warning');
      return;
    }
    try {
      const newRef = doc(collection(db, `users/${storeId}/suppliers`));
      await runTransaction(db, async (transaction) => {
        transaction.set(newRef, {
          fullName: newSupplierData.fullName,
          phone: newSupplierData.phone,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      });
      addToast('Yetkazib beruvchi qo\'shildi', 'success');
      setOrderSupplierId(newRef.id);
      setIsSupplierDrawerOpen(false);
      setNewSupplierData({ fullName: '', phone: '' });
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Handle Quick Add Product
  const handleQuickAddProduct = () => {
    if (!newProductData.name || !newProductData.costPrice || !newProductData.qty) {
      addToast('Barcha maydonlar kiritilishi shart', 'warning');
      return;
    }
    
    setOrderItems(prev => [...prev, {
      id: 'temp-' + Date.now(), // temporary ID
      name: newProductData.name,
      qty: Number(newProductData.qty),
      costPrice: Number(newProductData.costPrice),
      isNewProduct: true,
      note: newProductData.note,
      unit: newProductData.unit || 'dona'
    }]);
    
    setIsProductDrawerOpen(false);
    setNewProductData({ name: '', costPrice: '', qty: '', note: '', unit: 'dona' });
  };

  const handleAddProductToOrder = (product) => {
    setOrderItems(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { id: product.id, name: product.name, qty: 1, costPrice: product.costPrice || 0, isNewProduct: false, unit: product.unit || 'dona' }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const updateOrderItem = (id, field, value) => {
    setOrderItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const removeOrderItem = (id) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateOrder = async () => {
    if (!orderSupplierId) {
      addToast('Yetkazib beruvchi tanlanishi shart', 'error');
      return;
    }
    if (orderItems.length === 0) {
      addToast('Buyurtmada kamida bitta mahsulot bo\'lishi shart', 'error');
      return;
    }

    const totalAmount = orderItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.costPrice)), 0);

    try {
      const orderRef = doc(collection(db, `users/${storeId}/purchaseOrders`));
      await runTransaction(db, async (transaction) => {
        transaction.set(orderRef, {
          supplierId: orderSupplierId,
          items: orderItems,
          totalAmount,
          status: 'pending',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });
      });
      addToast('Buyurtma yaratildi', 'success');
      setIsOrderDrawerOpen(false);
      setOrderItems([]);
      setOrderSupplierId('');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReceiveOrder = async (order) => {
    if (!window.confirm('Buyurtmani qabul qilishni tasdiqlaysizmi? Qoldiqlar oshadi.')) return;

    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, `users/${storeId}/purchaseOrders`, order.id);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error('Buyurtma topilmadi');
        if (orderSnap.data().status === 'received') throw new Error('Buyurtma allaqachon qabul qilingan');

        // Prepare product updates
        const items = orderSnap.data().items;
        
        for (const item of items) {
          if (item.isNewProduct) {
            // Create new product
            const newProdRef = doc(collection(db, `users/${storeId}/products`));
            const barcode = '200' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
            transaction.set(newProdRef, {
              name: item.name,
              barcode: barcode,
              costPrice: Number(item.costPrice || 0),
              sellPrice: Number(item.costPrice || 0) * 1.2, // default 20% margin
              stockByWarehouse: { [selectedWarehouseId]: Number(item.qty || 0) },
              minStock: 5,
              status: 'active',
              categoryId: '',
              createdAt: new Date().toISOString()
            });
          } else {
            // Update existing product
            const prodRef = doc(db, `users/${storeId}/products`, item.id);
            const prodSnap = await transaction.get(prodRef);
            if (prodSnap.exists()) {
              transaction.update(prodRef, {
                [`stockByWarehouse.${selectedWarehouseId}`]: Number(prodSnap.data().stockByWarehouse?.[selectedWarehouseId] || 0) + Number(item.qty || 0),
                costPrice: Number(item.costPrice || 0)
              });
            }
          }
        }

        // Mark order as received
        transaction.update(orderRef, {
          status: 'received',
          receivedAt: new Date().toISOString(),
          receivedBy: userProfile?.name || 'Admin'
        });
      });

      addToast('Buyurtma muvaffaqiyatli qabul qilindi', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm('Buyurtmani bekor qilishni tasdiqlaysizmi?')) return;

    try {
      const orderRef = doc(db, `users/${storeId}/purchaseOrders`, order.id);
      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error('Buyurtma topilmadi');
        if (orderSnap.data().status !== 'pending') throw new Error('Faqat kutilayotgan buyurtmalarni bekor qilish mumkin');

        transaction.update(orderRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: userProfile?.name || 'Admin'
        });
      });
      addToast('Buyurtma bekor qilindi', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.status.includes(search.toLowerCase()) || 
    (suppliers.find(s => s.id === o.supplierId)?.fullName || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredProdSearch = products.filter(p => p.status === 'active' && p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 50);

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Tovar Buyurtmalari</h1>
        <button className="btn btn-primary" onClick={() => setIsOrderDrawerOpen(true)}>
          <Plus size={18} /> Yangi buyurtma
        </button>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Qidirish (yetkazib beruvchi, holat)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Sana</th>
                <th style={{ padding: '1rem' }}>Yetkazib beruvchi</th>
                <th style={{ padding: '1rem' }}>Summa</th>
                <th style={{ padding: '1rem' }}>Holat</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Buyurtmalar yo'q</td></tr>
              ) : filteredOrders.map(order => {
                const supplier = suppliers.find(s => s.id === order.supplierId);
                return (
                  <React.Fragment key={order.id}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: expandedId === order.id ? 'var(--bg-main)' : 'transparent' }} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      <td style={{ padding: '1rem' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{supplier?.fullName || 'Noma\'lum'}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}><CurrencyDisplay amount={order.totalAmount} /></td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={{ backgroundColor: order.status === 'received' ? 'var(--success)' : order.status === 'cancelled' ? 'var(--danger)' : 'var(--warning)', color: '#fff' }}>
                          {order.status === 'received' ? 'Qabul qilingan' : order.status === 'cancelled' ? 'Bekor qilingan' : 'Kutilmoqda'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        {order.status === 'pending' && (
                          <>
                            <button className="btn btn-success" style={{ padding: '0.5rem 1rem' }} onClick={(e) => { e.stopPropagation(); handleReceiveOrder(order); }}>
                              <CheckCircle size={16} /> Qabul qilish
                            </button>
                            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}>
                              <Trash2 size={16} /> Bekor qilish
                            </button>
                          </>
                        )}
                        {expandedId === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0 }}>
                          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderBottom: '2px solid var(--primary)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Buyurtma tarkibi:</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-surface)' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ padding: '0.75rem' }}>Mahsulot</th>
                                  <th style={{ padding: '0.75rem' }}>Soni</th>
                                  <th style={{ padding: '0.75rem' }}>Tannarx</th>
                                  <th style={{ padding: '0.75rem' }}>Jami</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                      {item.name} {item.isNewProduct && <span className="badge" style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.65rem' }}>Yangi</span>}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{item.qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit || 'dona'}</span></td>
                                    <td style={{ padding: '0.75rem' }}><CurrencyDisplay amount={item.costPrice} /></td>
                                    <td style={{ padding: '0.75rem', fontWeight: 600 }}><CurrencyDisplay amount={item.qty * item.costPrice} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Main Order Drawer */}
      <Drawer position="right" isOpen={isOrderDrawerOpen} onClose={() => setIsOrderDrawerOpen(false)} title="Yangi Buyurtma">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Supplier Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Yetkazib beruvchi *</label>
              <button 
                className="btn btn-ghost" 
                style={{ color: 'var(--primary)', fontSize: '0.875rem', padding: 0 }} 
                onClick={() => setIsSupplierDrawerOpen(true)}
              >
                + Yangi qo'shish
              </button>
            </div>
            <select 
              value={orderSupplierId} 
              onChange={e => setOrderSupplierId(e.target.value)}
              style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="">-- Tanlang --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName} {s.companyName ? `(${s.companyName})` : ''}</option>)}
            </select>
          </div>

          {/* Product Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mahsulot qidirish</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Nomi orqali..." 
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
              />
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowProductDropdown(!showProductDropdown)} 
                style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.5rem', color: 'var(--text-secondary)' }}
              >
                <ChevronDown size={18} />
              </button>
              {showProductDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '0.5rem', boxShadow: 'var(--shadow-md)', maxHeight: '250px', overflowY: 'auto' }}>
                  {filteredProdSearch.map(p => (
                    <div key={p.id} onClick={() => handleAddProductToOrder(p)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.25rem' }}>Tannarx: <CurrencyDisplay amount={p.costPrice} /></div>
                    </div>
                  ))}
                  {filteredProdSearch.length === 0 && productSearch.trim() !== '' && (
                    <div style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                      Topilmadi
                    </div>
                  )}
                  <div 
                    onClick={() => { setIsProductDrawerOpen(true); setShowProductDropdown(false); setProductSearch(''); }} 
                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500, textAlign: 'center', backgroundColor: 'var(--bg-main)', position: 'sticky', bottom: 0 }}
                  >
                    + Yangi mahsulot yaratish
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Table */}
          {orderItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontWeight: 600 }}>Tarkib:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orderItems.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.name}</div>
                      {item.isNewProduct && <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>Yangi</span>}
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        placeholder="Soni"
                        value={item.qty}
                        onChange={e => updateOrderItem(item.id, 'qty', e.target.value)}
                        style={{ width: '100%', padding: '0.25rem', paddingRight: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      />
                      <span style={{ position: 'absolute', right: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit || 'dona'}</span>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Tannarx"
                      value={item.costPrice}
                      onChange={e => updateOrderItem(item.id, 'costPrice', e.target.value)}
                      style={{ width: '100%', padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                    />
                    <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem' }} onClick={() => removeOrderItem(item.id)}>
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Umumiy summa:</span>
              <span className="h3" style={{ color: 'var(--primary)' }}>
                <CurrencyDisplay amount={orderItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.costPrice)), 0)} />
              </span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateOrder}>Buyurtmani yaratish</button>
          </div>
        </div>
      </Drawer>

      {/* Supplier Quick Add Drawer (Bottom) */}
      <Drawer position="bottom" isOpen={isSupplierDrawerOpen} onClose={() => setIsSupplierDrawerOpen(false)} title="Tezkor: Yangi yetkazib beruvchi">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingBottom: '2rem' }}>
          <FormInput label="Ism-familiya *" value={newSupplierData.fullName} onChange={e => setNewSupplierData({...newSupplierData, fullName: e.target.value})} required />
          <FormInput label="Telefon raqami *" value={newSupplierData.phone} onChange={e => setNewSupplierData({...newSupplierData, phone: e.target.value})} required />
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsSupplierDrawerOpen(false)}>Bekor qilish</button>
            <button className="btn btn-primary" onClick={handleQuickAddSupplier}>Saqlash</button>
          </div>
        </div>
      </Drawer>

      {/* Product Quick Add Drawer (Left) */}
      <Drawer position="left" isOpen={isProductDrawerOpen} onClose={() => setIsProductDrawerOpen(false)} title="Tezkor: Yangi mahsulot">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormInput label="Mahsulot nomi *" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} required />
          <FormInput label="Taxminiy tannarx *" type="number" value={newProductData.costPrice} onChange={e => setNewProductData({...newProductData, costPrice: e.target.value})} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Miqdori *" type="number" value={newProductData.qty} onChange={e => setNewProductData({...newProductData, qty: e.target.value})} required />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Birlik</label>
              <select value={newProductData.unit} onChange={e => setNewProductData({...newProductData, unit: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                <option value="dona">Dona</option>
                <option value="kg">Kg</option>
                <option value="metr">Metr</option>
                <option value="litr">Litr</option>
              </select>
            </div>
          </div>
          <FormInput label="Izoh" value={newProductData.note} onChange={e => setNewProductData({...newProductData, note: e.target.value})} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsProductDrawerOpen(false)}>Bekor qilish</button>
            <button className="btn btn-primary" onClick={handleQuickAddProduct}>Qo'shish</button>
          </div>
        </div>
      </Drawer>

    </div>
  );
};

export default Orders;
