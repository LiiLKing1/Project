import React, { useState, useEffect } from 'react';
import './Catalog.css';
import { Search, Plus, Filter, Edit, Trash2, Download, Upload, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, Package, LayoutGrid, List, Grid3x3, Rows3 } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy, writeBatch } from '../../services/firebaseMock';
import * as XLSX from 'xlsx';
import { saveDoc, editDoc, softDeleteDoc, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { useConfirm } from '../../context/ConfirmContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import TransferDrawer from './TransferDrawer';
import { useLocation, useNavigate } from 'react-router-dom';

/* ─────── Design tokens & Components (Dashboard matching) ─────── */
const GL     = '#4A90E2';
const GD     = '#2C6FBF';
const CARD_B = '#DCE8F5';
const TG     = '#8A9BB5';
const TD     = '#1A2538';
const RED    = '#EF4B4B';
const ACTIVE_TRACK = '#D1E8F5';
const formatCompact = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const MiniRing = ({ pct: rawP = 0, color = GL, bad = false }) => {
  const p = isNaN(rawP) || !isFinite(rawP) ? 0 : rawP;
  const R = 15, CIRC = 2 * Math.PI * R;
  const fill = (p / 100) * CIRC;
  const trackColor = bad ? '#FCE9E9' : ACTIVE_TRACK;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={R} fill="none" stroke={trackColor} strokeWidth="4"/>
        <circle cx="18" cy="18" r={R} fill="none" stroke={bad ? RED : GL} strokeWidth="4" strokeDasharray={`${Math.min(fill, CIRC)} ${CIRC}`} strokeLinecap="round"/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color: bad ? RED : GD }}>{p}%</span>
    </div>
  );
};

