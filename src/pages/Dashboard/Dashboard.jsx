import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown, CreditCard, Banknote, Calendar, ChevronRight, PlusCircle, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import { formatCurrency, formatCompact } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';

const Dashboard = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [debts, setDebts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('day');
  
  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;
  const navigate = useNavigate();
  const curr = settings?.currency || 'UZS';

  useEffect(() => {
    if (!storeId) return;

    let unsubs = [];
    
    // Fetch Sales
    unsubs.push(onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc')), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    // Fetch Customers
    unsubs.push(onSnapshot(collection(db, `users/${storeId}/customers`), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    // Fetch Products
    unsubs.push(onSnapshot(collection(db, `users/${storeId}/products`), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    // Fetch Debts
    unsubs.push(onSnapshot(collection(db, `users/${storeId}/customerDebts`), (snapshot) => {
      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    // Fetch Orders (Purchase Orders)
    unsubs.push(onSnapshot(query(collection(db, `users/${storeId}/purchaseOrders`), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }));

    // Fetch Suppliers
    unsubs.push(onSnapshot(collection(db, `users/${storeId}/suppliers`), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [storeId]);

  const now = new Date();
  
  const filterByDate = (items, filter) => {
    return items.filter(s => {
      if (!s.createdAt) return false;
      const date = new Date(s.createdAt);
      if (filter === 'day') return date.toDateString() === now.toDateString();
      if (filter === 'week') {
        const diff = (now - date) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }
      if (filter === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (filter === 'year') return date.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filteredSales = filterByDate(sales, timeFilter);
  
  // Calculate KPIs
  const periodRevenue = filteredSales.reduce((acc, curr) => acc + Number(curr.finalTotal || 0), 0);
  const periodSalesCount = filteredSales.length;
  const averageCheck = periodSalesCount > 0 ? periodRevenue / periodSalesCount : 0;
  
  const lowStockProducts = products.filter(p => Number(p.stockByWarehouse?.[selectedWarehouseId] || 0) <= Number(p.minStock || 5)).length;
  const activeCustomers = customers.length;
  
  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'partial');
  const totalDebt = activeDebts.reduce((acc, curr) => acc + Number(curr.remainingAmount || 0), 0);
  const overdueDebts = activeDebts.filter(d => new Date(d.dueDate) < now);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const pendingOrdersTotal = pendingOrders.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);

  // Chart Data Pre-fill
  const getChartData = () => {
    const dataMap = {};
    
    if (timeFilter === 'day') {
      for (let i = 8; i <= 23; i++) dataMap[`${i.toString().padStart(2, '0')}:00`] = 0;
    } else if (timeFilter === 'week') {
      const days = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Shan'];
      days.forEach(d => dataMap[d] = 0);
    } else if (timeFilter === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) dataMap[i.toString()] = 0;
    } else if (timeFilter === 'year') {
      const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
      months.forEach(m => dataMap[m] = 0);
    }

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
      if (dataMap[key] !== undefined) {
        dataMap[key] += Number(s.finalTotal || 0);
      }
    });

    if (timeFilter === 'week' || timeFilter === 'year') {
      return Object.keys(dataMap).map(k => ({ name: k, jami: dataMap[k] }));
    }
    
    return Object.keys(dataMap).sort((a, b) => parseInt(a) - parseInt(b)).map(k => ({ name: k, jami: dataMap[k] }));
  };

  const getTopProducts = () => {
    const productCounts = {};
    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        productCounts[item.productId].qty += Number(item.qty || 0);
        productCounts[item.productId].revenue += Number(item.qty || 0) * Number(item.price || 0);
      });
    });
    
    return Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  };

  const getPaymentDistribution = () => {
    const dist = { cash: 0, card: 0, debt: 0 };
    filteredSales.forEach(s => {
      if (s.paymentBreakdown && s.paymentBreakdown.length > 0) {
        s.paymentBreakdown.forEach(({ method, amount }) => {
          if (dist[method] !== undefined) {
            dist[method] += Number(amount || 0);
          }
        });
      } else {
        // Fallback for older data
        let pType = s.paymentType;
        if (pType === 'mixed' || !pType) pType = 'cash'; // Default mixed/unknown to cash if no breakdown
        if (dist[pType] !== undefined) {
          dist[pType] += Number(s.finalTotal || 0);
        }
      }
    });
    return dist;
  };

  const chartData = getChartData();
  const topProducts = getTopProducts();
  const paymentData = getPaymentDistribution();
  
  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner"></div>
        <div style={{ color: 'var(--text-secondary)' }}>Dashboard ma'lumotlari yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: '2rem', height: '100%', overflowY: 'auto', paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="flex-between">
        <h1 className="h1">Bosh Sahifa</h1>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/sales')} style={{ flex: 1, minWidth: '150px' }}><ShoppingCart size={18}/> Yangi Sotuv</button>
        <button className="btn btn-outline" onClick={() => navigate('/products')} style={{ flex: 1, minWidth: '150px', backgroundColor: 'var(--bg-surface)' }}><Package size={18}/> Mahsulot qo'shish</button>
        <button className="btn btn-outline" onClick={() => navigate('/customers')} style={{ flex: 1, minWidth: '150px', backgroundColor: 'var(--bg-surface)' }}><Users size={18}/> Mijoz qo'shish</button>
        <button className="btn btn-outline" onClick={() => navigate('/orders')} style={{ flex: 1, minWidth: '150px', backgroundColor: 'var(--bg-surface)' }}><Calendar size={18}/> Buyurtma berish</button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <KpiCard title="Tushum" value={formatCurrency(periodRevenue, curr)} icon={<DollarSign size={22}/>} color="var(--primary)" trend={"+12%"}/>
        <KpiCard title="Savdolar soni" value={`${periodSalesCount} ta`} icon={<ShoppingCart size={22}/>} color="var(--success)" trend={"+5%"}/>
        <KpiCard title="O'rtacha chek" value={formatCurrency(averageCheck, curr)} icon={<Activity size={22}/>} color="#8B5CF6" trend={"+8%"}/>
        <KpiCard title="Kam qolgan tovarlar" value={`${lowStockProducts} ta`} icon={<Package size={22}/>} color="var(--warning)" onClick={() => navigate('/products')}/>
        <KpiCard title="Jami qarzdorlik" value={formatCurrency(totalDebt, curr)} icon={<CreditCard size={22}/>} color="var(--danger)" subtext={overdueDebts.length > 0 ? `${overdueDebts.length} ta muddati o'tgan` : ''} subtextColor="var(--danger)" onClick={() => navigate('/customers/debts')}/>
        <KpiCard title="Mijozlar bazasi" value={`${activeCustomers} nafar`} icon={<Users size={22}/>} color="#06B6D4" trend={"+2%"}/>
      </div>

      {/* Main Charts & Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Area Chart */}
        <div className="glass-panel flex-col" style={{ padding: '1.5rem', minHeight: '380px', gridColumn: 'span 2' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 className="h2" style={{ fontSize: '1.25rem' }}>Savdo dinamikasi</h2>
            <div className="glass-panel" style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem' }}>
              {['day', 'week', 'month', 'year'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: timeFilter === filter ? 'var(--primary)' : 'transparent',
                    color: timeFilter === filter ? '#fff' : 'var(--text-secondary)',
                    fontWeight: timeFilter === filter ? 600 : 500,
                    transition: 'all 0.2s ease',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {filter === 'day' ? 'Bugun' : filter === 'week' ? 'Hafta' : filter === 'month' ? 'Oy' : 'Yil'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorJami" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dy={10} style={{ fontFamily: 'monospace' }}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} tickFormatter={v => formatCompact(v)} style={{ fontFamily: 'monospace' }}/>
                <Tooltip 
                  formatter={(v) => [formatCurrency(v, curr), "Savdo"]} 
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-glass)', background: 'var(--bg-surface-glass)', backdropFilter: 'blur(8px)' }} 
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '5 5' }} 
                />
                <Area type="monotone" dataKey="jami" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorJami)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Types Widget */}
        <div className="glass-panel flex-col" style={{ padding: '1.5rem', minHeight: '380px' }}>
          <h2 className="h2" style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{timeFilter === 'day' ? 'Bugungi' : timeFilter === 'week' ? 'Shu haftadagi' : timeFilter === 'month' ? 'Shu oydagi' : 'Shu yildagi'} to'lovlar</h2>
          
          {periodRevenue > 0 ? (
            <div className="flex-col" style={{ gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
              
              {/* Naqd */}
              <div className="flex-col" style={{ gap: '0.5rem' }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💵</div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Naqd</span>
                  </div>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentData.cash, curr)}
                  </span>
                </div>
                <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(paymentData.cash / periodRevenue) * 100}%`, backgroundColor: '#10B981' }}></div>
                </div>
              </div>

              {/* Karta */}
              <div className="flex-col" style={{ gap: '0.5rem' }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3B82F620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💳</div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Karta</span>
                  </div>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentData.card, curr)}
                  </span>
                </div>
                <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(paymentData.card / periodRevenue) * 100}%`, backgroundColor: '#3B82F6' }}></div>
                </div>
              </div>

              {/* Nasiya */}
              <div className="flex-col" style={{ gap: '0.5rem' }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EF444420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📅</div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Nasiya</span>
                  </div>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {formatCurrency(paymentData.debt, curr)}
                  </span>
                </div>
                <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-main)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(paymentData.debt / periodRevenue) * 100}%`, backgroundColor: '#EF4444' }}></div>
                </div>
              </div>

              {/* Jami */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Jami tushum:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.25rem', fontFamily: 'monospace' }}>
                  {formatCurrency(paymentData.cash + paymentData.card + paymentData.debt, curr)}
                </span>
              </div>

            </div>
          ) : (
             <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Hozircha to'lovlar mavjud emas</div>
          )}
        </div>

      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Top 5 Products */}
        <div className="glass-panel flex-col" style={{ padding: '1.5rem' }}>
          <h2 className="h2" style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Eng ko'p sotilgan tovarlar (Top-5)</h2>
          {topProducts.length > 0 ? (
            <div className="flex-col" style={{ gap: '1rem' }}>
              {topProducts.map((p, i) => (
                <div key={i} className="flex-between" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.qty} dona</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>
                    {formatCurrency(p.revenue, curr)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Ma'lumot yo'q</div>
          )}
        </div>

        {/* Recent Transactions Feed */}
        <div className="glass-panel flex-col" style={{ padding: '1.5rem' }}>
          <h2 className="h2" style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>So'nggi tranzaksiyalar</h2>
          {sales.length > 0 ? (
            <div className="flex-col" style={{ gap: '1rem' }}>
              {sales.slice(0, 5).map((sale, i) => (
                <div key={sale.id} className="flex-between" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                      {sale.paymentType === 'cash' ? <Banknote size={16} color="#10B981"/> : sale.paymentType === 'card' ? <CreditCard size={16} color="#3B82F6"/> : <Activity size={16} color="#F59E0B"/>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sale.customerName || 'Xaridor'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(sale.createdAt).toLocaleTimeString()} • {sale.cashierId}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {formatCurrency(sale.finalTotal, curr)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Tranzaksiyalar yo'q</div>
          )}
        </div>
        
        {/* Pending Orders Widget */}
        <div className="glass-panel flex-col" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 className="h2" style={{ fontSize: '1.25rem' }}>Kutilayotgan buyurtmalar</h2>
            <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600 }}>{pendingOrders.length} ta</span>
          </div>
          {pendingOrders.length > 0 ? (
            <div className="flex-col" style={{ gap: '1rem', flex: 1 }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Umumiy summa</div>
                <div className="h2" style={{ color: 'var(--primary)' }}>{formatCurrency(pendingOrdersTotal, curr)}</div>
              </div>
              {pendingOrders.slice(0, 3).map(o => {
                const supplier = suppliers.find(s => s.id === o.supplierId);
                return (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{supplier?.fullName || 'Noma\'lum ta\'minotchi'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(o.totalAmount, curr)}</div>
                  </div>
                );
              })}
              <button className="btn btn-ghost" style={{ marginTop: 'auto', width: '100%' }} onClick={() => navigate('/orders')}>Barchasini ko'rish <ChevronRight size={16}/></button>
            </div>
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Kutilayotgan buyurtmalar yo'q</div>
          )}
        </div>

      </div>
    </div>
  );
};

// Internal KPI Card Component
const KpiCard = ({ title, value, icon, color, trend, subtext, subtextColor, onClick }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => {if(onClick) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}} onMouseLeave={e => {if(onClick) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-glass)'; }}} onClick={onClick}>
    <div className="flex-between" style={{ marginBottom: '1rem' }}>
      <div style={{ padding: '0.75rem', backgroundColor: `${color}20`, color: color, borderRadius: 'var(--radius-lg)' }}>
        {icon}
      </div>
      {trend && (
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: trend.startsWith('+') ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {trend.startsWith('+') ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
          {trend}
        </div>
      )}
    </div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{title}</div>
    <div className="h2" style={{ fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{value}</div>
    {subtext && (
      <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: subtextColor || 'var(--text-secondary)', fontWeight: 500 }}>
        {subtext}
      </div>
    )}
  </div>
);

export default Dashboard;
