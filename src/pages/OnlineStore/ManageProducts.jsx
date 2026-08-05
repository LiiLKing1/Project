import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import TitleBar from '../../components/TitleBar';
import { Tag, Edit2, Search, Eye, EyeOff, Save, Plus, X, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const ManageProducts = () => {
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    isOnlineVisible: false,
    onlineDescription: '',
    onlineImages: [],
    variants: []
  });
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, `users/${storeId}/products`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
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

  const openModal = (product) => {
    setEditingProduct(product);
    setFormData({
      isOnlineVisible: product.isOnlineVisible || false,
      onlineDescription: product.onlineDescription || '',
      onlineImages: product.onlineImages || [],
      variants: product.variants || []
    });
    setNewImageUrl('');
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

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { id: Date.now().toString(), name: '', additionalPrice: 0, sku: '' }]
    }));
  };

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

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, `users/${storeId}/products`, editingProduct.id), {
        isOnlineVisible: formData.isOnlineVisible,
        onlineDescription: formData.onlineDescription,
        onlineImages: formData.onlineImages,
        variants: formData.variants
      });
      setEditingProduct(null);
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
      <div style={{ padding: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Mahsulotlarni onlayn ko'rgazmaga qo'yish</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6B7280', fontSize: '0.875rem' }}>Qaysi mahsulotlar onlayn do'konda sotilishini belgilang va qo'shimcha rasmlar kiriting</p>
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
                      <div style={{ width: '40px', height: '40px', background: '#F3F4F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.onlineImages && p.onlineImages[0] ? (
                          <img src={p.onlineImages[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
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
                      onClick={() => openModal(p)}
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

      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{editingProduct.name} - Onlayn Sozlamalari</h3>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>Asosiy narx: {formatCurrency(editingProduct.sellPrice)}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: '#F9FAFB', padding: '1rem', borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                id="vis"
                checked={formData.isOnlineVisible}
                onChange={e => setFormData(prev => ({ ...prev, isOnlineVisible: e.target.checked }))}
                style={{ width: '1.25rem', height: '1.25rem' }}
              />
              <label htmlFor="vis" style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}>Ushbu mahsulotni onlayn do'konda ko'rsatish</label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>To'liq tavsif (Description)</label>
              <textarea 
                value={formData.onlineDescription}
                onChange={e => setFormData(prev => ({ ...prev, onlineDescription: e.target.value }))}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', resize: 'vertical' }}
                placeholder="Mahsulot haqida batafsil ma'lumot..."
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Rasmlar (URL manzillar)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                />
                <button onClick={addImageUrl} style={{ background: '#4F46E5', color: 'white', padding: '0 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Qo'shish</button>
              </div>
              
              {formData.onlineImages.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {formData.onlineImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                      <img src={img} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeImageUrl(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', color: '#EF4444', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Variantlar (Ixtiyoriy)</label>
                <button onClick={addVariant} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '0.25rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Variant Qo'shish
                </button>
              </div>
              
              {formData.variants.length === 0 ? (
                <div style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic' }}>Variantlar mavjud emas (mahsulot yakka holatda sotiladi)</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {formData.variants.map((v, index) => (
                    <div key={v.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Nomi (masalan: Qizil, 64GB)" 
                        value={v.name}
                        onChange={e => updateVariant(v.id, 'name', e.target.value)}
                        style={{ flex: 2, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Qo'shimcha narx (so'm)" 
                        value={v.additionalPrice}
                        onChange={e => updateVariant(v.id, 'additionalPrice', Number(e.target.value))}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                      />
                      <input 
                        type="text" 
                        placeholder="SKU (ixtiyoriy)" 
                        value={v.sku}
                        onChange={e => updateVariant(v.id, 'sku', e.target.value)}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px' }}
                      />
                      <button onClick={() => removeVariant(v.id)} style={{ padding: '0.5rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
              <button onClick={() => setEditingProduct(null)} style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Bekor qilish</button>
              <button onClick={handleSave} style={{ padding: '0.75rem 1.5rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageProducts;
