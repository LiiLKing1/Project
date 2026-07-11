import React, { useState } from 'react';
import { useRoles, PERMISSION_LABELS, DEFAULT_ROLES } from '../../context/RolesContext';
import { Check, X, Save } from 'lucide-react';

const Roles = () => {
  const { roles, updateRoles, userProfile } = useRoles();
  const [localRoles, setLocalRoles] = useState(() => JSON.parse(JSON.stringify(roles)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const isAdmin = userProfile?.role === 'admin' && !userProfile?.storeOwnerId;

  const handleToggle = (roleKey, permKey) => {
    setLocalRoles(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        permissions: {
          ...prev[roleKey].permissions,
          [permKey]: !prev[roleKey].permissions[permKey]
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateRoles(localRoles);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const key = newRoleName.toLowerCase().replace(/\s+/g, '_');
    setLocalRoles(prev => ({
      ...prev,
      [key]: {
        name: newRoleName,
        permissions: Object.fromEntries(Object.keys(PERMISSION_LABELS).map(k => [k, false]))
      }
    }));
    setNewRoleName('');
    setShowAddRole(false);
  };

  const permKeys = Object.keys(PERMISSION_LABELS);
  const roleKeys = Object.keys(localRoles);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Rollar va Huquqlar</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAdmin && (
            <button onClick={() => setShowAddRole(true)} style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px solid var(--border-color)' }}>
              + Yangi rol
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', backgroundColor: saved ? 'var(--success)' : 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}
            >
              <Save size={16} />
              {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi!' : 'O\'zgarishlarni saqlash'}
            </button>
          )}
        </div>
      </div>

      {showAddRole && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            placeholder="Yangi rol nomi (masalan: Direktor)"
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
          />
          <button onClick={handleAddRole} style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500' }}>Qo'shish</button>
          <button onClick={() => setShowAddRole(false)} style={{ padding: '0.6rem', color: 'var(--danger)' }}><X size={18} /></button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
              <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem', width: '220px' }}>
                Bo'lim / Huquq
              </th>
              {roleKeys.map(rk => (
                <th key={rk} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: '700', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-main)' }}>{localRoles[rk].name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permKeys.map(permKey => (
              <tr key={permKey} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  {PERMISSION_LABELS[permKey]}
                </td>
                {roleKeys.map(rk => {
                  const hasIt = localRoles[rk].permissions[permKey];
                  const isAdminRole = rk === 'admin';
                  return (
                    <td key={rk} style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <button
                        onClick={() => isAdmin && !isAdminRole && handleToggle(rk, permKey)}
                        disabled={!isAdmin || isAdminRole}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          backgroundColor: hasIt ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: hasIt ? 'var(--success)' : 'var(--danger)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isAdmin && !isAdminRole ? 'pointer' : 'default',
                          opacity: isAdminRole ? 0.6 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        {hasIt ? <Check size={18} /> : <X size={18} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Roles;
