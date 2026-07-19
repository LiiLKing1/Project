import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Phone, MapPin, Calendar, Clock, CheckCircle2, AlertCircle, ShoppingBag, FileText, ChevronDown, RefreshCw, AlertTriangle, ArrowLeft, Handshake, ArrowRight, PackagePlus, Check, Banknote, CreditCard } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, writeBatch, increment } from 'firebase/firestore';
import { saveDoc, editDoc, softDeleteDoc, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useConfirm } from '../../context/ConfirmContext';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  // Partner CRUD States
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [partnerForm, setPartnerForm] = useState({ companyName: '', contactPerson: '', phone: '', address: '', note: '' });

  // Delivery States
  const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false);
  const [deliveryStep, setDeliveryStep] = useState(1); // 1: Items, 2: Payment
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [deliveryItems, setDeliveryItems] = useState([]); // { id, name, qty, costPrice, isNewProduct, sellPrice }
  
  // Product Search inside Delivery
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // New Product Drawer (Nested)
  const [isNewProductDrawerOpen, setIsNewProductDrawerOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', barcode: '', costPrice: '', sellPrice: '', stock: '', minStock: '' });

  // Payment States
  const [paymentType, setPaymentType] = useState('cash'); // cash, debt, mixed
  const [mixedCash, setMixedCash] = useState('');
  const [mixedDebt, setMixedDebt] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    const unsubPartners = onSnapshot(query(collection(db, `users/${storeId}/partners`), orderBy('createdAt', 'desc')), (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPartners(); unsubProducts(); };
  }, [storeId]);

  // --- PARTNER CRUD ---
  const handleSavePartner = async () => {
    if (!partnerForm.companyName || !partnerForm.contactPerson || !partnerForm.phone) {
      addToast('Kompaniya, Mas\'ul shaxs va Telefon kiritilishi shart', 'warning');
      return;
    }
    
    try {
      const payload = { ...partnerForm };
      
      if (editingId) {
        const original = partners.find(p => p.id === editingId);
        const diffStr = generateDiff(original, payload);
        const auditData = { storeId, userProfile, resource: 'partners', details: `${payload.companyName} (${diffStr})` };
        await editDoc(doc(db, `users/${storeId}/partners`, editingId), payload, auditData);
        addToast('Hamkor yangilandi', 'success');
      } else {
        payload.currentPayable = 0;
        payload.status = 'active';
        const auditData = { storeId, userProfile, resource: 'partners', details: payload.companyName };
        await saveDoc(collection(db, `users/${storeId}/partners`), payload, auditData);
        addToast('Hamkor qo\'shildi', 'success');
      }
      setIsPartnerModalOpen(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeletePartner = async (partner) => {
    if (await confirm({ message: `Haqiqatan ham ${partner.companyName}ni o'chirmoqchimisiz?`, confirmStyle: 'danger' })) {
      try {
        const auditData = { storeId, userProfile, resource: 'partners', details: partner.companyName };
        await softDeleteDoc(doc(db, `users/${storeId}/partners`, partner.id), auditData);
        addToast('Hamkor arxivlandi', 'success');
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  const openPartnerModal = (partner = null) => {
    if (partner) {
      setEditingId(partner.id);
      setPartnerForm({ companyName: partner.companyName, contactPerson: partner.contactPerson, phone: partner.phone, address: partner.address || '', note: partner.note || '' });
    } else {
      setEditingId(null);
      setPartnerForm({ companyName: '', contactPerson: '', phone: '', address: '', note: '' });
    }
    setIsPartnerModalOpen(true);
  };

  // --- DELIVERY PROCESS ---
  const openDeliveryDrawer = (partnerId = '') => {
    setSelectedPartnerId(partnerId);
    setDeliveryItems([]);
    setDeliveryStep(1);
    setPaymentType('cash');
    setMixedCash('');
    setMixedDebt('');
    
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
    
    setIsDeliveryDrawerOpen(true);
  };

  const handleSelectProduct = (product) => {
    setDeliveryItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: product.id, name: product.name, qty: 1, costPrice: product.costPrice || 0, isNewProduct: false }];
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleAddNewProductItem = () => {
    if (!newProductForm.name || !newProductForm.costPrice || !newProductForm.sellPrice) {
      addToast('Nom, kelish va sotish narxlari majburiy', 'warning');
      return;
    }
    const tempId = 'NEW_' + Date.now();
    setDeliveryItems(prev => [...prev, {
      id: tempId,
      name: newProductForm.name,
      qty: Number(newProductForm.stock) || 1,
      costPrice: Number(newProductForm.costPrice),
      sellPrice: Number(newProductForm.sellPrice),
      barcode: newProductForm.barcode,
      minStock: Number(newProductForm.minStock) || 5,
      isNewProduct: true
    }]);
    setIsNewProductDrawerOpen(false);
    setNewProductForm({ name: '', barcode: '', costPrice: '', sellPrice: '', stock: '', minStock: '' });
  };

  const updateDeliveryItem = (id, field, value) => {
    setDeliveryItems(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, [field]: value };
      }
      return i;
    }));
  };

  const removeDeliveryItem = (id) => {
    setDeliveryItems(prev => prev.filter(i => i.id !== id));
  };

  const totalDeliveryAmount = deliveryItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.costPrice)), 0);

  const proceedToPayment = () => {
    if (!selectedPartnerId) {
      addToast('Hamkor tanlanishi shart', 'error');
      return;
    }
    if (deliveryItems.length === 0 || deliveryItems.some(i => !i.qty || i.qty <= 0)) {
      addToast('Mahsulotlar to\'g\'ri kiritilmagan', 'error');
      return;
    }
    setDeliveryStep(2);
  };

  // Mixed payment diff check
  const mCash = Number(mixedCash) || 0;
  const mDebt = paymentType === 'mixed' ? Math.max(totalDeliveryAmount - mCash, 0) : 0;

  const handleFinishDelivery = async () => {
    if (paymentType === 'mixed' && mCash > totalDeliveryAmount) {
      addToast('Kiritilgan naqd pul umumiy summadan oshib ketdi', 'error');
      return;
    }
    if ((paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && !dueDate) {
      addToast('To\'lov muddati kiritilishi shart', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      // Calculate actual debt and cash
      let finalDebt = 0;
      let cashPaid = 0;
      
      if (paymentType === 'cash') cashPaid = totalDeliveryAmount;
      else if (paymentType === 'debt') finalDebt = totalDeliveryAmount;
      else if (paymentType === 'mixed') {
        cashPaid = mCash;
        finalDebt = mDebt;
      }
      
      const instantExpense = cashPaid;

      // 1. Process items (Update stock / Create new products)
      const finalItemsList = [];
      for (const item of deliveryItems) {
        let actualProductId = item.id;
        
        if (item.isNewProduct) {
          const newProdRef = doc(collection(db, `users/${storeId}/products`));
          actualProductId = newProdRef.id;
          batch.set(newProdRef, {
            name: item.name,
            barcode: item.barcode || String(Date.now()).slice(-8),
            costPrice: item.costPrice,
            sellPrice: item.sellPrice,
            stockByWarehouse: { [selectedWarehouseId]: item.qty },
            minStock: item.minStock,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: userProfile?.name || 'Admin'
          });
        } else {
          const prodRef = doc(db, `users/${storeId}/products`, item.id);
          batch.update(prodRef, {
            [`stockByWarehouse.${selectedWarehouseId}`]: increment(Number(item.qty)),
            costPrice: Number(item.costPrice),
            sellPrice: Number(item.sellPrice)
          });
        }
        
        finalItemsList.push({
          productId: actualProductId,
          name: item.name,
          qty: item.qty,
          costPrice: item.costPrice,
          isNewProduct: item.isNewProduct
        });
      }

      // 2. Create partnerDeliveries document
      const deliveryRef = doc(collection(db, `users/${storeId}/partnerDeliveries`));
      batch.set(deliveryRef, {
        partnerId: selectedPartnerId,
        items: finalItemsList,
        totalAmount: totalDeliveryAmount,
        status: 'received',
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.name || 'Admin'
      });

      // 3. Create Expense if any instant payment
      if (instantExpense > 0) {
        const expenseRef = doc(collection(db, `users/${storeId}/expenses`));
        batch.set(expenseRef, {
          category: 'Hamkorga to\'lov',
          amount: instantExpense,
          note: `Hamkor yetkazmasi uchun to'lov (${deliveryRef.id})`,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });
      }

      // 4. Create partnerDebts if any debt
      if (finalDebt > 0) {
        const debtRef = doc(collection(db, `users/${storeId}/partnerDebts`));
        batch.set(debtRef, {
          partnerId: selectedPartnerId,
          relatedDeliveryId: deliveryRef.id,
          amount: finalDebt,
          remainingAmount: finalDebt,
          dueDate: dueDate,
          status: 'active',
          note: 'Yetkazma qarzi',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Admin'
        });
        
        // 5. Update partner currentPayable
        const partnerRef = doc(db, `users/${storeId}/partners`, selectedPartnerId);
        batch.update(partnerRef, {
          currentPayable: increment(finalDebt)
        });
      }

      await batch.commit();
      addToast('Yetkazma muvaffaqiyatli qabul qilindi', 'success');
      setIsDeliveryDrawerOpen(false);
      
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPartners = partners.filter(p => p.status !== 'archived' && (p.companyName.toLowerCase().includes(search.toLowerCase()) || p.contactPerson.toLowerCase().includes(search.toLowerCase())));
  const filteredProducts = products.filter(p => p.status !== 'archived' && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode?.includes(productSearch))).slice(0, 30);

  const totalPartners = partners.filter(p => p.status !== 'archived').length;
  const totalPayable = partners.filter(p => p.status !== 'archived').reduce((acc, p) => acc + (p.currentPayable || 0), 0);
  const partnersWithDebt = partners.filter(p => p.status !== 'archived' && (p.currentPayable || 0) > 0).length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hamkorlar</h1>
          <p className="page-subtitle">{totalPartners} ta hamkor ro'yxatda</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => openDeliveryDrawer()}>
            <PackagePlus size={18} /> Yetkazma qabul qilish
          </button>
          <button className="btn btn-primary" onClick={() => openPartnerModal()}>
            <Plus size={18} /> Yangi hamkor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Jami hamkorlar</span>
          <span className="stat-card-value blue">{totalPartners}</span>
          <span className="stat-card-sub">Faol ro'yxat</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Sizning qarzingiz (Jami)</span>
          <span className="stat-card-value red"><CurrencyDisplay amount={totalPayable} /></span>
          <span className="stat-card-sub">Barcha hamkorlarga</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Qarz hamkorlar soni</span>
          <span className="stat-card-value amber">{partnersWithDebt}</span>
          <span className="stat-card-sub">To'lanmagan qarzlar</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="page-card">
        <div className="page-card-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Kompaniya yoki mas'ul shaxs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="page-table">
            <thead>
              <tr>
                <th>Kompaniya</th>
                <th>Mas'ul shaxs</th>
                <th>Telefon</th>
                <th>Sizning qarzingiz</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Hamkorlar topilmadi
                  </td>
                </tr>
              ) : filteredPartners.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A2538' }}>{p.companyName}</div>
                  </td>
                  <td>{p.contactPerson}</td>
                  <td style={{ color: '#8A9BB5', fontFamily: 'monospace', fontSize: 13 }}>{p.phone}</td>
                  <td>
                    {p.currentPayable > 0
                      ? <span style={{ fontWeight: 700, color: '#EF4B4B' }}><CurrencyDisplay amount={p.currentPayable} /></span>
                      : <span className="badge badge-green">Yo'q</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" style={{ background: '#F0FDF4', borderColor: '#D1FAE5', color: '#059669' }} onClick={() => openDeliveryDrawer(p.id)} title="Yetkazma qabul qilish"><PackagePlus size={14}/></button>
                      <button className="action-btn edit" onClick={() => openPartnerModal(p)} title="Tahrirlash"><Edit size={14}/></button>
                      <button className="action-btn delete" onClick={() => handleDeletePartner(p)} title="O'chirish"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Form Drawer */}
      <Drawer position="right" isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} title={editingId ? 'Hamkorni tahrirlash' : 'Yangi hamkor'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <FormInput label="Kompaniya nomi *" value={partnerForm.companyName} onChange={e => setPartnerForm({...partnerForm, companyName: e.target.value})} required />
          <FormInput label="Mas'ul shaxs (F.I.O) *" value={partnerForm.contactPerson} onChange={e => setPartnerForm({...partnerForm, contactPerson: e.target.value})} required />
          <FormInput label="Telefon *" value={partnerForm.phone} onChange={e => setPartnerForm({...partnerForm, phone: e.target.value})} required placeholder="+998" />
          <FormInput label="Manzil" value={partnerForm.address} onChange={e => setPartnerForm({...partnerForm, address: e.target.value})} />
          <FormInput label="Izoh" value={partnerForm.note} onChange={e => setPartnerForm({...partnerForm, note: e.target.value})} />
          
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSavePartner}>Saqlash</button>
        </div>
      </Drawer>

      {/* Delivery Process Drawer */}
      <Drawer position="right" isOpen={isDeliveryDrawerOpen} onClose={() => !isProcessing && setIsDeliveryDrawerOpen(false)} title="Yetkazma qabul qilish" width="500px">
        {deliveryStep === 1 ? (
          <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Hamkor tanlash *</label>
              <CustomSelect 
                value={selectedPartnerId} 
                onChange={v => setSelectedPartnerId(v)}
                options={[
                  {value: '', label: '-- Tanlang --'},
                  ...partners.filter(p => p.status !== 'archived').map(p => ({value: p.id, label: `${p.companyName} (${p.contactPerson})`}))
                ]}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 className="h2" style={{ fontSize: '1.125rem' }}>Mahsulotlar</h3>
              
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Katalogdan mahsulot qidirish..." 
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button 
                  onClick={() => setShowProductDropdown(!showProductDropdown)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                >
                  <ChevronDown size={18} />
                </button>
                
                {showProductDropdown && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowProductDropdown(false)}></div>
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '0.5rem', boxShadow: 'var(--shadow-md)', maxHeight: '300px', overflowY: 'auto' }}>
                      <div 
                        onClick={() => { setIsNewProductDrawerOpen(true); setShowProductDropdown(false); setProductSearch(''); }} 
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)' }}
                      >
                        <Plus size={18}/> Yangi mahsulot qo'shish
                      </div>
                      {filteredProducts.length > 0 ? filteredProducts.map(p => (
                        <div key={p.id} onClick={() => handleSelectProduct(p)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <span style={{ fontWeight: 500 }}>{p.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Mavjud: {p.stockByWarehouse?.[selectedWarehouseId] || 0} {p.unit})</span></span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}><CurrencyDisplay amount={p.costPrice} /></span>
                        </div>
                      )) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Mahsulot topilmadi</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Items List */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '40vh', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)' }}>
                {deliveryItems.length === 0 ? (
                   <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Mahsulotlar kiritilmagan</div>
                ) : (
                  <div style={{ display: 'grid', gap: '1px', backgroundColor: 'var(--border-color)' }}>
                    {deliveryItems.map((item, idx) => (
                      <div key={item.id} style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="flex-between">
                          <span style={{ fontWeight: 600 }}>{item.name} {item.isNewProduct && <span style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '4px', marginLeft: '0.5rem' }}>Yangi</span>}</span>
                          <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)' }} onClick={() => removeDeliveryItem(item.id)}><Trash2 size={16}/></button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Miqdor</label>
                            <input type="number" value={item.qty} onChange={e => updateDeliveryItem(item.id, 'qty', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kelish narxi ({curr})</label>
                            <input type="number" value={item.costPrice} onChange={e => updateDeliveryItem(item.id, 'costPrice', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>
                          Jami: <CurrencyDisplay amount={Number(item.qty) * Number(item.costPrice)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: '1.5rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-lg)' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Umumiy summa:</span>
                <span className="h1" style={{ color: 'var(--primary)' }}><CurrencyDisplay amount={totalDeliveryAmount} /></span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={proceedToPayment}>
                Qabul qilish va To'lovga o'tish <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
            <button className="btn btn-ghost" onClick={() => setDeliveryStep(1)} style={{ alignSelf: 'flex-start' }}>← Orqaga</button>
            
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>To'lanishi kerak bo'lgan summa</div>
              <div className="h1" style={{ color: 'var(--primary)' }}><CurrencyDisplay amount={totalDeliveryAmount} /></div>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '1rem' }}>To'lov usulini tanlang</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: `2px solid ${paymentType === 'cash' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: paymentType === 'cash' ? 'var(--primary-light)' : 'transparent' }}>
                  <input type="radio" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} style={{ transform: 'scale(1.2)' }} />
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Banknote size={18}/> Hoziroq to'lash (Naqd/Karta)</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Mablag' kassadan chiqim qilinadi, qarz yozilmaydi</div>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: `2px solid ${paymentType === 'debt' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: paymentType === 'debt' ? 'var(--primary-light)' : 'transparent' }}>
                  <input type="radio" checked={paymentType === 'debt'} onChange={() => setPaymentType('debt')} style={{ transform: 'scale(1.2)' }} />
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18}/> To'liq qarz sifatida yozish</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Summa hamkor qarzdorligi hisobiga o'tadi</div>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: `2px solid ${paymentType === 'mixed' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: paymentType === 'mixed' ? 'var(--primary-light)' : 'transparent' }}>
                  <input type="radio" checked={paymentType === 'mixed'} onChange={() => setPaymentType('mixed')} style={{ transform: 'scale(1.2)' }} />
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🔀 Qisman to'lash va qarzga yozish</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bir qismini to'lab, qolganini qarzga yozish</div>
                  </div>
                </label>
              </div>
            </div>

            {paymentType === 'mixed' && (
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FormInput label={`Naqd/Karta bilan to'lash (${curr})`} type="number" value={mixedCash} onChange={e => setMixedCash(e.target.value)} placeholder="0" />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--warning)' }}>Qarz bo'lib qoladigan summa:</span>
                  <span className="h3" style={{ color: 'var(--warning)', margin: 0 }}><CurrencyDisplay amount={mDebt} /></span>
                </div>
              </div>
            )}

            {(paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && (
              <FormInput label="Qaytarish muddati *" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button 
                className="btn btn-success" 
                style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} 
                onClick={handleFinishDelivery} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Bajarilmoqda...' : 'Tasdiqlash va Yakunlash'}
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Internal New Product Drawer */}
      <Drawer position="left" isOpen={isNewProductDrawerOpen} onClose={() => setIsNewProductDrawerOpen(false)} title="Yangi mahsulot yaratish" width="400px">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <FormInput label="Mahsulot nomi *" value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} required />
          <FormInput label="Shtrix-kod" value={newProductForm.barcode} onChange={e => setNewProductForm({...newProductForm, barcode: e.target.value})} placeholder="Avto-generatsiya" />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><FormInput label={`Kelish narxi (${curr}) *`} type="number" value={newProductForm.costPrice} onChange={e => setNewProductForm({...newProductForm, costPrice: e.target.value})} required /></div>
            <div style={{ flex: 1 }}><FormInput label={`Sotish narxi (${curr}) *`} type="number" value={newProductForm.sellPrice} onChange={e => setNewProductForm({...newProductForm, sellPrice: e.target.value})} required /></div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}><FormInput label="Miqdori (Joriy)" type="number" value={newProductForm.stock} onChange={e => setNewProductForm({...newProductForm, stock: e.target.value})} /></div>
            <div style={{ flex: 1 }}><FormInput label="Minimal qoldiq limit" type="number" value={newProductForm.minStock} onChange={e => setNewProductForm({...newProductForm, minStock: e.target.value})} placeholder="5" /></div>
          </div>
          
          <button className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.875rem' }} onClick={handleAddNewProductItem}>Ro'yxatga qo'shish</button>
        </div>
      </Drawer>

    </div>
  );
};

export default Partners;
