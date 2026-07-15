import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { saveDoc, editDoc, removeDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', companyName: '', phone: '', address: '', note: '' });

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/suppliers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      addToast(error.message, 'error');
    });
    return () => unsub();
  }, [addToast, storeId]);

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      addToast('Ism va telefon raqam kiritilishi shart', 'warning');
      return;
    }
    if (!storeId) return;

    const payload = {
      ...formData,
      status: 'active'
    };

    try {
      if (editingId) {
        await editDoc(doc(db, `users/${storeId}/suppliers`, editingId), payload);
        addToast('Yetkazib beruvchi yangilandi', 'success');
      } else {
        await saveDoc(collection(db, `users/${storeId}/suppliers`), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        addToast('Yetkazib beruvchi qo\'shildi', 'success');
      }
      setIsDrawerOpen(false);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!storeId) return;
    if (window.confirm('Haqiqatan ham bu yetkazib beruvchini arxivlamoqchimisiz?')) {
      try {
        await editDoc(doc(db, `users/${storeId}/suppliers`, id), { status: 'archived' });
        addToast('Yetkazib beruvchi arxivlandi', 'info');
      } catch (error) {
        addToast(error.message, 'error');
      }
    }
  };

  const openDrawer = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ 
        fullName: supplier.fullName || '', 
        companyName: supplier.companyName || '',
        phone: supplier.phone || '', 
        address: supplier.address || '', 
        note: supplier.note || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ fullName: '', companyName: '', phone: '', address: '', note: '' });
    }
    setIsDrawerOpen(true);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.status !== 'archived' && (
    (s.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.companyName || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.phone || '').includes(search)
  ));

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={() => window.history.back()}>← Orqaga</button>
        <h1 className="h1" style={{ margin: 0 }}>Yetkazib beruvchilar</h1>
      </div>
      
      <div className="flex-between">
        <h2 className="h2">Ro'yxat</h2>
        <button className="btn btn-primary" onClick={() => openDrawer()}><UserPlus size={18} /> Yangi qo'shish</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '350px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Ism, kompaniya yoki telefon..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Ism/Familiya</th>
                  <th style={{ padding: '1rem' }}>Kompaniya</th>
                  <th style={{ padding: '1rem' }}>Telefon</th>
                  <th style={{ padding: '1rem' }}>Manzil</th>
                  <th style={{ padding: '1rem' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Yetkazib beruvchilar topilmadi</td></tr>
                ) : filteredSuppliers.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{s.fullName}</td>
                    <td style={{ padding: '1rem' }}>{s.companyName || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{s.phone}</td>
                    <td style={{ padding: '1rem' }}>{s.address || '-'}</td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--primary)' }} onClick={() => openDrawer(s)}><Edit size={16} /></button>
                      <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
        </div>
      </div>

      <Drawer position="right" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={editingId ? 'Tahrirlash' : 'Yangi yetkazib beruvchi'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormInput label="Ism-familiya *" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
          <FormInput label="Telefon raqami *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          <FormInput label="Kompaniya nomi (ixtiyoriy)" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
          <FormInput label="Manzil (ixtiyoriy)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          <FormInput label="Izoh (ixtiyoriy)" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setIsDrawerOpen(false)}>Bekor qilish</button>
            <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Suppliers;
