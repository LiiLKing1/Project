import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2 } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { db, firebaseConfig } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { saveDoc, editDoc, logAudit, generateDiff } from '../../utils/firebaseUtils';
import { useToast } from '../../context/ToastContext';
import { useRoles, DEFAULT_ROLES } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';

const Employees = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({ 
    fullName: '', phone: '', role: 'kassir', loginUsername: '', password: '', isActive: true, 
    permissions: DEFAULT_ROLES['kassir'].permissions,
    salaryType: 'fixed', fixedSalary: '', percentageRate: ''
  });

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/staff`), orderBy('createdAt', 'desc')), (snapshot) => {
      setStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      addToast(error.message, 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [addToast, storeId]);

  const generateUsername = (name) => {
    if (!name) return '';
    const clean = name.toLowerCase().replace(/[^a-z]/g, '');
    const rand = Math.floor(Math.random() * 900) + 100;
    return `${clean}${rand}`;
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    if (!editingId && !formData.loginUsername) {
      setFormData({ ...formData, fullName: newName, loginUsername: generateUsername(newName) });
    } else {
      setFormData({ ...formData, fullName: newName });
    }
  };

  const createEmployeeAuth = async (email, password) => {
    const secondaryAppName = 'SecondaryApp' + Date.now();
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await signOut(secondaryAuth);
      return userCredential.user.uid;
    } finally {
      // Secondary app shouldn't interfere with main auth since it's a separate instance
    }
  };

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.loginUsername.trim()) {
      addToast('Barcha majburiy maydonlarni to\'ldiring', 'error');
      return;
    }
    if (!editingId && formData.password.length < 6) {
      addToast('Parol kamida 6 ta belgidan iborat bo\'lishi kerak', 'error');
      return;
    }
    if (!storeId) return;

    const fullEmail = `${formData.loginUsername}@pos.com`;

    try {
      if (editingId) {
        const payload = {
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          loginEmail: fullEmail,
          isActive: formData.isActive,
          permissions: formData.permissions,
          salaryType: formData.salaryType,
          fixedSalary: Number(formData.fixedSalary || 0),
          percentageRate: Number(formData.percentageRate || 0)
        };
        const originalEmp = staff.find(s => s.id === editingId);
        const diffStr = generateDiff(originalEmp, payload);
        const auditDetails = diffStr ? `${formData.fullName} (O'zgarishlar: ${diffStr})` : formData.fullName;

        await editDoc(doc(db, `users/${storeId}/staff`, editingId), payload);
        
        // Agar xodim profili mavjud bo'lsa, uni ham yangilaymiz (custom permissions uchun)
        await setDoc(doc(db, `users/${editingId}/profile/info`), {
          name: formData.fullName,
          email: fullEmail,
          role: formData.role,
          permissions: formData.permissions
        }, { merge: true });

        await logAudit(storeId, userProfile, 'UPDATE', 'staff', auditDetails);
        addToast('Xodim yangilandi', 'success');
      } else {
        // Create auth user
        const newUid = await createEmployeeAuth(fullEmail, formData.password);
        
        // Save to store's staff
        const empData = {
          uid: newUid,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          loginEmail: fullEmail,
          isActive: formData.isActive,
          permissions: formData.permissions,
          salaryType: formData.salaryType,
          fixedSalary: Number(formData.fixedSalary || 0),
          percentageRate: Number(formData.percentageRate || 0)
        };
        await setDoc(doc(db, `users/${storeId}/staff`, newUid), { ...empData, createdAt: new Date().toISOString() });
        
        // Save employee profile for RolesContext
        await setDoc(doc(db, `users/${newUid}/profile/info`), {
          name: formData.fullName,
          email: fullEmail,
          role: formData.role,
          permissions: formData.permissions,
          storeOwnerId: storeId,
          createdAt: new Date().toISOString()
        });
        
        await logAudit(storeId, userProfile, 'CREATE', 'staff', formData.fullName);
        addToast('Xodim muvaffaqiyatli qo\'shildi va akkaunt yaratildi', 'success');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast('Xatolik: ' + error.message, 'error');
    }
  };

  const openModal = (emp = null) => {
    if (emp) {
      setEditingId(emp.id);
      const username = emp.loginEmail ? emp.loginEmail.split('@')[0] : '';
      setFormData({ 
        fullName: emp.fullName, phone: emp.phone, role: emp.role, loginUsername: username, 
        password: '', isActive: emp.isActive,
        permissions: emp.permissions || DEFAULT_ROLES[emp.role]?.permissions || {},
        salaryType: emp.salaryType || 'fixed',
        fixedSalary: emp.fixedSalary || '',
        percentageRate: emp.percentageRate || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        fullName: '', phone: '+998', role: 'kassir', loginUsername: '', password: '', isActive: true, 
        permissions: DEFAULT_ROLES['kassir'].permissions,
        salaryType: 'fixed', fixedSalary: '', percentageRate: ''
      });
    }
    setActiveTab('profile');
    setIsModalOpen(true);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setFormData({
      ...formData, 
      role: newRole,
      permissions: DEFAULT_ROLES[newRole]?.permissions || {}
    });
  };

  const togglePermission = (key) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  const toggleActive = async (emp) => {
    if (!storeId) return;
    try {
      await editDoc(doc(db, `users/${storeId}/staff`, emp.id), { isActive: !emp.isActive });
      await logAudit(storeId, userProfile, 'UPDATE', 'staff', `${emp.fullName} holati ${!emp.isActive ? 'Aktiv' : 'Nofaol'} qilindi`);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Xodimlar va Boshqaruv</h1>
        <button className="btn btn-primary" onClick={() => openModal()}><UserPlus size={18} /> Yangi xodim</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-responsive">
<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>F.I.O</th>
                <th style={{ padding: '1rem' }}>Telefon / Login</th>
                <th style={{ padding: '1rem' }}>Rol</th>
                <th style={{ padding: '1rem' }}>Holati</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>Xodimlar yo'q</td></tr> : null}
              {staff.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: s.isActive ? 1 : 0.6 }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{s.fullName}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-main)' }}>{s.phone}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.loginEmail || '-'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', backgroundColor: s.role === 'admin' ? 'var(--danger-light)' : 'var(--primary-light)', color: s.role === 'admin' ? 'var(--danger)' : 'var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {s.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={s.isActive} onChange={() => toggleActive(s)} />
                      <span style={{ fontSize: '0.875rem' }}>Aktiv</span>
                    </label>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => openModal(s)}><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Xodimni tahrirlash' : 'Yangi xodim'}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'profile' ? 600 : 400 }} onClick={() => setActiveTab('profile')}>Profil ma'lumotlari</button>
          <button style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'role' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'role' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'role' ? 600 : 400 }} onClick={() => setActiveTab('role')}>Rol va Ruxsatlar</button>
          <button style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'salary' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'salary' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'salary' ? 600 : 400 }} onClick={() => setActiveTab('salary')}>Qo'shimcha ma'lumotlar</button>
        </div>

        {activeTab === 'profile' && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <FormInput label="F.I.O" value={formData.fullName} onChange={handleNameChange} required />
            <FormInput label="Telefon raqami" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
            
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>Tizimga kirish ma'lumotlari</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Login (Username) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <input 
                    type="text" 
                    value={formData.loginUsername} 
                    onChange={e => setFormData({...formData, loginUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '')})} 
                    placeholder="masalan: said" 
                    required 
                    disabled={!!editingId} 
                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px 0 0 8px', border: '1px solid var(--border-color)', borderRight: 'none', backgroundColor: 'var(--bg-surface)', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '0 8px 8px 0', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    @pos.com
                  </div>
                </div>
              </div>
              {!editingId && (
                <FormInput 
                  label="Parol (Kamida 6 belgi)" 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder="••••••••" 
                  required 
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'role' && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Lavozimi (Roli) *</label>
              <CustomSelect 
                value={formData.role} 
                onChange={v => handleRoleChange({target: {value: v}})}
                options={[
                  {value: '', label: '-- Tanlang --'},
                  ...Object.keys(DEFAULT_ROLES).map(r => ({value: r, label: DEFAULT_ROLES[r].title}))
                ]}
              />
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Huquqlar (Ruxsatlar)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {Object.keys(DEFAULT_ROLES['admin'].permissions).map(key => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                      type="checkbox" 
                      checked={!!formData.permissions[key]} 
                      onChange={() => togglePermission(key)} 
                    />
                    <span style={{ textTransform: 'capitalize' }}>
                      {key === 'importExport' ? 'Yuklanishlar (Import/Eksport)' : key}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Ish haqi (KPI)</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ish haqi turi *</label>
                <CustomSelect 
                  value={formData.salaryType} 
                  onChange={v => setFormData({...formData, salaryType: v})}
                  options={[
                    {value: 'fixed', label: 'Qat\'iy maosh'},
                    {value: 'percentage', label: 'Savdodan foiz (%)'},
                    {value: 'mixed', label: 'Aralash (Belgilangan + Foiz)'}
                  ]}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {(formData.salaryType === 'fixed' || formData.salaryType === 'mixed') && (
                  <FormInput label="Belgilangan oylik summasi" type="number" value={formData.fixedSalary} onChange={e => setFormData({...formData, fixedSalary: e.target.value})} placeholder="Masalan: 3000000" />
                )}
                {(formData.salaryType === 'percentage' || formData.salaryType === 'mixed') && (
                  <FormInput label="Sotuvdan foiz (%)" type="number" value={formData.percentageRate} onChange={e => setFormData({...formData, percentageRate: e.target.value})} placeholder="Masalan: 3" />
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Bekor qilish</button>
          <button className="btn btn-primary" onClick={handleSave}>Saqlash</button>
        </div>
      </Modal>
    </div>
  );
};

export default Employees;
