import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useConfirm } from '../../context/ConfirmContext';
import TitleBar from '../../components/TitleBar';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const Attributes = () => {
  const { userProfile } = useRoles();
  const { confirm } = useConfirm();
  const storeId = userProfile?.storeOwnerId;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({ name: '', values: [] });
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, `users/${storeId}/attributeTemplates`));
    const unsub = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const openModal = (template = null) => {
    if (template) {
      setEditingId(template.id);
      setFormData({ name: template.name, values: [...template.values] });
    } else {
      setEditingId(null);
      setFormData({ name: '', values: [] });
    }
    setNewValue('');
    setShowModal(true);
  };

  const handleAddValue = () => {
    if (newValue.trim() && !formData.values.includes(newValue.trim())) {
      setFormData(prev => ({ ...prev, values: [...prev.values, newValue.trim()] }));
      setNewValue('');
    }
  };

  const handleRemoveValue = (valToRemove) => {
    setFormData(prev => ({ ...prev, values: prev.values.filter(v => v !== valToRemove) }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || formData.values.length === 0) {
      alert("Nomi va kamida bitta qiymat kiritilishi shart");
      return;
    }
    
    try {
      if (editingId) {
        await updateDoc(doc(db, `users/${storeId}/attributeTemplates`, editingId), {
          name: formData.name.trim(),
          values: formData.values
        });
      } else {
        await addDoc(collection(db, `users/${storeId}/attributeTemplates`), {
          name: formData.name.trim(),
          values: formData.values
        });
      }
      setShowModal(false);
    } catch (err) {
      alert("Xato: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Ushbu shablonni o'chirib yubormoqchimisiz?", confirmStyle: 'danger' })) {
      await deleteDoc(doc(db, `users/${storeId}/attributeTemplates`, id));
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Yuklanmoqda...</div>;

  return (
    <>
      <TitleBar title="Atribut Shablonlari" />
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Atributlar (Variantlar)</h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '4px 0 0' }}>Mahsulotlarga rang, o'lcham va xotira kabi tanlovlarni qo'shish uchun shablonlar</p>
          </div>
          <button 
            onClick={() => openModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#4F46E5', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={16} /> Yangi Qo'shish
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {templates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '8px', color: '#6B7280' }}>
              Hozircha atribut shablonlari yo'q
            </div>
          )}
          
          {templates.map(t => (
            <div key={t.id} style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{t.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {t.values.map(v => (
                    <span key={v} style={{ background: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #E5E7EB' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => openModal(t)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.125rem' }}>{editingId ? 'Shablonni tahrirlash' : 'Yangi atribut shabloni'}</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Nomi (masalan: Rang)</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} 
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Qiymatlar (Oq, Ko'k...)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="text" 
                  value={newValue} 
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddValue()}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '6px' }} 
                />
                <button onClick={handleAddValue} style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '0 1rem', borderRadius: '6px', cursor: 'pointer' }}>Qo'shish</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {formData.values.map(v => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#EEF2FF', color: '#4F46E5', padding: '2px 6px 2px 8px', borderRadius: '99px', fontSize: '0.75rem' }}>
                    {v}
                    <button onClick={() => handleRemoveValue(v)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#4F46E5', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer' }}>Bekor qilish</button>
              <button onClick={handleSave} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Attributes;
