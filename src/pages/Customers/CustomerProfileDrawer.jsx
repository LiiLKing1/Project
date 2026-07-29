import React, { useState, useEffect } from 'react';
import Drawer from '../../components/Drawer';
import { User, Phone, Calendar, CreditCard, ShoppingBag, Clock, FileText } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from '../../services/firebaseMock';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { useSettings } from '../../context/SettingsContext';
import { useRoles } from '../../context/RolesContext';

const CustomerProfileDrawer = ({ isOpen, onClose, customer }) => {
  const [activeTab, setActiveTab] = useState('umumiy');
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const { settings } = useSettings();
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';

  useEffect(() => {
    if (isOpen && customer && storeId && activeTab === 'tarix') {
      fetchSalesHistory();
    }
  }, [isOpen, customer, activeTab, storeId]);

  const fetchSalesHistory = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, `users/${storeId}/sales`), where('customerId', '==', customer.id), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSalesHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Mijoz Profili">
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          className={`btn ${activeTab === 'umumiy' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('umumiy')} 
          style={{ borderRadius: '8px 8px 0 0' }}
        >Umumiy</button>
        <button 
          className={`btn ${activeTab === 'tarix' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('tarix')} 
          style={{ borderRadius: '8px 8px 0 0' }}
        >Xarid tarixi</button>
      </div>

      {activeTab === 'umumiy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#D1E8F5', color: '#4A90E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1A2538' }}>{customer.fullName}</h3>
              <p style={{ margin: 0, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><Phone size={14}/> {customer.phone}</p>
            </div>
            {customer.isVip && <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>VIP Mijoz</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ color: '#64748B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}><ShoppingBag size={16} /> Jami xarid</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1A2538', marginTop: '0.5rem' }}><CurrencyDisplay amount={customer.totalPurchases} /></div>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ color: '#64748B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={16} /> Joriy Qarz</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: customer.currentDebt > 0 ? '#EF4B4B' : '#10B981', marginTop: '0.5rem' }}>
                <CurrencyDisplay amount={customer.currentDebt} />
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
             <div style={{ color: '#64748B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>Bonus balansi</div>
             <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4A90E2', marginTop: '0.5rem' }}><CurrencyDisplay amount={customer.bonusBalance} /></div>
             {customer.bonusPercent > 0 && <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Har bir xariddan {customer.bonusPercent}% bonus</div>}
          </div>

          {(customer.birthDate || customer.gender) && (
            <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {customer.birthDate && (
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> Tug'ilgan sana</div>
                  <div style={{ fontWeight: '500', color: '#1A2538', marginTop: '0.25rem' }}>{new Date(customer.birthDate).toLocaleDateString()}</div>
                </div>
              )}
              {customer.gender && (
                <div>
                  <div style={{ color: '#64748B', fontSize: '0.875rem' }}>Jinsi</div>
                  <div style={{ fontWeight: '500', color: '#1A2538', marginTop: '0.25rem', textTransform: 'capitalize' }}>{customer.gender}</div>
                </div>
              )}
            </div>
          )}

          {customer.note && (
            <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ color: '#64748B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={16} /> Izoh</div>
              <div style={{ color: '#1A2538', marginTop: '0.5rem' }}>{customer.note}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tarix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Yuklanmoqda...</div>
          ) : salesHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Xarid tarixi yo'q</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {salesHistory.map(sale => (
                <div key={sale.id} style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1A2538' }}>{sale.receiptNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Clock size={12} /> {new Date(sale.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#4A90E2' }}><CurrencyDisplay amount={sale.totalAfterDiscount} /></div>
                    <div style={{ fontSize: '0.75rem', color: sale.status === 'fully_returned' ? '#EF4B4B' : '#10B981', marginTop: '4px' }}>
                      {sale.status === 'fully_returned' ? 'Qaytarilgan' : 'Sotilgan'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default CustomerProfileDrawer;
