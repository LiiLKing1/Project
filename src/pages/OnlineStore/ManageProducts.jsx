import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc } from '../../services/firebaseMock';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRoles } from '../../context/RolesContext';
import TitleBar from '../../components/TitleBar';
import { Tag, Edit2, Search, Eye, EyeOff, Save, Plus, X, Image as ImageIcon, Trash2, ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

const ManageProducts = () => {
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Animation state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Editor state
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    isOnlineVisible: false,
    onlineDescription: '',
    onlineImages: [],
    variants: [],
    attributes: []
  });
  
  const [newImageUrl, setNewImageUrl] = useState('');
  
  // Attribute UI state
  const [showAttrSelect, setShowAttrSelect] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [attrValueInputs, setAttrValueInputs] = useState({});

  useEffect(() => {
    if (!storeId) return;
    
    // Products
    const qProds = query(collection(db, `users/${storeId}/products`), orderBy('createdAt', 'desc'));
    const unsubProds = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Attribute Templates
    const qTmpls = query(collection(db, `users/${storeId}/attributeTemplates`));
    const unsubTmpls = onSnapshot(qTmpls, (snapshot) => {
      setTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubProds();
      unsubTmpls();
    };
  }, [storeId]);

  const toggleVisibility = async (product) => {
    try {
      await updateDoc(doc(db, `users/${storeId}/products`, product.id), {
        isOnlineVisible: !product.isOnlineVisible
      });
    } catch (err) {
      alert("Xato: " + err.message);
    }
  };

  const handleOpenEditor = (e, product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setClickPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    
    setEditingProduct(product);
    setFormData({
      isOnlineVisible: product.isOnlineVisible || false,
      onlineDescription: product.onlineDescription || '',
      onlineImages: product.onlineImages || [],
      variants: product.variants || [],
      attributes: product.attributes || []
    });
    setNewImageUrl('');
    setShowAttrSelect(false);
    setIsEditorOpen(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setUploadingImages(true);
    const storage = getStorage();
    const uploadedUrls = [];
    
    try {
      for (const file of files) {
        const fileName = `products/${storeId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
      
      setFormData(prev => ({
        ...prev,
        onlineImages: [...prev.onlineImages, ...uploadedUrls]
      }));
    } catch (err) {
      alert("Rasm yuklashda xatolik: " + err.message);
    } finally {
      setUploadingImages(false);
      // clear the input
      e.target.value = null;
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormData(prev => ({ ...prev, onlineImages: [...prev.onlineImages, newImageUrl.trim()] }));
      setNewImageUrl('');
    }
  };
  
  const removeImageUrl = (index) => {
    setFormData(prev => ({ ...prev, onlineImages: prev.onlineImages.filter((_, i) => i !== index) }));
  };

  // ---- Attributes Logic ----
  const handleAddExistingAttribute = (tmpl) => {
    if (!formData.attributes.find(a => a.name === tmpl.name)) {
      setFormData(prev => ({
        ...prev,
        attributes: [...prev.attributes, { name: tmpl.name, values: [...tmpl.values] }]
      }));
    }
    setShowAttrSelect(false);
  };

  const handleCreateNewAttribute = async () => {
    if (!newAttrName.trim()) return;
    if (formData.attributes.find(a => a.name.toLowerCase() === newAttrName.trim().toLowerCase())) {
      alert("Bu atribut allaqachon qo'shilgan");
      return;
    }

    const newAttr = { name: newAttrName.trim(), values: [] };
    
    // Asosiy ro'yxatga qo'shish
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, newAttr]
    }));
    
    // Shablonlarga ham saqlab qo'yish (kelajakda ishlatish uchun)
    try {
      await addDoc(collection(db, `users/${storeId}/attributeTemplates`), newAttr);
    } catch(err) {
      console.error("Shablon saqlashda xato", err);
    }

    setNewAttrName('');
    setShowAttrSelect(false);
  };

  const removeAttribute = (name) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter(a => a.name !== name)
    }));
  };

  const handleAddAttrValue = (attrName) => {
    const val = attrValueInputs[attrName];
    if (!val || !val.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => {
        if (a.name === attrName && !a.values.includes(val.trim())) {
          return { ...a, values: [...a.values, val.trim()] };
        }
        return a;
      })
    }));
    
    setAttrValueInputs(prev => ({ ...prev, [attrName]: '' }));
  };

  const removeAttrValue = (attrName, valToRemove) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map(a => {
        if (a.name === attrName) {
          return { ...a, values: a.values.filter(v => v !== valToRemove) };
        }
        return a;
      })
    }));
  };

  const generateVariants = () => {
    const validAttrs = formData.attributes.filter(a => a.values.length > 0);
    if (validAttrs.length === 0) {
      alert("Variantlarni generatsiya qilish uchun kamida bitta atribut va uning qiymati bo'lishi kerak.");
      return;
    }

    const generateCombinations = (arrays) => {
      if (arrays.length === 0) return [[]];
      const result = [];
      const rest = generateCombinations(arrays.slice(1));
      for (const val of arrays[0]) {
        for (const r of rest) {
          result.push([val, ...r]);
        }
      }
      return result;
    };
    
    const valuesArrays = validAttrs.map(a => a.values);
    const combinations = generateCombinations(valuesArrays);
    
    const newVariants = combinations.map(combo => {
      const name = combo.join(' / ');
      // Mavjud variant bo'lsa, uning narxini saqlab qolamiz
      const existing = formData.variants.find(v => v.name === name);
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: name,
        additionalPrice: existing ? existing.additionalPrice : 0,
        sku: existing ? existing.sku : ''
      };
    });
    
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  // ---- Variants Table Logic ----
  const updateVariant = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const removeVariant = (id) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
  };

  const addManualVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { id: Date.now().toString(), name: '', additionalPrice: 0, sku: '' }]
    }));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, `users/${storeId}/products`, editingProduct.id), {
        isOnlineVisible: formData.isOnlineVisible,
        onlineDescription: formData.onlineDescription,
        onlineImages: formData.onlineImages,
        variants: formData.variants,
        attributes: formData.attributes
      });
      setIsEditorOpen(false);
      setTimeout(() => setEditingProduct(null), 500); // wait for exit animation
    } catch (err) {
      alert("Xato: " + err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.includes(search))
  );

  if (loading) return <div style={{ padding: '2rem' }}>Yuklanmoqda...</div>;

  return (
    <>
      <TitleBar title="Onlayn Mahsulotlar" />
      <div style={{ padding: '1.5rem', opacity: isEditorOpen ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Mahsulotlarni onlayn ko'rgazmaga qo'yish</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Qaysi mahsulotlar onlayn do'konda sotilishini belgilang, rasmlar va atributlar qo'shing</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', width: '300px' }}>
            <Search size={18} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', marginLeft: '0.5rem', width: '100%', fontSize: '0.875rem' }} 
            />
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <tr>
                <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Mahsulot nomi</th>
                <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Asosiy narx</th>
                <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Qoldiq</th>
                <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Onlayn holat</th>
                <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', background: '#F3F4F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.onlineImages && p.onlineImages[0] ? (
                          <img src={p.onlineImages[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Tag size={20} color="#9CA3AF" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Shtrix-kod: {p.barcode || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{formatCurrency(p.sellPrice)}</td>
                  <td style={{ padding: '1rem' }}>{p.quantity} {p.unit}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => toggleVisibility(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '99px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: p.isOnlineVisible ? '#ECFDF5' : '#F3F4F6', color: p.isOnlineVisible ? '#059669' : '#6B7280' }}
                    >
                      {p.isOnlineVisible ? <><Eye size={14} /> Ochiq</> : <><EyeOff size={14} /> Yopiq</>}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => handleOpenEditor(e, p)}
                      style={{ background: 'white', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Edit2 size={16} /> Sozlash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isEditorOpen && editingProduct && (
          <motion.div
            initial={{ clipPath: `circle(0px at ${clickPos.x}px ${clickPos.y}px)`, opacity: 0 }}
            animate={{ clipPath: `circle(150% at ${clickPos.x}px ${clickPos.y}px)`, opacity: 1 }}
            exit={{ clipPath: `circle(0px at ${clickPos.x}px ${clickPos.y}px)`, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ 
              position: 'fixed', inset: 0, background: '#F9FAFB', zIndex: 1000, 
              overflowY: 'auto', display: 'flex', flexDirection: 'column' 
            }}
          >
            {/* Header Sticky */}
            <div style={{ background: 'white', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setIsEditorOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  <ArrowLeft size={20} /> Orqaga
                </button>
                <div style={{ height: '24px', width: '1px', background: '#E5E7EB' }}></div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{editingProduct.name} - Sozlamalar</h2>
              </div>
              <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#4F46E5', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <Save size={18} /> Saqlash
              </button>
            </div>

            <div style={{ maxWidth: '800px', margin: '2rem auto', width: '100%', padding: '0 1.5rem', paddingBottom: '5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* STATUS */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="vis"
                    checked={formData.isOnlineVisible}
                    onChange={e => setFormData(prev => ({ ...prev, isOnlineVisible: e.target.checked }))}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: '#4F46E5' }}
                  />
                  <div>
                    <label htmlFor="vis" style={{ fontWeight: 600, color: '#111827', cursor: 'pointer', display: 'block', fontSize: '1rem' }}>Onlayn do'konda ko'rsatish</label>
                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Mijozlar ushbu mahsulotni ko'rishi va xarid qilishi mumkin bo'ladi</span>
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600 }}>Tavsif (Description)</h3>
                <textarea 
                  value={formData.onlineDescription}
                  onChange={e => setFormData(prev => ({ ...prev, onlineDescription: e.target.value }))}
                  rows={5}
                  style={{ width: '100%', padding: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', resize: 'vertical', fontSize: '0.875rem', fontFamily: 'inherit' }}
                  placeholder="Mahsulot haqida batafsil ma'lumot kiriting..."
                />
              </div>

              {/* IMAGES */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600 }}>Rasmlar</h3>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F3F4F6', color: '#374151', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', border: '1px dashed #9CA3AF', fontWeight: 500 }}>
                    <Upload size={18} />
                    {uploadingImages ? 'Yuklanmoqda...' : 'Fayl yuklash'}
                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploadingImages} />
                  </label>

                  <div style={{ display: 'flex', flex: 1, gap: '0.5rem', minWidth: '250px' }}>
                     <input 
                       type="text" 
                       value={newImageUrl}
                       onChange={e => setNewImageUrl(e.target.value)}
                       placeholder="Yoki internetdan rasm URL manzili..."
                       style={{ flex: 1, padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                     />
                     <button onClick={addImageUrl} style={{ background: '#4F46E5', color: 'white', padding: '0 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>URL Qo'shish</button>
                  </div>
                </div>
                
                {formData.onlineImages.length > 0 ? (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {formData.onlineImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                        <img src={img} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removeImageUrl(i)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)', color: '#EF4444', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#F9FAFB', borderRadius: '12px', color: '#9CA3AF', border: '1px dashed #D1D5DB' }}>
                    <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>Hozircha rasmlar kiritilmagan</p>
                  </div>
                )}
              </div>

              {/* ATTRIBUTES */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Atributlar</h3>
                    <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Rang, O'lcham, Xotira kabi xususiyatlar qo'shing</p>
                  </div>
                  <button onClick={() => setShowAttrSelect(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#EEF2FF', color: '#4F46E5', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={16} /> Atribut qo'shish
                  </button>
                </div>

                {showAttrSelect && (
                  <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #E5E7EB' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#374151' }}>Mavjud shablonlardan tanlang:</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {templates.length === 0 && <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Shablonlar yo'q</span>}
                      {templates.map(t => (
                        <button key={t.id} onClick={() => handleAddExistingAttribute(t)} style={{ background: 'white', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: '#4F46E5', color: '#4F46E5' } }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                    
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#374151' }}>Yoki yangi atribut yarating:</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={newAttrName} 
                        onChange={e => setNewAttrName(e.target.value)} 
                        placeholder="Nomi (masalan: Material)" 
                        style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '8px', flex: 1 }}
                      />
                      <button onClick={handleCreateNewAttribute} style={{ background: '#111827', color: 'white', padding: '0 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Yaratish</button>
                      <button onClick={() => setShowAttrSelect(false)} style={{ background: 'white', border: '1px solid #D1D5DB', padding: '0 1rem', borderRadius: '8px', cursor: 'pointer' }}>Bekor qilish</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.attributes.map((attr, idx) => (
                    <div key={idx} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{attr.name}</span>
                        <button onClick={() => removeAttribute(attr.name)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {attr.values.map(val => (
                          <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#EEF2FF', color: '#4F46E5', padding: '0.25rem 0.5rem 0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.875rem' }}>
                            {val}
                            <button onClick={() => removeAttrValue(attr.name, val)} style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><X size={14}/></button>
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          placeholder={`${attr.name} qiymati qo'shing...`}
                          value={attrValueInputs[attr.name] || ''}
                          onChange={e => setAttrValueInputs(prev => ({ ...prev, [attr.name]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddAttrValue(attr.name)}
                          style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem', width: '200px' }}
                        />
                        <button onClick={() => handleAddAttrValue(attr.name)} style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '0 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>Qo'shish</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VARIANTS */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Variantlar va Narxlar</h3>
                    <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Atributlar asosida variantlarni yarating yoki qo'lda kiriting</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={generateVariants} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111827', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                      <RefreshCw size={16} /> Generatsiya qilish
                    </button>
                    <button onClick={addManualVariant} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#EEF2FF', color: '#4F46E5', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                      <Plus size={16} /> Qo'lda qo'shish
                    </button>
                  </div>
                </div>

                {formData.variants.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#F9FAFB', borderRadius: '12px', color: '#9CA3AF', border: '1px dashed #D1D5DB' }}>
                     Variantlar mavjud emas. Mahsulot faqat standart narxda sotiladi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {formData.variants.map((v) => (
                      <div key={v.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <input 
                          type="text" 
                          placeholder="Nomi (masalan: Oq / 64GB)" 
                          value={v.name}
                          onChange={e => updateVariant(v.id, 'name', e.target.value)}
                          style={{ flex: 2, padding: '0.625rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.875rem' }}>+</span>
                          <input 
                            type="number" 
                            placeholder="Qo'shimcha narx" 
                            value={v.additionalPrice}
                            onChange={e => updateVariant(v.id, 'additionalPrice', Number(e.target.value))}
                            style={{ width: '100%', padding: '0.625rem 0.625rem 0.625rem 1.5rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="SKU" 
                          value={v.sku}
                          onChange={e => updateVariant(v.id, 'sku', e.target.value)}
                          style={{ flex: 1, padding: '0.625rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                        <button onClick={() => removeVariant(v.id)} style={{ padding: '0.5rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ManageProducts;