const MacroCard = ({ label, value, maxValue, unit, trend, isAlert, icon }) => {
  const numVal = Number(value) || 0;
  const numMax = Number(maxValue) || 0;
  const p = numMax > 0 ? Math.round((numVal / numMax) * 100) : 0;
  const safeP = isNaN(p) || !isFinite(p) ? 0 : p;

  return (
    <div className="catalog-macro-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAlert ? '#FCE9E9' : ACTIVE_TRACK, color: isAlert ? RED : GD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', padding: '2px 6px', borderRadius: '6px', background: isAlert ? RED : '#1A2538' }}>{trend}</span>
      </div>
      <div className="catalog-macro-title">{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <span className="catalog-macro-value">{value} / {unit}</span>
        <MiniRing pct={Math.min(safeP, 100)} bad={isAlert}/>
      </div>
    </div>
  );
};

const Catalog = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  // View mode: 'large' | 'small' | 'square' | 'list'
  const [viewMode, setViewMode] = useState('list');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);
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
    
    const isDuplicate = categories.some(c => c.name.toLowerCase().trim() === newCatName.toLowerCase().trim());
    if (isDuplicate) {
      addToast("Bu kategoriya allaqachon mavjud!", "warning");
      return;
    }

    if (!storeId || isSavingCat) return;

    setIsSavingCat(true);
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
    } finally {
      setIsSavingCat(false);
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

  // Handle editProductId from navigation state
  useEffect(() => {
    if (location.state && location.state.editProductId && products.length > 0) {
      const p = products.find(prod => prod.id === location.state.editProductId);
      if (p) {
        // Clear state without triggering re-renders
        window.history.replaceState({}, document.title);
        // Delay opening modal slightly to ensure component is fully mounted
        setTimeout(() => {
          openModal(p);
        }, 100);
      }
    }
  }, [location.state, products]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCatModalOpen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setIsCatModalOpen(false);
        } else if (isImportOpen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setIsImportOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isCatModalOpen, isImportOpen]);

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
    if (await confirm({ message: `${product.name} ni o'chirishni xohlaysizmi? (Arxivga tushadi)`, confirmStyle: 'danger' })) {
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
        name: product.name || '', 
        barcode: product.barcode || '', 
        categoryId: product.categoryId || '',
        unit: product.unit || 'dona', 
        costPrice: product.costPrice || '', 
        sellPrice: product.sellPrice || '',
        stock: product.stockByWarehouse?.[selectedWarehouseId] || 0, 
        minStock: product.minStock || ''
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


  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v) + ' UZS';

  const filteredProducts = products.filter(p => 
    p.status !== 'archived' && 
    ((p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)) &&
    (categoryFilter === '' || p.categoryId === categoryFilter)
  );

  const totalDistinctProducts = products.filter(p => p.status !== 'archived').length;
  const totalPhysicalStock = products.reduce((acc, p) => p.status !== 'archived' ? acc + Number(p.stockByWarehouse?.[selectedWarehouseId] || 0) : acc, 0);
  const totalCostValue = products.reduce((acc, p) => p.status !== 'archived' ? acc + (Number(p.stockByWarehouse?.[selectedWarehouseId] || 0) * Number(p.costPrice || 0)) : acc, 0);
  const totalSellValue = products.reduce((acc, p) => p.status !== 'archived' ? acc + (Number(p.stockByWarehouse?.[selectedWarehouseId] || 0) * Number(p.sellPrice || 0)) : acc, 0);

  const getStockColor = (stock, minStock) => {
    if (stock <= 0) return 'var(--danger)';
    if (stock <= minStock) return 'var(--warning)';
    return 'var(--success)';
  };

  /* ── View toggle icons ── */
  const VIEW_MODES = [
    { id: 'large',  icon: <LayoutGrid size={18}/>,  title: 'Katta kartochkalar' },
    { id: 'small',  icon: <Grid3x3 size={18}/>,     title: 'Kichik kartochkalar' },
    { id: 'square', icon: <Rows3 size={18}/>,        title: "To'rtburchak kartochkalar" },
    { id: 'list',   icon: <List size={18}/>,         title: 'Ro\'yxat (List)' },
  ];

  const ProductActions = ({ p }) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button title="Tahrirlash" onClick={() => openModal(p)}
        style={{ width: 32, height: 32, borderRadius: '8px', border: '1.5px solid #DCE8F5', background: '#F7FAFF', color: '#4A90E2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#E8F2FC'}
        onMouseLeave={e => e.currentTarget.style.background = '#F7FAFF'}
      ><Edit size={14}/></button>
      <button title="O'chirish" onClick={() => handleDelete(p)}
        style={{ width: 32, height: 32, borderRadius: '8px', border: '1.5px solid #FFE0E0', background: '#FFF5F5', color: '#EF4B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = '#FCE8E8'}
        onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
      ><Trash2 size={14}/></button>
    </div>
  );

  return (
    <div className="catalog-container">
      {/* Header */}
      <div className="catalog-header">
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:800, color:'#1A2538', margin:0, letterSpacing:'-0.5px' }}>Mahsulotlar Katalogi</h1>
          <p style={{ fontSize:'13px', color:'#8A9BB5', marginTop:4 }}>{products.filter(p=>p.status!=='archived').length} ta mahsulot ro'yxatda</p>
        </div>
        <div className="catalog-header-actions">
          <button className="btn btn-outline" style={{ display:'flex', alignItems:'center', gap:'0.4rem' }} onClick={() => setIsTransferOpen(true)}>
            <FileSpreadsheet size={18}/> Stok ko'chirish
          </button>
          <button onClick={() => openModal()} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.6rem 1.3rem', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4A90E2,#7BCEEB)', color:'#fff', fontWeight:700, fontSize:'0.875rem', boxShadow:'0 4px 14px -4px #4A90E255' }}>
            <Plus size={18}/> Yangi mahsulot
          </button>
        </div>
      </div>

      {/* MacroCards */}
      <div className="catalog-macro-container">
        <MacroCard label="Xilma-xillik (Turi)" value={new Intl.NumberFormat('uz-UZ').format(totalDistinctProducts)} maxValue={100} unit="max" trend="100%" isAlert={false} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>}/>
        <MacroCard label="Jami Qoldiq" value={formatCompact(totalPhysicalStock)} maxValue={10000} unit="dona" trend="Barchasi" isAlert={false} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 7h-7L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path></svg>}/>
        <MacroCard label="Jami Tannarx" value={formatCompact(totalCostValue)} maxValue={totalCostValue+totalSellValue} unit={curr} trend="Tikilgan" isAlert={false} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>}/>
        <MacroCard label="Kutilayotgan Tushum" value={formatCompact(totalSellValue)} maxValue={totalCostValue+totalSellValue} unit={curr} trend="Prognoz" isAlert={false} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>}/>
      </div>

      {/* Main card — no fixed height, page scrolls naturally */}
      <div style={{ border:'1px solid #DCE8F5', borderRadius:'20px', background:'#fff', boxShadow:'0 8px 24px -18px rgba(0,0,0,.3)' }}>
        {/* Toolbar — sticky so it stays while scrolling */}
        <div className="catalog-toolbar">
          {/* Search */}
          <div className="catalog-search-wrap">
            <Search size={17} style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#8A9BB5' }}/>
            <input type="text" placeholder="Mahsulot nomi yoki shtrix-kodi..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'9px 10px 9px 2.6rem', borderRadius:'12px', border:'1.5px solid #DCE8F5', fontSize:'14px', outline:'none', fontFamily:'inherit' }}
              onFocus={e => e.target.style.borderColor='#4A90E2'}
              onBlur={e => e.target.style.borderColor='#DCE8F5'}
            />
          </div>
          <div className="catalog-toolbar-right">
            {/* Category filter */}
            <div className="catalog-category-filter">
              <CustomSelect value={categoryFilter} onChange={v => setCategoryFilter(v)}
                options={[{value:'',label:'Barcha kategoriyalar'},...categories.map(c=>({value:c.id,label:c.name}))]}
              />
            </div>
            {/* View mode toggle */}
            <div className="catalog-view-mode-toggle">
              {VIEW_MODES.map(vm => (
                <button key={vm.id} title={vm.title} onClick={() => setViewMode(vm.id)}
                  style={{ width:36, height:36, borderRadius:'9px', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s',
                    background: viewMode===vm.id ? '#fff' : 'transparent',
                    color: viewMode===vm.id ? '#4A90E2' : '#8A9BB5',
                    boxShadow: viewMode===vm.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                >{vm.icon}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Products area — no overflow, page scrolls */}
        <div>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'5rem', color:'#8A9BB5', fontSize:'15px' }}>Mahsulotlar topilmadi</div>
          ) : (
            <>
              {/* ── LIST VIEW ── */}
              {viewMode === 'list' && (
                <div className="catalog-table-wrapper">
                  <div className="catalog-table-header" style={{ padding:'12px 20px', borderBottom:'2px solid #DCE8F5', background:'#F7FAFF', color:'#8A9BB5', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    <div style={{ paddingLeft:'54px' }}>Mahsulot</div>
                    <div>Kategoriya</div>
                    <div>Qoldiq</div>
                    <div>Narxlar</div>
                    <div style={{ textAlign:'right' }}>Amal</div>
                  </div>
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    const stock = p.stockByWarehouse?.[selectedWarehouseId] || 0;
                    return (
                      <div key={p.id} className="catalog-table-row"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor='#F4F8FF'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                        <div className="catalog-row-info">
                          <div style={{ width:40, height:40, borderRadius:'12px', background:'#F0F5FC', color:'#8A9BB5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Package size={18}/></div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:'14px', color:'#1A2538', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize:'11px', color:'#8A9BB5', marginTop:2, fontFamily:'monospace' }}>{p.barcode || '—'}</div>
                          </div>
                        </div>
                        
                        <div className="catalog-row-extra">
                          <span style={{ padding:'3px 10px', background:'#D1E8F5', color:'#2C6FBF', borderRadius:'999px', fontSize:'12px', fontWeight:700, display:'inline-block' }}>{cat?.name || 'Boshqa'}</span>
                          <div>
                            <div style={{ fontWeight:700, color:getStockColor(stock,p.minStock), fontSize:'14px' }}>{stock} {p.unit}</div>
                            <div style={{ fontSize:'11px', color:'#8A9BB5' }}>qoldiq</div>
                          </div>
                          <div>
                            <div style={{ fontWeight:700, color:'#4A90E2', fontSize:'14px' }}><CurrencyDisplay amount={p.sellPrice}/></div>
                            <div style={{ fontSize:'11px', color:'#8A9BB5' }}>tn: <CurrencyDisplay amount={p.costPrice}/></div>
                          </div>
                        </div>

                        <div className="catalog-row-actions">
                          <ProductActions p={p}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── LARGE CARD VIEW ── */}
              {viewMode === 'large' && (
                <div className="catalog-grid-large">
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    const stock = p.stockByWarehouse?.[selectedWarehouseId] || 0;
                    return (
                      <div key={p.id} style={{ border:'1.5px solid #DCE8F5', borderRadius:'20px', background:'#fff', padding:'20px', boxShadow:'0 4px 16px -8px rgba(0,0,0,.15)', display:'flex', flexDirection:'column', gap:'14px', transition:'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 28px -8px rgba(74,144,226,0.25)'; e.currentTarget.style.borderColor='#B8D9F5'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow='0 4px 16px -8px rgba(0,0,0,.15)'; e.currentTarget.style.borderColor='#DCE8F5'; }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                          <div style={{ width:52, height:52, borderRadius:'16px', background:'linear-gradient(135deg,#D1E8F5,#EAF4FC)', color:'#4A90E2', display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={24}/></div>
                          <span style={{ padding:'4px 10px', background:'#D1E8F5', color:'#2C6FBF', borderRadius:'999px', fontSize:'11px', fontWeight:700 }}>{cat?.name || 'Boshqa'}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight:800, fontSize:'16px', color:'#1A2538', marginBottom:4 }}>{p.name}</div>
                          <div style={{ fontSize:'12px', color:'#8A9BB5', fontFamily:'monospace' }}>{p.barcode || '—'}</div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                          <div style={{ background:'#F7FAFF', borderRadius:'12px', padding:'10px' }}>
                            <div style={{ fontSize:'11px', color:'#8A9BB5', marginBottom:4 }}>Sotish narxi</div>
                            <div style={{ fontWeight:800, color:'#4A90E2', fontSize:'15px' }}><CurrencyDisplay amount={p.sellPrice}/></div>
                          </div>
                          <div style={{ background:'#F7FAFF', borderRadius:'12px', padding:'10px' }}>
                            <div style={{ fontSize:'11px', color:'#8A9BB5', marginBottom:4 }}>Qoldiq</div>
                            <div style={{ fontWeight:800, color:getStockColor(stock,p.minStock), fontSize:'15px' }}>{stock} {p.unit}</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:4, borderTop:'1px solid #DCE8F5' }}><ProductActions p={p}/></div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── SMALL CARD VIEW ── */}
              {viewMode === 'small' && (
                <div className="catalog-grid-small">
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    const stock = p.stockByWarehouse?.[selectedWarehouseId] || 0;
                    return (
                      <div key={p.id} style={{ border:'1.5px solid #DCE8F5', borderRadius:'16px', background:'#fff', padding:'14px', display:'flex', flexDirection:'column', gap:'8px', transition:'all 0.2s', cursor:'default' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px -6px rgba(74,144,226,0.2)'; e.currentTarget.style.borderColor='#B8D9F5'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#DCE8F5'; }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ width:36, height:36, borderRadius:'10px', background:'#D1E8F5', color:'#4A90E2', display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={16}/></div>
                          <span style={{ width:10, height:10, borderRadius:'50%', background:getStockColor(stock,p.minStock), display:'inline-block' }}/>
                        </div>
                        <div style={{ fontWeight:700, fontSize:'13px', color:'#1A2538', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:'11px', color:'#4A90E2', fontWeight:700 }}><CurrencyDisplay amount={p.sellPrice}/></div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:'11px', color:'#8A9BB5' }}>{stock} {p.unit}</span>
                          <ProductActions p={p}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── SQUARE (grid 3-col with image-like top) VIEW ── */}
              {viewMode === 'square' && (
                <div className="catalog-grid-square">
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    const stock = p.stockByWarehouse?.[selectedWarehouseId] || 0;
                    return (
                      <div key={p.id} style={{ border:'1.5px solid #DCE8F5', borderRadius:'18px', background:'#fff', overflow:'hidden', boxShadow:'0 2px 12px -6px rgba(0,0,0,.12)', transition:'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px -6px rgba(74,144,226,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px -6px rgba(0,0,0,.12)'; }}>
                        {/* Image-like gradient top */}
                        <div style={{ height:90, background:'linear-gradient(135deg,#4A90E2 0%,#7BCEEB 50%,#D1E8F5 100%)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                          <Package size={36} color="rgba(255,255,255,0.8)"/>
                          <span style={{ position:'absolute', top:10, right:10, padding:'3px 8px', background:'rgba(255,255,255,0.25)', backdropFilter:'blur(8px)', color:'#fff', borderRadius:'8px', fontSize:'11px', fontWeight:700 }}>{cat?.name || 'Boshqa'}</span>
                          <span style={{ position:'absolute', bottom:10, left:10, width:10, height:10, borderRadius:'50%', background:getStockColor(stock,p.minStock), boxShadow:'0 0 0 2px rgba(255,255,255,0.5)' }}/>
                        </div>
                        {/* Body */}
                        <div style={{ padding:'12px 14px' }}>
                          <div style={{ fontWeight:700, fontSize:'14px', color:'#1A2538', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:4 }}>{p.name}</div>
                          <div style={{ fontWeight:800, color:'#4A90E2', fontSize:'15px', marginBottom:6 }}><CurrencyDisplay amount={p.sellPrice}/></div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:'12px', color:'#8A9BB5' }}>{stock} {p.unit}</span>
                            <ProductActions p={p}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Drawer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}>
        <FormInput label="Shtrix-kod" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} error={formErrors.barcode} placeholder="Avtomatik yaratish uchun bo'sh qoldiring" />
        <FormInput label="Nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} error={formErrors.name} required />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A2538' }}>Kategoriya <span style={{ color: 'var(--danger)' }}>*</span></label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <CustomSelect 
              value={formData.categoryId} 
              onChange={v => setFormData({...formData, categoryId: v})}
              options={[
                {value: '', label: 'Kategoriya tanlang'},
                ...categories.map(c => ({value: c.id, label: c.name}))
              ]}
              style={{ flex: 1, border: `1px solid ${formErrors.categoryId ? 'var(--danger)' : 'transparent'}`, borderRadius: 'var(--radius-md)' }}
            />
            <button 
              type="button"
              title="Yangi kategoriya qo'shish"
              onClick={() => setIsCatModalOpen(!isCatModalOpen)}
              style={{
                width: 44, height: 44, flexShrink: 0, borderRadius: '12px', border: 'none',
                background: isCatModalOpen ? '#4A90E2' : '#D1E8F5',
                color: isCatModalOpen ? '#fff' : '#4A90E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Plus size={18} style={{ transform: isCatModalOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
          {formErrors.categoryId && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{formErrors.categoryId}</span>}
        </div>

        {/* ── Inline category creation panel ── */}
        <AnimatePresence>
          {isCatModalOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '16px' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                border: '2px solid #4A90E2', borderRadius: '16px',
                background: 'linear-gradient(135deg, #F0F7FF 0%, #E8F4FD 100%)',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4A90E2' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#4A90E2' }}>Yangi kategoriya qo'shish</span>
                </div>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Masalan: Ichimliklar"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '1.5px solid #B8D9F5', borderRadius: '10px',
                    fontSize: '14px', outline: 'none', background: '#fff',
                    color: '#1A2538', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#4A90E2'}
                  onBlur={e => e.target.style.borderColor = '#B8D9F5'}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setIsCatModalOpen(false); setNewCatName(''); }}
                    style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1.5px solid #B8D9F5', background: '#fff', color: '#8A9BB5', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >Bekor</button>
                  <button
                    onClick={handleAddCategory}
                    disabled={isSavingCat}
                    style={{ flex: 2, padding: '9px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px -4px #4A90E255' }}
                  >{isSavingCat ? 'Saqlanmoqda...' : '+ Saqlash'}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="form-grid-2">
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

        <div className="form-grid-2">
          {!editingId ? (
             <FormInput label="Boshlang'ich qoldiq" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
          ) : (
             <FormInput label="Qoldiq (Faqat ma'lumot uchun)" type="number" value={formData.stock} disabled />
          )}
          <FormInput label="Minimal qoldiq" type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="5" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A2538' }}>Birlik</label>
            <CustomSelect 
              value={formData.unit} 
              onChange={v => setFormData({...formData, unit: v})}
              options={[
                {value: 'dona', label: 'Dona'},
                {value: 'kg', label: 'Kg'},
                {value: 'metr', label: 'Metr'},
                {value: 'litr', label: 'Litr'}
              ]}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={() => setIsModalOpen(false)}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #DCE8F5', background: '#fff', color: '#1A2538', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
          >Bekor qilish</button>
          <button
            onClick={handleSave}
            style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 14px -4px #4A90E266' }}
          >Saqlash</button>
        </div>
      </Drawer>
      
      <TransferDrawer isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />

    </div>
  );
};

export default Catalog;
