import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import {
  ShoppingCart, Users, Package, TrendingUp,
  CreditCard, Banknote, Wallet, ChevronRight, BarChart2,
  AlertCircle, ArrowUpRight, Download, Calendar,
  DollarSign, Activity, Percent, Star
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { formatCurrency, formatCompact } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';


/* ─── helpers ─────────────────────────────────────────── */
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const trendStr = (now, prev) => {
  if (prev === 0) return now > 0 ? '+100' : '0';
  const v = ((now - prev) / prev * 100).toFixed(1);
  return v > 0 ? `+${v}` : `${v}`;
};

/* ─── Custom Tooltip ──────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, curr }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{label}</div>
      <div className="db-tooltip-val">{formatCurrency(payload[0].value, curr)}</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════ */
const Dashboard = () => {
  const [sales, setSales]         = useState([]);
  const [products, setProducts]   = useState([]);
  const [customers, setCustomers] = useState([]);
  const [debts, setDebts]         = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [timeFilter, setTimeFilter] = useState('bugun');
  

  const { userProfile }         = useRoles();
  const { settings }            = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId  = userProfile?.storeOwnerId;
  const navigate = useNavigate();
  const curr     = settings?.currency || 'UZS';
  const now      = new Date();

  useEffect(() => {
    if (!storeId) return;
    const U = [];
    U.push(onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt','desc')), s => {
      setSales(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }));
    U.push(onSnapshot(collection(db, `users/${storeId}/customers`), s =>
      setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() })))))
    U.push(onSnapshot(collection(db, `users/${storeId}/products`), s =>
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })))))
    U.push(onSnapshot(collection(db, `users/${storeId}/customerDebts`), s =>
      setDebts(s.docs.map(d => ({ id: d.id, ...d.data() })))))
    U.push(onSnapshot(query(collection(db, `users/${storeId}/purchaseOrders`), orderBy('createdAt','desc')), s =>
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })))))
    return () => U.forEach(u => u());
  }, [storeId]);

  /* filter */
  const filterByDate = items => items.filter(s => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    if (timeFilter === 'kecha') { const y = new Date(now); y.setDate(y.getDate()-1); return d.toDateString()===y.toDateString(); }
    if (timeFilter === 'bugun') return d.toDateString() === now.toDateString();
    if (timeFilter === 'hafta') {
      const curr = new Date();
      const day = curr.getDay();
      const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(curr.setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      return d >= startOfWeek;
    }
    if (timeFilter === 'oy')   return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    if (timeFilter === 'yil')  return d.getFullYear()===now.getFullYear();
    return true;
  });

  const filteredSales = filterByDate(sales);
  const revenue       = filteredSales.reduce((a,s) => a + Number(s.finalTotal||0), 0);
  const salesCount    = filteredSales.length;

  const productsMap = useMemo(() => {
    const map = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  const { totalCost, grossProfit } = useMemo(() => {
    let costAcc = 0, profitAcc = 0;
    filteredSales.forEach(sale => {
      if (sale.items?.length > 0) {
        sale.items.forEach(item => {
          const qty   = Number(item.qty || 0);
          const sellP = Number(item.price || item.sellPrice || 0);
          const prod  = productsMap[item.productId];
          const costP = Number(item.costPrice !== undefined && item.costPrice !== '' ? item.costPrice : (prod?.costPrice || 0));
          costAcc   += costP * qty;
          profitAcc += (sellP - costP) * qty;
        });
      }
    });
    return { totalCost: costAcc, grossProfit: profitAcc };
  }, [filteredSales, productsMap]);

  const totalInventoryCost = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.status === 'archived') return acc;
      const stock = Number(p.stockByWarehouse?.[selectedWarehouseId] || 0);
      return acc + (Math.max(0, stock) * Number(p.costPrice || 0));
    }, 0);
  }, [products, selectedWarehouseId]);

  const profitMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  const yest = new Date(now); yest.setDate(yest.getDate()-1);
  const yesterdayRev = sales.filter(s => s.createdAt && new Date(s.createdAt).toDateString()===yest.toDateString()).reduce((a,s)=>a+Number(s.finalTotal||0),0);

  const payDist = { cash:0, card:0, debt:0 };
  filteredSales.forEach(s => {
    if (s.paymentBreakdown?.length>0) s.paymentBreakdown.forEach(({method,amount})=>{ if(payDist[method]!==undefined) payDist[method]+=Number(amount||0); });
    else { const t=s.paymentType||'cash'; if(payDist[t]!==undefined) payDist[t]+=Number(s.finalTotal||0); }
  });

  const lowStock     = products.filter(p => Number(p.stockByWarehouse?.[selectedWarehouseId]||0) <= Number(p.minStock||5));
  const activeDebts  = debts.filter(d => ['active','partial','partially_paid'].includes(d.status));
  const totalDebt    = activeDebts.reduce((a,d)=>a+Number(d.remainingAmount||0),0);
  const overdueDebts = activeDebts.filter(d=>new Date(d.dueDate)<now).length;
  const pendingOrders = orders.filter(o=>o.status==='pending');

  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        const key = item.productId || item.name || 'Noma\'lum';
        if (!map[key]) map[key] = { name: item.name || 'Noma\'lum', qty: 0, revenue: 0 };
        map[key].qty     += Number(item.qty||0);
        map[key].revenue += Number(item.qty||0)*Number(item.price||0);
      });
    });
    return Object.values(map).sort((a,b)=>b.qty-a.qty);
  }, [filteredSales]);

  const maxTopRev = Math.max(...topProducts.map(p=>p.revenue), 1);

  /* chart data */
  const chartBars = useMemo(() => {
    if (timeFilter==='hafta') {
      const DAYS = ['Du','Se','Chor','Pay','Ju','Shan','Yak'];
      const jsDays = [1, 2, 3, 4, 5, 6, 0];
      const map = {}; DAYS.forEach(d=>map[d]=0);
      
      filteredSales.forEach(s => { 
        const dayIdx = new Date(s.createdAt).getDay();
        const k = DAYS[jsDays.indexOf(dayIdx)]; 
        if(map[k]!==undefined) map[k]+=Number(s.finalTotal||0); 
      });
      
      const todayName = DAYS[jsDays.indexOf(new Date().getDay())];
      return DAYS.map(name => ({ name, jami: map[name], active: name === todayName }));
    }
    if (timeFilter==='oy') {
      const dim = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      const map = {}; for(let i=1;i<=dim;i++) map[`${i}`]=0;
      filteredSales.forEach(s=>{ const k=`${new Date(s.createdAt).getDate()}`; if(map[k]!==undefined) map[k]+=Number(s.finalTotal||0); });
      const today = `${now.getDate()}`;
      return Object.entries(map).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([name,jami])=>({ name, jami, active: name===today }));
    }
    if (timeFilter==='yil') {
      const M = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
      const map = {}; M.forEach(m=>map[m]=0);
      filteredSales.forEach(s=>{ const k=M[new Date(s.createdAt).getMonth()]; if(map[k]!==undefined) map[k]+=Number(s.finalTotal||0); });
      const cur = M[now.getMonth()];
      return M.map(name=>({ name, jami:map[name], active: name===cur }));
    }
    const map = {}; for(let i=0;i<=23;i++) map[`${String(i).padStart(2,'0')}`]=0;
    filteredSales.forEach(s=>{ const h=String(new Date(s.createdAt).getHours()).padStart(2,'0'); if(map[h]!==undefined) map[h]+=Number(s.finalTotal||0); });
    const nowH = timeFilter==='bugun' ? String(now.getHours()).padStart(2,'0') : '23';
    const result = [];
    for(let i=0; i<=23; i++) {
      const k = String(i).padStart(2,'0');
      if (parseInt(k) <= parseInt(nowH)) result.push({ name: `${k}:00`, jami: map[k], active: k === nowH });
    }
    return result;
  }, [filteredSales, timeFilter]);

  const filterLabels = { kecha:'Kecha', bugun:'Bugun', hafta:'Hafta', oy:'Oy', yil:'Yil' };

  if (loading) return (
    <div className="flex-center" style={{ height:'100%', flexDirection:'column', gap:'1rem' }}>
      <div className="spinner"/>
    </div>
  );

  const totalRevTrend = trendStr(revenue, yesterdayRev);
  const trendPos      = parseFloat(totalRevTrend) >= 0;
  const activeCount   = customers.filter(c => c.status !== 'archived').length;

  /* Hero card configs */
  const heroCards = [
    {
      label: `${filterLabels[timeFilter]} Tushum`,
      value: <CurrencyDisplay amount={revenue} />,
      icon: '💰',
      iconBg: 'rgba(99,102,241,.35)',
      foot: `${totalRevTrend}% kecha nisbatan`,
      onClick: () => navigate('/reports'),
    },
    {
      label: 'Sof Foyda',
      value: <><span style={{fontSize:'15px',fontWeight:500,opacity:.7}}>+</span><CurrencyDisplay amount={grossProfit} /></>,
      icon: '📈',
      iconBg: 'rgba(16,185,129,.35)',
      foot: `Marja: ${profitMarginPct}%`,
    },
    {
      label: 'Sotuvlar',
      value: <>{salesCount}<span style={{fontSize:'13px',fontWeight:500,opacity:.7}}> ta</span></>,
      icon: '🛒',
      iconBg: 'rgba(245,158,11,.35)',
      foot: `Mijozlar: ${activeCount}`,
      onClick: () => navigate('/sales'),
    },
    {
      label: 'Ombor Qoldig\'i (Tannarx)',
      value: <CurrencyDisplay amount={totalInventoryCost} />,
      icon: '📦',
      iconBg: 'rgba(239,68,68,.3)',
      foot: `${products.length} ta mahsulot`,
      onClick: () => navigate('/products'),
    },
  ];

  return (
    <div className="dashboard-wrapper">

      {/* ══ FILTER PILLS ══ */}
      <div className="dashboard-header-row">
        <div className="filter-pills-container">
          {Object.entries(filterLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={`filter-pill-btn ${timeFilter === key ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ ALERTS STRIP ══ */}
      {(lowStock.length > 0 || overdueDebts > 0 || pendingOrders.length > 0) && (
        <div className="alert-banner-strip">
          <div className="alert-strip-left">
            <AlertCircle size={15} color="#D97706" />
            <span>
              {lowStock.length > 0 && `${lowStock.length} ta tovar qoldig'i kam. `}
              {overdueDebts > 0 && `${overdueDebts} ta qarz muddati o'tgan. `}
              {pendingOrders.length > 0 && `${pendingOrders.length} ta buyurtma kutilmoqda.`}
            </span>
          </div>
          <button
            className="alert-strip-btn"
            onClick={() => navigate(lowStock.length > 0 ? '/products' : overdueDebts > 0 ? '/customers/debts' : '/orders')}
          >
            Ko'rish <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* ══ HERO VIOLET BANNER ══ */}
      <div className="db-hero-banner">
        <div className="db-hero-top">
          <div>
            <h2 className="db-hero-greeting">
              Assalomu alaykum, {userProfile?.displayName || userProfile?.name || 'Admin'} ✨
            </h2>
            <p className="db-hero-sub">
              Moliyaviy ko'rsatkichlar va tranzaksiyalar umumiy ko'rinishi
            </p>
          </div>
          <div className="db-hero-badge">
            <button className="db-hero-badge-btn">
              <Calendar size={13} /> {filterLabels[timeFilter]}
            </button>
            <button className="db-hero-badge-btn" onClick={() => navigate('/reports')}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* 4 stat cards in hero */}
        <div className="db-hero-cards">
          {heroCards.map((card, i) => (
            <div
              key={i}
              className="db-hero-card"
              onClick={card.onClick}
              style={{ cursor: card.onClick ? 'pointer' : 'default' }}
            >
              <div className="db-hero-card-top">
                <div className="db-hero-card-icon" style={{ background: card.iconBg }}>
                  {card.icon}
                </div>
                <div className="db-hero-card-label">{card.label}</div>
              </div>
              <div className="db-hero-card-val">{card.value}</div>
              <div className="db-hero-card-foot">
                <span className="db-hero-card-foot-label">{card.foot}</span>
                <div className="db-hero-card-foot-dots">···</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ MAIN 2-COL GRID ══ */}
      <div className="dashboard-main-grid">

        {/* LEFT */}
        <div className="dashboard-col">

          {/* Transaction Overview — Bar Chart */}
          <div className="db-panel">
            <div className="db-panel-header">
              <div className="db-panel-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: '#EEF2FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#4F46E5',
                }}>
                  <BarChart2 size={14} />
                </div>
                Savdo Grafigi
              </div>
              <span className="db-panel-badge">{filterLabels[timeFilter]}</span>
            </div>

            <div style={{ padding: '4px 18px 0', marginBottom: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>
                <CurrencyDisplay amount={revenue} />
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Jami tushum</div>
            </div>

            <div className="db-chart-area">
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartBars} margin={{ top: 8, right: 0, left: -20, bottom: 0 }} barSize={chartBars.length > 15 ? 4 : 10}>
                    <defs>
                      <linearGradient id="barActiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="#818CF8" />
                      </linearGradient>
                      <linearGradient id="barNormalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C7D2FE" />
                        <stop offset="100%" stopColor="#E0E7FF" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10.5, fontFamily: 'Inter' }}
                      dy={6}
                      minTickGap={chartBars.length > 15 ? 20 : 10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10.5, fontFamily: 'Inter' }}
                      tickFormatter={v => formatCompact(v)}
                    />
                    <Tooltip content={<CustomTooltip curr={curr} />} cursor={{ fill: 'rgba(99,102,241,.06)', radius: 6 }} />
                    <Bar dataKey="jami" radius={[5, 5, 0, 0]}>
                      {chartBars.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.active ? 'url(#barActiveGrad)' : 'url(#barNormalGrad)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="db-panel">
            <div className="db-panel-header">
              <div className="db-panel-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: '#F0FDF4', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#10B981',
                }}>
                  <CreditCard size={14} />
                </div>
                To'lov turlari
              </div>
              <span className="db-panel-badge">Breakdown</span>
            </div>
            <div className="pay-breakdown-grid">
              {[
                { label: "Naqd", amount: payDist.cash, icon: <Banknote size={14} />, color: '#10B981' },
                { label: "Karta", amount: payDist.card, icon: <CreditCard size={14} />, color: '#4F46E5' },
                { label: "Nasiya", amount: payDist.debt, icon: <Wallet size={14} />, color: '#F59E0B' },
              ].map((pay, i) => (
                <div key={i} className="pay-card">
                  <div className="pay-card-header">
                    <span className="pay-card-title">{pay.label}</span>
                    <span style={{ color: pay.color }}>{pay.icon}</span>
                  </div>
                  <div className="pay-card-val"><CurrencyDisplay amount={pay.amount} /></div>
                  <div className="pay-progress-bg">
                    <div
                      className="pay-progress-bar"
                      style={{
                        width: `${pct(pay.amount, revenue)}%`,
                        background: pay.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="dashboard-col">

          {/* Sales Overview — progress bars */}
          <div className="db-panel">
            <div className="db-panel-header">
              <div className="db-panel-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: '#EEF2FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#4F46E5',
                }}>
                  <Activity size={14} />
                </div>
                Top Mahsulotlar
              </div>
              <span className="db-panel-badge">{filterLabels[timeFilter]}</span>
            </div>

            <div className="db-sales-overview">
              {/* Total row */}
              <div className="db-sales-total-row">
                <span className="db-sales-total-num">{salesCount}</span>
                <span className={`db-sales-trend ${trendPos ? '' : 'down'}`}>
                  {trendPos ? '↑' : '↓'} {Math.abs(parseFloat(totalRevTrend))}%
                </span>
              </div>

              {/* Progress bars — top products */}
              <div className="db-progress-row hide-scrollbar" style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <div key={i} className="db-progress-item">
                    <div className="db-progress-top">
                      <span className="db-progress-label">{p.name}</span>
                      <span className="db-progress-pct">{pct(p.revenue, maxTopRev)}%</span>
                    </div>
                    <div className="db-progress-track">
                      <div
                        className="db-progress-fill"
                        style={{ width: `${pct(p.revenue, maxTopRev)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '20px 0' }}>
                    Ma'lumot yo'q
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="db-panel">
            <div className="db-panel-header">
              <div className="db-panel-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: '#FEF3C7', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#F59E0B',
                }}>
                  <ShoppingCart size={14} />
                </div>
                So'nggi Sotuvlar
              </div>
              <button className="db-panel-link" onClick={() => navigate('/reports')}>
                Barchasi <ChevronRight size={12} />
              </button>
            </div>

            <div>
              {sales.slice(0, 4).map((sale, i) => (
                <div key={sale.id} className="db-sale-row">
                  <div className="db-sale-icon" style={{
                    background: sale.paymentType === 'cash' ? '#D1FAE5'
                      : sale.paymentType === 'card' ? '#EEF2FF' : '#FEF3C7',
                    color: sale.paymentType === 'cash' ? '#10B981'
                      : sale.paymentType === 'card' ? '#4F46E5' : '#F59E0B',
                  }}>
                    {sale.paymentType === 'cash'
                      ? <Banknote size={15} />
                      : sale.paymentType === 'card'
                      ? <CreditCard size={15} />
                      : <Wallet size={15} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="db-sale-name">
                      {sale.customerName || 'Anonim xaridor'}
                    </div>
                    <div className="db-sale-meta">
                      {new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{sale.items?.length || 0} ta mahsulot
                    </div>
                  </div>
                  <div className="db-sale-amount">
                    <CurrencyDisplay amount={sale.finalTotal} />
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  Hozircha sotuvlar yo'q
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="db-panel">
            <div className="db-panel-header">
              <div className="db-panel-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: '#EEF2FF', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#4F46E5',
                }}>
                  <Star size={14} />
                </div>
                Tezkor Harakatlar
              </div>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => navigate('/sales')}>
                <div className="quick-action-icon"><ShoppingCart size={14} /></div>
                Yangi sotuv
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/products')}>
                <div className="quick-action-icon"><Package size={14} /></div>
                Mahsulotlar
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/customers')}>
                <div className="quick-action-icon"><Users size={14} /></div>
                Mijozlar
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/customers/debts')}>
                              <div className="quick-action-icon"><Wallet size={14} /></div>
                Qarzlar
                {overdueDebts > 0 && (
                  <span style={{
                    background: '#EF4444', color: '#fff',
                    fontSize: 9, padding: '1px 5px',
                    borderRadius: 999, marginLeft: 'auto'
                  }}>{overdueDebts}</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
