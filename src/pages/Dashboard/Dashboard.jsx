import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';

const Dashboard = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('day'); // day, week, month, year
  const [stats, setStats] = useState({ revenue: 0, profit: 0, customers: 0 });
  
  const { userProfile } = useRoles();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unsubSales = onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      setSales(docs);
      
      const todaySales = docs.filter(sale => new Date(sale.createdAt) >= today);
      
      const rev = todaySales.reduce((acc, sale) => acc + sale.total, 0);
      const prof = todaySales.reduce((acc, sale) => {
        const cost = sale.items.reduce((c, item) => c + (item.costPrice * item.qty), 0);
        return acc + (sale.total - cost);
      }, 0);
      
      setStats(prev => ({ ...prev, revenue: rev, profit: prof }));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, `users/${storeId}/customers`), (snapshot) => {
      setStats(prev => ({ ...prev, customers: snapshot.size }));
    });

    const unsubProducts = onSnapshot(collection(db, `users/${storeId}/products`), (snapshot) => {
      setProducts(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubSales();
      unsubCustomers();
      unsubProducts();
    };
  }, [storeId]);

  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  // Filter sales based on timeFilter
  const now = new Date();
  const filteredSales = sales.filter(s => {
    if (!s.createdAt) return false;
    const date = new Date(s.createdAt);
    if (timeFilter === 'day') return date.toDateString() === now.toDateString();
    if (timeFilter === 'week') return (now - date) / (1000 * 60 * 60 * 24) <= 7;
    if (timeFilter === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    if (timeFilter === 'year') return date.getFullYear() === now.getFullYear();
    return true;
  });

  const periodRevenue = filteredSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const periodSalesCount = filteredSales.length;
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5)).length;
  const activeCustomers = stats.customers;

  // Group data for chart
  const getChartData = () => {
    const dataMap = {};
    filteredSales.forEach(s => {
      const d = new Date(s.createdAt);
      let key = '';
      if (timeFilter === 'day') {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else if (timeFilter === 'week') {
        const days = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Shan'];
        key = days[d.getDay()];
      } else if (timeFilter === 'month') {
        key = d.getDate().toString();
      } else if (timeFilter === 'year') {
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        key = months[d.getMonth()];
      }
      dataMap[key] = (dataMap[key] || 0) + (s.total || 0);
    });

    return Object.keys(dataMap).sort((a, b) => {
      if (timeFilter === 'day') return parseInt(a) - parseInt(b);
      if (timeFilter === 'month') return parseInt(a) - parseInt(b);
      return 0; // for week/year keep relative or sorted if complex
    }).map(k => ({ name: k, jami: dataMap[k] }));
  };

  const chartData = getChartData();

  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%' }}>
      <div className="flex-between">
        <h1 className="h1">Bosh Sahifa</h1>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          {['day', 'week', 'month', 'year'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: timeFilter === filter ? 'var(--primary)' : 'transparent',
                color: timeFilter === filter ? '#fff' : 'var(--text-secondary)',
                fontWeight: timeFilter === filter ? 600 : 400,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {filter === 'day' ? 'Bugun' : filter === 'week' ? 'Hafta' : filter === 'month' ? 'Oy' : 'Yil'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-lg)' }}><DollarSign size={24} /></div>
          </div>
          <div className="subtitle">Tushum ({timeFilter === 'day' ? 'bugun' : timeFilter === 'week' ? 'hafta' : timeFilter === 'month' ? 'oy' : 'yil'})</div>
          <div className="h2" style={{ marginTop: '0.5rem' }}>{formatMoney(periodRevenue)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-lg)' }}><ShoppingCart size={24} /></div>
          </div>
          <div className="subtitle">Savdolar soni</div>
          <div className="h2" style={{ marginTop: '0.5rem' }}>{periodSalesCount} ta</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-lg)' }}><Package size={24} /></div>
          </div>
          <div className="subtitle">Kam qolgan tovarlar</div>
          <div className="h2" style={{ marginTop: '0.5rem', color: lowStockProducts > 0 ? 'var(--warning)' : 'inherit' }}>{lowStockProducts} ta</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-lg)' }}><Users size={24} /></div>
          </div>
          <div className="subtitle">Umumiy mijozlar</div>
          <div className="h2" style={{ marginTop: '0.5rem' }}>{activeCustomers} nafar</div>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ padding: '1.5rem', flex: 1, minHeight: '350px' }}>
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Savdo dinamikasi</h2>
        <div style={{ flex: 1, width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorJami" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} tickFormatter={v => (v > 0 ? (v/1000).toFixed(0)+'k' : '0')} />
                <Tooltip formatter={(v) => [formatMoney(v), "Savdo"]} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}} cursor={{stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '5 5'}} />
                <Area type="monotone" dataKey="jami" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorJami)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              Ushbu davr uchun savdo ma'lumotlari yo'q
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
