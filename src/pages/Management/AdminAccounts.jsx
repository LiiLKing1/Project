import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Shield } from 'lucide-react';
import { db, firebaseConfig } from '../../firebase';
import { collection, onSnapshot, doc, setDoc } from '../../services/firebaseMock';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { editDoc, logAudit } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';

const AdminAccounts = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    fullName: '', loginUsername: '', password: '', isActive: true 
  });

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(collection(db, `users/${storeId}/admin_accounts`), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAdmins(docs);
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [addToast, storeId]);

  const createAdminAuth = async (email, password) => {
    const secondaryAppName = 'SecondaryAppAdmin' + Date.now();
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await signOut(secondaryAuth);
      return userCredential.user.uid;
    } finally {
      // Done
    }
  };

  const handleSave = async () => {
    if (!formData.loginUsername.trim()) {
      addToast('Login kiritish majburiy', 'error');
      return;
    }
    if (!editingId && (!formData.password || formData.password.length < 6)) {
      addToast('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'error');
      return;
    }
    if (!storeId) return;

    const fullEmail = `${formData.loginUsername}@admin.pos`;

    try {
      if (editingId) {
        const payload = {
          fullName: formData.fullName || formData.loginUsername,
          isActive: formData.isActive,
        };
        await editDoc(doc(db, `users/${storeId}/admin_accounts`, editingId), payload);
        
        await setDoc(doc(db, `users/${editingId}/profile/info`), {
          name: formData.fullName || formData.loginUsername,
          role: 'admin',
        }, { merge: true });

        await logAudit(storeId, userProfile, 'UPDATE', 'admin_accounts', formData.loginUsername);
        addToast('Admin akkaunt yangilandi', 'success');
      } else {
        const newUid = await createAdminAuth(fullEmail, formData.password);
        
        const adminData = {
          uid: newUid,
          fullName: formData.fullName || formData.loginUsername,
          loginEmail: fullEmail,
          loginUsername: formData.loginUsername,
          role: 'admin',
          isActive: formData.isActive,
        };
        
        await setDoc(doc(db, `users/${storeId}/admin_accounts`, newUid), { ...adminData, createdAt: new Date().toISOString() });
        
        // Setup permissions for full access
        const fullPermissions = {
          dashboard: true, products: true, sales: true, customers: true,
          marketing: true, reports: true, finance: true, management: true,
          settings: true, importExport: true
        };
        
        await setDoc(doc(db, `users/${newUid}/profile/info`), {
          name: adminData.fullName,
          email: fullEmail,
          role: 'admin',
          permissions: fullPermissions,
          storeOwnerId: storeId,
          createdAt: new Date().toISOString()
        });
        
        await logAudit(storeId, userProfile, 'CREATE', 'admin_accounts', formData.loginUsername);
        addToast('Admin akkaunt muvaffaqiyatli yaratildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast('Xatolik: ' + error.message, 'error');
    }
  };

  const openModal = (admin = null) => {
    if (admin) {
      setEditingId(admin.id);
      setFormData({ 
        fullName: admin.fullName || '', 
        loginUsername: admin.loginUsername || (admin.loginEmail ? admin.loginEmail.split('@')[0] : ''), 
        password: '', 
        isActive: admin.isActive 
      });
    } else {
      setEditingId(null);
      setFormData({ 
        fullName: '', loginUsername: '', password: '', isActive: true 
      });
    }
    setIsModalOpen(true);
  };

  const toggleActive = async (admin) => {
    if (!storeId) return;
    try {
      await editDoc(doc(db, `users/${storeId}/admin_accounts`, admin.id), { isActive: !admin.isActive });
      await logAudit(storeId, userProfile, 'UPDATE', 'admin_accounts', `${admin.loginUsername} holati ${!admin.isActive ? 'Aktiv' : 'Nofaol'} qilindi`);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Akkauntlar</h1>
          <p className="page-subtitle">Tizimga faqat login va parol orqali kiruvchi adminlar</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Shield size={18} /> Yangi Admin
        </button>
      </div>

      <div className="page-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="page-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Ism / Nomi</th>
                <th>Login</th>
                <th>Holati</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && !loading && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>
                    Admin akkauntlar topilmadi
                  </td>
                </tr>
              )}
              {admins.map(admin => (
                <tr key={admin.id} style={{ opacity: admin.isActive ? 1 : 0.6 }}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A2538' }}>{admin.fullName || admin.loginUsername}</div>
                  </td>
                  <td>
                    <div style={{ color: '#0284C7', fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{admin.loginUsername}</div>
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={admin.isActive} onChange={() => toggleActive(admin)} style={{ accentColor: '#4A90E2', width: 16, height: 16 }} />
                      <span style={{ fontSize: 14, color: admin.isActive ? '#10B981' : '#8A9BB5', fontWeight: 500 }}>{admin.isActive ? 'Aktiv' : 'Nofaol'}</span>
                    </label>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openModal(admin)}>
                      <Edit size={14} /> Tahrirlash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Akkauntni tahrirlash' : 'Yangi Admin Akkaunt'}>
        <div className="flex-col" style={{ gap: '1.25rem', padding: '0.5rem 0' }}>
          
          <FormInput 
            label="Ism yoki Nomi (Ixtiyoriy)" 
            value={formData.fullName} 
            onChange={e => setFormData({...formData, fullName: e.target.value})} 
            placeholder="Masalan: Asosiy Admin" 
          />

          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="var(--primary)" /> Tizimga kirish ma'lumotlari
            </h3>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Login <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="text" 
                value={formData.loginUsername} 
                onChange={e => setFormData({...formData, loginUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '')})} 
                placeholder="Faqat harf va raqamlar" 
                required 
                disabled={!!editingId} 
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: editingId ? 'var(--bg-main)' : 'var(--bg-surface)', outline: 'none', fontSize: '1rem', fontFamily: 'monospace' }}
              />
            </div>

            {!editingId && (
              <FormInput 
                label="Parol *" 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="Kamida 6 ta belgi" 
                required 
              />
            )}
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAccounts;
