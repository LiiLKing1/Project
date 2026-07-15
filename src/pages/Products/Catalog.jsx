import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Trash2, Download, Upload, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { saveDoc, editDoc, softDeleteDoc, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import TransferDrawer from './TransferDrawer';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', barcode: '', categoryId: '', unit: 'dona', costPrice: '', sellPrice: '', stock: '', minStock: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, new: 0, update: 0, error: 0 });
  const [isImporting, setIsImporting] = useState(false);
  
  // Transfer state
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      addToast("Kategoriya nomini kiriting", "error");
      return;
    }
    if (!storeId) return;

    try {
      const auditData = { storeId, userProfile, resource: 'categories', details: newCatName.trim() };
      const newCat = { name: newCatName.trim(), createdAt: new Date().toISOString() };
      const docRef = await saveDoc(collection(db, `users/${storeId}/categories`), newCat, auditData);
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
  }, [isCatModalOpen, isModalOpen, isImportOpen]);

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
      stockByWarehouse: editingId ? undefined : { [selectedWarehouseId]: Number(formData.stock || 0) }, // Use undefined so merge doesn't overwrite if not explicitly handling
      minStock: Number(formData.minStock || 5),
      status: 'active'
    };
    
    // If creating new, we must provide the initial stock ByWarehouse.
    if (!editingId) {
      payload.stockByWarehouse = { [selectedWarehouseId]: Number(formData.stock || 0) };
    } else {
      // Don't overwrite other warehouses on edit. Just update this warehouse.
      // Easiest is to only allow editing stock from transfer/inventory, but for now we can omit it from simple edit.
      delete payload.stockByWarehouse; 
    }

    try {
      if (editingId) {
        const originalProduct = products.find(p => p.id === editingId);
        const diffStr = generateDiff(originalProduct, payload);
        const auditDetails = diffStr ? `${formData.name} (O'zgarishlar: ${diffStr})` : formData.name;
        const auditData = { storeId, userProfile, resource: 'products', details: auditDetails };
        
        await editDoc(doc(db, `users/${storeId}/products`, editingId), payload, auditData);
        addToast('Mahsulot muvaffaqiyatli yangilandi', 'success');
      } else {
        const auditData = { storeId, userProfile, resource: 'products', details: formData.name };
        await saveDoc(collection(db, `users/${storeId}/products`), payload, auditData);
        addToast('Mahsulot muvaffaqiyatli qo\'shildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (product) => {
    if (!storeId) return;
    if (window.confirm(`${product.name} ni o'chirishni xohlaysizmi? (Arxivga tushadi)`)) {
      try {
        const auditData = { storeId, userProfile, resource: 'products', details: product.name };
        await softDeleteDoc(doc(db, `users/${storeId}/products`, product.id), auditData);
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
        stock: product.stockByWarehouse?.[selectedWarehouseId] || 0, minStock: product.minStock
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', barcode: '', categoryId: '', unit: 'dona', costPrice: '', sellPrice: '', stock: '', minStock: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const dataToExport = filteredProducts.map(p => ({
      'Shtrix-kod': p.barcode,
      'Nomi': p.name,
      'Kategoriya': categories.find(c => c.id === p.categoryId)?.name || 'Boshqa',
      'O\'lchov birligi': p.unit,
      'Tannarx': p.costPrice,
      'Sotish narxi': p.sellPrice,
      'Qoldiq': p.stockByWarehouse?.[selectedWarehouseId] || 0,
      'Minimal qoldiq': p.minStock
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mahsulotlar");
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `mahsulotlar_${dateStr}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const template = [{
      'Shtrix-kod': '1234567890123',
      'Nomi': 'Yangi mahsulot',
      'Kategoriya': 'Ichimliklar',
      'O\'lchov birligi': 'dona',
      'Tannarx': 5000,
      'Sotish narxi': 7000,
      'Qoldiq': 100,
      'Minimal qoldiq': 5
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shablon");
    XLSX.writeFile(wb, `shablon_mahsulotlar.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let newCount = 0;
      let updateCount = 0;
      let errCount = 0;
      const parsedData = data.map((row) => {
        let status = 'success';
        let reason = '';
        
        const barcode = row['Shtrix-kod'] ? String(row['Shtrix-kod']) : '';
        const name = row['Nomi'] ? String(row['Nomi']) : '';
        const categoryName = row['Kategoriya'] ? String(row['Kategoriya']) : 'Boshqa';
        const costPrice = Number(row['Tannarx']);
        const sellPrice = Number(row['Sotish narxi']);
        
        // Validation
        if (!name.trim()) { status = 'error'; reason = 'Nomi kiritilmagan'; }
        else if (isNaN(costPrice) || costPrice < 0) { status = 'error'; reason = 'Tannarx noto\'g\'ri'; }
        else if (isNaN(sellPrice) || sellPrice < 0) { status = 'error'; reason = 'Sotish narxi noto\'g\'ri'; }
        
        let isUpdate = false;
        if (status !== 'error') {
          if (barcode) {
            isUpdate = products.some(p => p.barcode === barcode);
          }
          if (isUpdate) {
            // Check if stock changes (for now just add to new or warning)
            status = 'warning'; reason = 'Shtrix-kod mavjud, yangilanadi';
            updateCount++;
          } else {
            newCount++;
          }
        } else {
          errCount++;
        }
        
        return {
          originalRow: row,
          parsed: {
            barcode, name, categoryName, 
            unit: row['O\'lchov birligi'] || 'dona', 
            costPrice: costPrice || 0, 
            sellPrice: sellPrice || 0, 
            stock: Number(row['Qoldiq']) || 0, 
            minStock: Number(row['Minimal qoldiq']) || 5
          },
          status, reason
        };
      });
      
      setImportData(parsedData);
      setImportStats({ total: data.length, new: newCount, update: updateCount, error: errCount });
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    if (!storeId || isImporting) return;
    setIsImporting(true);
    
    try {
      const batch = writeBatch(db);
      const validRows = importData.filter(d => d.status !== 'error');
      
      const categoryMap = {};
      categories.forEach(c => { categoryMap[c.name.toLowerCase().trim()] = c.id; });
      
      for (const row of validRows) {
        const { parsed, status } = row;
        
        let catId = categoryMap[parsed.categoryName.toLowerCase().trim()];
        if (!catId) {
          const newCatRef = doc(collection(db, `users/${storeId}/categories`));
          batch.set(newCatRef, { name: parsed.categoryName, createdAt: new Date().toISOString() });
          catId = newCatRef.id;
          categoryMap[parsed.categoryName.toLowerCase().trim()] = catId;
        }
        
        let barcode = parsed.barcode;
        if (!barcode) {
          barcode = '200' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        }
        
        const payload = {
          name: parsed.name,
          barcode: barcode,
          categoryId: catId,
          unit: parsed.unit,
          costPrice: parsed.costPrice,
          sellPrice: parsed.sellPrice,
          minStock: parsed.minStock,
          status: 'active'
        };
        
        if (status === 'warning') {
          const existingProd = products.find(p => p.barcode === barcode);
          if (existingProd) {
            batch.update(doc(db, `users/${storeId}/products`, existingProd.id), {
               ...payload, 
               [`stockByWarehouse.${selectedWarehouseId}`]: parsed.stock,
               updatedAt: new Date().toISOString()
            });
          }
        } else {
          const newProdRef = doc(collection(db, `users/${storeId}/products`));
          batch.set(newProdRef, {
             ...payload, 
             stockByWarehouse: { [selectedWarehouseId]: parsed.stock },
             createdAt: new Date().toISOString()
          });
        }
      }
      
      await batch.commit();
      addToast(`${validRows.length} ta mahsulot muvaffaqiyatli import qilindi!`, 'success');
      
      if (importStats.error > 0) {
        const errorRows = importData.filter(d => d.status === 'error').map(d => ({
          ...d.originalRow,
          'Xatolik Sababi': d.reason
        }));
        const ws = XLSX.utils.json_to_sheet(errorRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Xatolar");
        XLSX.writeFile(wb, `import_xatolar_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      setIsImportOpen(false);
      setImportData([]);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ backgroundColor: 'var(--bg-surface)' }} onClick={() => setIsTransferOpen(true)}><FileSpreadsheet size={18} /> Stok ko'chirish</button>
          <button className="btn btn-outline" style={{ backgroundColor: 'var(--bg-surface)' }} onClick={handleExport}><Download size={18} /> Excel'ga eksport</button>
          <button className="btn btn-outline" style={{ backgroundColor: 'var(--bg-surface)' }} onClick={() => {setIsImportOpen(true); setImportData([]);}}><Upload size={18} /> Excel'dan yuklash</button>
          <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> Yangi mahsulot</button>
        </div>
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
          <div className="table-responsive">
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
                      <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}><CurrencyDisplay amount={p.sellPrice} /></td>
                      <td style={{ padding: '1rem' }}><CurrencyDisplay amount={p.costPrice} /></td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: getStockColor(p.stockByWarehouse?.[selectedWarehouseId] || 0, p.minStock) }}>
                        {p.stockByWarehouse?.[selectedWarehouseId] || 0} {p.unit}
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
          <FormInput label={`Tannarx (${curr})`} type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} error={formErrors.costPrice} required />
          <FormInput label={`Sotish narxi (${curr})`} type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} error={formErrors.sellPrice} required />
        </div>
        
        {formData.costPrice && formData.sellPrice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: Number(formData.sellPrice) >= Number(formData.costPrice) ? 'var(--success)' : 'var(--danger)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            {Number(formData.sellPrice) >= Number(formData.costPrice) ? 'Foyda: +' : 'Zarar: '}
            <CurrencyDisplay amount={Math.abs(Number(formData.sellPrice) - Number(formData.costPrice))} />
            {' '}
            ({(((Number(formData.sellPrice) - Number(formData.costPrice)) / Number(formData.costPrice)) * 100).toFixed(1)}%)
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {!editingId ? (
             <FormInput label="Boshlang'ich qoldiq" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
          ) : (
             <FormInput label="Qoldiq (Faqat ma'lumot uchun)" type="number" value={formData.stock} disabled />
          )}
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

      {/* Excel Import Drawer */}
      <Drawer isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Excel'dan mahsulotlarni yuklash">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--primary-light)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>1. Shablonni yuklab oling</h3>
            <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-secondary)' }}>
              To'g'ri formatdagi Excel faylni yuklash uchun quyidagi namunaviy shablonni ko'chirib oling va ichini to'ldiring.
            </p>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleDownloadTemplate}>
              <Download size={18} /> Namuna shablonni yuklab olish
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>2. Faylni yuklang</h3>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.2s' }}>
              <FileSpreadsheet size={32} style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }} />
              <span style={{ fontWeight: 500 }}>Faylni tanlash (.xlsx, .xls)</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {importData.length > 0 && (
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Oldindan ko'rish (Preview)</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span>Jami: <b>{importStats.total}</b></span>
                <span style={{ color: 'var(--success)' }}>Yangi: <b>{importStats.new}</b></span>
                <span style={{ color: 'var(--warning)' }}>Yangilanadi: <b>{importStats.update}</b></span>
                <span style={{ color: 'var(--danger)' }}>Xato: <b>{importStats.error}</b></span>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Holat</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Shtrix-kod</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nomi</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Sabab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {row.status === 'success' && <CheckCircle2 size={16} color="var(--success)" />}
                          {row.status === 'warning' && <AlertTriangle size={16} color="var(--warning)" />}
                          {row.status === 'error' && <XCircle size={16} color="var(--danger)" />}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{row.parsed.barcode}</td>
                        <td style={{ padding: '0.5rem' }}>{row.parsed.name}</td>
                        <td style={{ padding: '0.5rem', color: row.status === 'error' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          {row.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setImportData([])}>Tozalash</button>
                <button className="btn btn-primary" onClick={handleConfirmImport} disabled={isImporting || (importStats.new === 0 && importStats.update === 0)}>
                  {isImporting ? 'Yuklanmoqda...' : 'Importni tasdiqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Drawer>
      
      <TransferDrawer isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />

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
