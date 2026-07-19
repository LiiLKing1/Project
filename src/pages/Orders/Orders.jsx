import React, { useState, useEffect } from 'react';
import { PackageOpen, Search, Plus, Trash2, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, runTransaction, getDocs } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useConfirm } from '../../context/ConfirmContext';
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
  const { confirm } = useConfirm();
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
    if (!(await confirm({ message: 'Buyurtmani qabul qilishni tasdiqlaysizmi? Qoldiqlar oshadi.' }))) return;

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
    if (!(await confirm({ message: 'Buyurtmani bekor qilishni tasdiqlaysizmi?', confirmStyle: 'danger' }))) return;

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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tovar Buyurtmalari</h1>
          <p className="page-subtitle">Yetkazib beruvchilardan tovarlarni buyurtma qilish va qabul qilish</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsOrderDrawerOpen(true)}>
          <Plus size={18} /> Yangi buyurtma
        </button>
      </div>

      <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="page-card-header">
          <div className="search-wrap" style={{ maxWidth: '350px' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Qidirish (yetkazib beruvchi, holat)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="page-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Sana</th>
                <th>Yetkazib beruvchi</th>
                <th>Summa</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Buyurtmalar topilmadi
                  </td>
                </tr>
              ) : filteredOrders.map(order => {
                const supplier = suppliers.find(s => s.id === order.supplierId);
                return (
                  <React.Fragment key={order.id}>
                    <tr style={{ backgroundColor: expandedId === order.id ? '#F4F8FF' : 'transparent', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      <td style={{ color: '#8A9BB5', fontSize: 14 }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1A2538' }}>{supplier?.fullName || 'Noma\'lum'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1A2538' }}><CurrencyDisplay amount={order.totalAmount} /></div>
                      </td>
                      <td>
                        {order.status === 'received' && <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600, backgroundColor: '#D1FAE5', color: '#10B981' }}>Qabul qilingan</span>}
                        {order.status === 'cancelled' && <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600, backgroundColor: '#FEE2E2', color: '#EF4B4B' }}>Bekor qilingan</span>}
                        {order.status === 'pending' && <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: 12, fontWeight: 600, backgroundColor: '#FEF3C7', color: '#F59E0B' }}>Kutilmoqda</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {order.status === 'pending' && (
                            <>
                              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13, borderColor: '#10B981', color: '#10B981' }} onClick={(e) => { e.stopPropagation(); handleReceiveOrder(order); }}>
                                <CheckCircle size={14} /> Qabul qilish
                              </button>
                              <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleCancelOrder(order); }}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          <div style={{ color: '#8A9BB5', marginLeft: '8px' }}>
                            {expandedId === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0 }}>
                          <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderBottom: '1px solid #DCE8F5' }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#1A2538', fontSize: 14, fontWeight: 600 }}>Buyurtma tarkibi:</h4>
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #DCE8F5', backgroundColor: '#fff' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#F4F8FF', borderBottom: '1px solid #DCE8F5' }}>
                                    <th style={{ padding: '12px 16px', fontSize: 13, color: '#8A9BB5', fontWeight: 600 }}>Mahsulot</th>
                                    <th style={{ padding: '12px 16px', fontSize: 13, color: '#8A9BB5', fontWeight: 600 }}>Soni</th>
                                    <th style={{ padding: '12px 16px', fontSize: 13, color: '#8A9BB5', fontWeight: 600 }}>Tannarx</th>
                                    <th style={{ padding: '12px 16px', fontSize: 13, color: '#8A9BB5', fontWeight: 600 }}>Jami</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx < order.items.length - 1 ? '1px solid #DCE8F5' : 'none' }}>
                                      <td style={{ padding: '12px 16px', color: '#1A2538', fontWeight: 500 }}>
                                        {item.name} {item.isNewProduct && <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: 10, fontWeight: 600, backgroundColor: '#4A90E2', color: '#fff', marginLeft: 8 }}>Yangi</span>}
                                      </td>
                                      <td style={{ padding: '12px 16px', color: '#1A2538' }}>{item.qty} <span style={{ fontSize: 12, color: '#8A9BB5' }}>{item.unit || 'dona'}</span></td>
                                      <td style={{ padding: '12px 16px', color: '#8A9BB5' }}><CurrencyDisplay amount={item.costPrice} /></td>
                                      <td style={{ padding: '12px 16px', color: '#1A2538', fontWeight: 600 }}><CurrencyDisplay amount={item.qty * item.costPrice} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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
            <CustomSelect 
              value={orderSupplierId} 
              onChange={v => setOrderSupplierId(v)}
              options={[
                {value: '', label: '-- Tanlang --'},
                ...suppliers.map(s => ({value: s.id, label: `${s.fullName} ${s.companyName ? `(${s.companyName})` : ''}`}))
              ]}
            />
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
                    <div key={p.id} onClick={() => handleAddProductToOrder(p)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.25rem' }}>Tannarx: <CurrencyDisplay amount={p.costPrice} /></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: Number(p.stockByWarehouse?.[selectedWarehouseId] || 0) <= 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 500, textAlign: 'right' }}>
                        Qoldiq: {p.stockByWarehouse?.[selectedWarehouseId] || 0} {p.unit || 'dona'}
                      </div>
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
              <CustomSelect 
                value={newProductData.unit} 
                onChange={v => setNewProductData({...newProductData, unit: v})}
                options={[
                  {value: 'dona', label: 'Dona'},
                  {value: 'kg', label: 'Kg'},
                  {value: 'metr', label: 'Metr'},
                  {value: 'litr', label: 'Litr'}
                ]}
              />
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
