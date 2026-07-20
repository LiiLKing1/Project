import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, query, orderBy } from '../../services/firebaseMock';
import { saveDoc, editDoc, removeDoc } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useConfirm } from '../../context/ConfirmContext';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const { confirm } = useConfirm();
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
    if (await confirm({ message: 'Haqiqatan ham bu yetkazib beruvchini arxivlamoqchimisiz?', confirmStyle: 'danger' })) {
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
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yetkazib beruvchilar</h1>
          <p className="page-subtitle">{filteredSuppliers.length} ta yetkazib beruvchi ro'yxatda</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => openDrawer()}>
            <UserPlus size={18} /> Yangi qo'shish
          </button>
        </div>
      </div>

      <div className="page-card">
        <div className="page-card-header">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Ism, kompaniya yoki telefon..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="page-table">
            <thead>
              <tr>
                <th>Ism/Familiya</th>
                <th>Kompaniya</th>
                <th>Telefon</th>
                <th>Manzil</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Yetkazib beruvchilar topilmadi
                  </td>
                </tr>
              ) : filteredSuppliers.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A2538' }}>{s.fullName}</div>
                  </td>
                  <td>{s.companyName || <span style={{ color: '#8A9BB5' }}>-</span>}</td>
                  <td style={{ color: '#8A9BB5', fontFamily: 'monospace', fontSize: 13 }}>{s.phone}</td>
                  <td>{s.address || <span style={{ color: '#8A9BB5' }}>-</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="action-btn edit" onClick={() => openDrawer(s)} title="Tahrirlash"><Edit size={14} /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(s.id)} title="O'chirish"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
