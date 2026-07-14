import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, DollarSign, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import Modal from '../../components/Modal';
import Receipt from '../../components/Receipt';
import { Eye } from 'lucide-react';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc')), (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalesData(sales);
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, `users/${storeId}/customers`), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubCustomers(); };
  }, [storeId]);

  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  const getChartData = () => {
    const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
    const result = [];
    
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        name: days[d.getDay()],
        dateStr: d.toDateString(),
        savdo: 0
      });
    }

    salesData.forEach(sale => {
      if(!sale.createdAt) return;
      const saleDate = new Date(sale.createdAt).toDateString();
      const dayData = result.find(r => r.dateStr === saleDate);
      if (dayData) {
        dayData.savdo += sale.total || 0;
      }
    });

    return result;
  };

  const chartData = getChartData();

  const totalRevenue = salesData.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = salesData.reduce((acc, curr) => {
    const cost = curr.items.reduce((c, item) => c + (item.costPrice * item.qty), 0);
    return acc + (curr.total - cost);
  }, 0);

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <div>
          <h1 className="h1">Hisobotlar</h1>
          <p className="subtitle">Sotuvlar va foyda tahlili</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline"><Calendar size={18} /> Oxirgi 7 kun</button>
          <button className="btn btn-primary"><Download size={18} /> Excel ga yuklash</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}><DollarSign size={24} /></div>
          <div>
            <div className="subtitle">Jami tushum</div>
            <div className="h2" style={{ marginTop: '0.25rem' }}>{formatMoney(totalRevenue)}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}><BarChart3 size={24} /></div>
          <div>
            <div className="subtitle">Sof foyda</div>
            <div className="h2" style={{ marginTop: '0.25rem' }}>{formatMoney(totalProfit)}</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}><ShoppingBag size={24} /></div>
          <div>
            <div className="subtitle">Sotilgan cheklar soni</div>
            <div className="h2" style={{ marginTop: '0.25rem' }}>{salesData.length} ta</div>
          </div>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: '1.5rem', minHeight: '350px' }}>
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Haftalik sotuvlar grafigi</h2>
        <div style={{ flex: 1, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} tickFormatter={v => (v/1000000).toFixed(1)+'M'} />
              <Tooltip formatter={(v) => [formatMoney(v), "Sotuv"]} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}} cursor={{fill: 'var(--bg-main)'}} />
              <Bar dataKey="savdo" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: '1.5rem' }}>
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Sotuvlar tarixi</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Sana</th>
                <th style={{ padding: '1rem' }}>Chek raqami</th>
                <th style={{ padding: '1rem' }}>Mijoz</th>
                <th style={{ padding: '1rem' }}>Mahsulotlar</th>
                <th style={{ padding: '1rem' }}>To'lov turi</th>
                <th style={{ padding: '1rem' }}>Summa</th>
                <th style={{ padding: '1rem' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {salesData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Ma'lumot topilmadi</td></tr>
              ) : salesData.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{new Date(sale.createdAt).toLocaleString('uz-UZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{sale.saleNumber}</td>
                  <td style={{ padding: '1rem' }}>
                    {sale.customerId 
                      ? (customers.find(c => c.id === sale.customerId)?.fullName || 'Noma\'lum mijoz') 
                      : 'Umumiy mijoz'
                    }
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {sale.items?.map((item, idx) => (
                        <span key={idx} style={{ fontSize: '0.875rem' }}>{item.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>x{item.qty}</span></span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--bg-main)', fontWeight: 600 }}>
                      {sale.paymentType === 'cash' ? 'Naqd' : sale.paymentType === 'card' ? 'Karta' : sale.paymentType === 'debt' ? 'Nasiya' : 'Aralash'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(sale.total)}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => {
                        const custName = sale.customerId ? (customers.find(c => c.id === sale.customerId)?.fullName) : 'Umumiy mijoz';
                        setSelectedSale({ ...sale, customerName: custName });
                        setIsReceiptModalOpen(true);
                      }}
                    >
                      <Eye size={14} /> Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {selectedSale && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={selectedSale} storeId={storeId} />
            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;
