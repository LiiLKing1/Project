import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, ListOrdered } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
};

const getTabRange = (tab) => {
  const now = new Date();
  let start, end;
  if (tab === 'Bugun') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (tab === 'Kecha') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (tab === 'Hafta') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (tab === 'Oy') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (tab === 'Yil') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear() + 1, 0, 1);
  }
  return { start, end };
};

const buildChartData = (sales, tab) => {
  const { start, end } = getTabRange(tab);
  const labels = [];
  const dataMap = {};

  if (tab === 'Bugun' || tab === 'Kecha') {
    for (let h = 8; h <= 22; h += 2) {
      const label = `${h}:00`;
      labels.push(label);
      dataMap[label] = 0;
    }
    sales.forEach(s => {
      if (!s.date) return;
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      if (d >= start && d < end) {
        const h = d.getHours();
        const label = `${h - (h % 2)}:00`;
        if (dataMap[label] !== undefined) dataMap[label] += s.totalSum;
      }
    });
  } else if (tab === 'Hafta') {
    const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = dayNames[d.getDay()];
      labels.push(label);
      dataMap[label] = (dataMap[label] || 0);
    }
    sales.forEach(s => {
      if (!s.date) return;
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      if (d >= start && d < end) {
        const label = dayNames[d.getDay()];
        if (dataMap[label] !== undefined) dataMap[label] += s.totalSum;
      }
    });
  } else if (tab === 'Oy') {
    for (let d = 1; d <= 31; d += 5) {
      const label = String(d);
      labels.push(label);
      dataMap[label] = 0;
    }
    sales.forEach(s => {
      if (!s.date) return;
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      if (d >= start && d < end) {
        const day = d.getDate();
        const label = String(day - (day % 5) || 1);
        if (dataMap[label] !== undefined) dataMap[label] += s.totalSum;
      }
    });
  } else if (tab === 'Yil') {
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    monthNames.forEach(m => { labels.push(m); dataMap[m] = 0; });
    sales.forEach(s => {
      if (!s.date) return;
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      if (d >= start && d < end) {
        const label = monthNames[d.getMonth()];
        if (dataMap[label] !== undefined) dataMap[label] += s.totalSum;
      }
    });
  }

  return labels.map(time => ({ time, value: dataMap[time] || 0 }));
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const [activeTab, setActiveTab] = useState('Bugun');
  const tabs = ['Kecha', 'Bugun', 'Hafta', 'Oy', 'Yil'];

  const [allSales, setAllSales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [totalSum, setTotalSum] = useState(0);
  const [payments, setPayments] = useState({ cash: 0, debt: 0, card: 0 });
  const [transactions, setTransactions] = useState({ total: 0, goods: 0, returns: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Barcha sotuvlarni bir marta yuklash
  useEffect(() => {
    if (!currentUser) return;
    const fetchAll = async () => {
      try {
        const salesQuery = query(collection(db, `users/${storeId}/sales`), orderBy('date', 'desc'), limit(500));
        const snap = await getDocs(salesQuery);
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setAllSales(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [currentUser]);

  // Tab o'zgarganda statistikani hisoblash
  useEffect(() => {
    if (allSales.length === 0 && !loading) {
      // Bo'sh holat
      setChartData(buildChartData([], activeTab));
      setTotalSum(0);
      setPayments({ cash: 0, debt: 0, card: 0 });
      setTransactions({ total: 0, goods: 0, returns: 0 });
      setTopProducts([]);
      return;
    }

    const { start, end } = getTabRange(activeTab);
    const filtered = allSales.filter(s => {
      if (!s.date) return false;
      const d = s.date.toDate ? s.date.toDate() : new Date(s.date);
      return d >= start && d < end;
    });

    const total = filtered.reduce((acc, s) => acc + (s.totalSum || 0), 0);
    setTotalSum(total);

    const cash = filtered.filter(s => s.paymentMethod === 'Naqd').reduce((acc, s) => acc + (s.totalSum || 0), 0);
    const debt = filtered.filter(s => s.paymentMethod === 'Qarz').reduce((acc, s) => acc + (s.totalSum || 0), 0);
    const card = filtered.filter(s => s.paymentMethod === 'Karta').reduce((acc, s) => acc + (s.totalSum || 0), 0);
    setPayments({ cash, debt, card });

    setTransactions({ total: filtered.length, goods: filtered.reduce((acc, s) => acc + (s.items?.length || 0), 0), returns: 0 });

    // Top mahsulotlar
    const prodMap = {};
    filtered.forEach(s => {
      s.items?.forEach(item => {
        if (!prodMap[item.name]) prodMap[item.name] = 0;
        prodMap[item.name] += item.price * item.qty;
      });
    });
    const topProds = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, income]) => ({ name, income }));
    setTopProducts(topProds);

    setChartData(buildChartData(filtered, activeTab));
  }, [activeTab, allSales, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '0.25rem', boxShadow: 'var(--shadow-sm)' }}>
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === tab ? 'var(--primary)' : 'transparent',
                fontWeight: activeTab === tab ? '600' : '500',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-lg)', fontWeight: '600' }}>
          <Calendar size={18} />
          <span>{new Date().toLocaleDateString('uz-UZ')}</span>
        </div>
      </div>

      {/* Main Chart + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sotuvlar - {activeTab}</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{transactions.total} ta tranzaksiya</span>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000)+'K' : v} />
                  <Tooltip formatter={(value) => [formatMoney(value), "Sotuv"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', flex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Umumiy tushum ({activeTab})</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatMoney(totalSum)}</div>
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {transactions.total} ta sotuv amalga oshirildi
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: '500' }}>To'lov usullari:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: '💵 Naqd', value: payments.cash, color: 'var(--success)' },
                { label: '💳 Karta', value: payments.card, color: 'var(--primary)' },
                { label: '📋 Nasiya', value: payments.debt, color: 'var(--warning)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: '600', color: item.color }}>{formatMoney(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Transactions */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Tranzaksiyalar</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.25rem' }}>{transactions.total} ta</div>
            </div>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}>
              <ListOrdered size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Tovarlar sotildi', count: transactions.goods },
              { label: 'Sotuvlar soni', count: transactions.total },
              { label: 'Qaytarishlar', count: transactions.returns },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: idx !== 2 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ fontWeight: '600' }}>{item.count} ta</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Top mahsulotlar</h3>
          {topProducts.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>
              {activeTab} da sotuvlar mavjud emas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topProducts.map((prod, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{prod.name}</span>
                  </div>
                  <div style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.875rem' }}>{formatMoney(prod.income)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
