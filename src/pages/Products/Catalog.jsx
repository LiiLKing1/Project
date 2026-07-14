import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { saveDoc, editDoc, removeDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import { motion, AnimatePresence } from 'framer-motion';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', barcode: '', categoryId: '', unit: 'dona', costPrice: '', sellPrice: '', stock: '', minStock: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      addToast("Kategoriya nomini kiriting", "error");
      return;
    }
    if (!storeId) return;

    try {
      const newCat = { name: newCatName.trim(), createdAt: new Date().toISOString() };
      const docRef = await saveDoc(collection(db, `users/${storeId}/categories`), newCat);
      if (docRef && docRef.id) {
        setFormData({...formData, categoryId: docRef.id});
        addToast("Kategoriya qo'shildi", "success");
      }
      setIsCatModalOpen(false);
      setNewCatName('');
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  useEffect(() => {
    if (!storeId) return;

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), orderBy('createdAt', 'desc')), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, `users/${storeId}/categories`), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, [addToast, storeId]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCatModalOpen) {
          setIsCatModalOpen(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCatModalOpen, isModalOpen]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nomini kiritish majburiy';
    if (!formData.categoryId) errors.categoryId = 'Kategoriyani tanlang';
    if (!formData.costPrice || Number(formData.costPrice) < 0) errors.costPrice = 'To\'g\'ri tannarx kiriting';
    if (!formData.sellPrice || Number(formData.sellPrice) < Number(formData.costPrice)) errors.sellPrice = 'Sotish narxi tannarxdan past bo\'lmasligi kerak';
    
    // Check barcode duplication
    if (formData.barcode) {
      const isDuplicate = products.some(p => p.barcode === formData.barcode && p.id !== editingId);
      if (isDuplicate) errors.barcode = 'Bu shtrix-kod allaqachon mavjud';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      addToast('Iltimos, qizil bilan belgilangan xatolarni to\'g\'rilang', 'warning');
      return;
    }
    if (!storeId) return;
    
    // Auto-generate barcode if empty
    let finalBarcode = formData.barcode;
    if (!finalBarcode) {
      finalBarcode = '200' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    }

    const payload = {
      ...formData,
      barcode: finalBarcode,
      costPrice: Number(formData.costPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock || 0),
      minStock: Number(formData.minStock || 5),
      status: 'active'
    };

    try {
      if (editingId) {
        await editDoc(doc(db, `users/${storeId}/products`, editingId), payload);
        addToast('Mahsulot muvaffaqiyatli yangilandi', 'success');
      } else {
        await saveDoc(collection(db, `users/${storeId}/products`), payload);
        addToast('Mahsulot muvaffaqiyatli qo\'shildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (product) => {
    if (!storeId) return;
    if (window.confirm(`${product.name} ni o'chirishni xohlaysizmi? (Eskilar tarix uchun arxivlanishi tavsiya etiladi)`)) {
      try {
        await editDoc(doc(db, `users/${storeId}/products`, product.id), { status: 'archived' });
        addToast('Mahsulot arxivlandi', 'info');
      } catch (error) {
        addToast(error.message, 'error');
      }
    }
  };

  const openModal = (product = null) => {
    setFormErrors({});
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name, barcode: product.barcode, categoryId: product.categoryId,
        unit: product.unit, costPrice: product.costPrice, sellPrice: product.sellPrice,
        stock: product.stock, minStock: product.minStock
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', barcode: '', categoryId: '', unit: 'dona', costPrice: '', sellPrice: '', stock: '', minStock: ''
      });
    }
    setIsModalOpen(true);
  };

  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v) + ' UZS';

  const filteredProducts = products.filter(p => 
    p.status !== 'archived' && 
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
  );

  const getStockColor = (stock, minStock) => {
    if (stock <= 0) return 'var(--danger)';
    if (stock <= minStock) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Mahsulotlar Katalogi</h1>
        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> Yangi mahsulot</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '350px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Mahsulot nomi yoki shtrix-kodi..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
          <button className="btn btn-outline"><Filter size={18} /> Filtrlash</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Shtrix-kod</th>
                  <th style={{ padding: '1rem' }}>Nomi</th>
                  <th style={{ padding: '1rem' }}>Kategoriya</th>
                  <th style={{ padding: '1rem' }}>Sotish narxi</th>
                  <th style={{ padding: '1rem' }}>Tannarx</th>
                  <th style={{ padding: '1rem' }}>Qoldiq</th>
                  <th style={{ padding: '1rem' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Mahsulotlar topilmadi</td></tr>
                ) : filteredProducts.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.barcode}</td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{p.name}</td>
                      <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>{cat ? cat.name : 'Boshqa'}</span></td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>{formatMoney(p.sellPrice)}</td>
                      <td style={{ padding: '1rem' }}>{formatMoney(p.costPrice)}</td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: getStockColor(p.stock, p.minStock) }}>
                        {p.stock} {p.unit}
                      </td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => openModal(p)}><Edit size={16} /></button>
                        <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(p)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
      </div>

      <Drawer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}>
        <FormInput label="Shtrix-kod" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} error={formErrors.barcode} placeholder="Avtomatik yaratish uchun bo'sh qoldiring" />
        <FormInput label="Nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} error={formErrors.name} required />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kategoriya <span style={{ color: 'var(--danger)' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={formData.categoryId} 
              onChange={e => setFormData({...formData, categoryId: e.target.value})}
              style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${formErrors.categoryId ? 'var(--danger)' : 'var(--border-color)'}`, backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="">Kategoriya tanlang</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0 1rem' }}
              title="Yangi kategoriya qo'shish"
              onClick={() => setIsCatModalOpen(!isCatModalOpen)}
            >
              <Plus size={18} style={{ transform: isCatModalOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
          {formErrors.categoryId && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{formErrors.categoryId}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Tannarx (UZS)" type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} error={formErrors.costPrice} required />
          <FormInput label="Sotish narxi (UZS)" type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} error={formErrors.sellPrice} required />
        </div>
        
        {formData.costPrice && formData.sellPrice && (
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: Number(formData.sellPrice) >= Number(formData.costPrice) ? 'var(--success)' : 'var(--danger)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            {Number(formData.sellPrice) >= Number(formData.costPrice) ? 'Foyda: +' : 'Zarar: '}
            {formatMoney(Math.abs(Number(formData.sellPrice) - Number(formData.costPrice)))} 
            {' '}
            ({(((Number(formData.sellPrice) - Number(formData.costPrice)) / Number(formData.costPrice)) * 100).toFixed(1)}%)
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput label="Boshlang'ich qoldiq" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
          <FormInput label="Minimal qoldiq" type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="5" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Birlik</label>
            <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <option value="dona">Dona</option>
              <option value="kg">Kg</option>
              <option value="metr">Metr</option>
              <option value="litr">Litr</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
        </div>
      </Drawer>
      <AnimatePresence>
        {isCatModalOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: '500px',
              bottom: 0,
              width: '320px',
              backgroundColor: 'var(--bg-surface)',
              boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
              zIndex: 995,
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-main)'
            }}>
              <h2 className="h3">Yangi kategoriya</h2>
              <button onClick={() => setIsCatModalOpen(false)} style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormInput 
                label="Kategoriya nomi" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                placeholder="Masalan: Ichimliklar" 
                autoFocus 
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setIsCatModalOpen(false)}>Bekor qilish</button>
                <button className="btn btn-primary" onClick={handleAddCategory}>Saqlash</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Catalog;
