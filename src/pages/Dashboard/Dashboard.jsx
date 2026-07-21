import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import {
  ShoppingCart, Users, Package, TrendingUp, TrendingDown,
  CreditCard, Banknote, Wallet, ChevronRight, BarChart2,
  AlertCircle, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { formatCurrency, formatCompact } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import CurrencyDisplay from '../../components/CurrencyDisplay';

/* ─────── Design tokens (from HTML reference) ─────── */
const GL     = '#4A90E2';   // blue-primary
const GM     = '#7BCEEB';   // blue-mid
const GD     = '#2C6FBF';   // blue-dark
const CARD_B = '#DCE8F5';   // card border
const TG     = '#8A9BB5';   // text-gray
const TD     = '#1A2538';   // text-dark
const RED    = '#EF4B4B';
const HERO_GRADIENT = 'linear-gradient(to bottom right, #4A90E2, #7BCEEB, #D1E8E2)';
const ACTIVE_TRACK  = '#D1E8F5';
const ACTIVE_BAR    = 'linear-gradient(180deg, #7BCEEB, #4A90E2)';

/* ─────── Helpers ─────── */
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const trendStr = (now, prev) => {
  if (prev === 0) return now > 0 ? '+100' : '0';
  const v = ((now - prev) / prev * 100).toFixed(1);
  return v > 0 ? `+${v}` : `${v}`;
};

const CustomTooltip = ({ active, payload, label, curr }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1A2538', border: `1px solid #4A90E244`, borderRadius: '10px', padding: '10px 16px', color: '#fff', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
      <div style={{ color: '#8A9BB5', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#4A90E2' }}>{formatCurrency(payload[0].value, curr)}</div>
    </div>
  );
};

/* ─────── SVG Ring (from HTML reference .ring) ─────── */
const MiniRing = ({ pct: p, color = GL, bad = false }) => {
  const R = 15, CIRC = 2 * Math.PI * R;
  const fill = (p / 100) * CIRC;
  const trackColor = bad ? '#FCE9E9' : ACTIVE_TRACK;
  return (
    <div style={{ position: 'relative', width: 36, height: 36 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={R} fill="none" stroke={trackColor} strokeWidth="4"/>
        <circle cx="18" cy="18" r={R} fill="none" stroke={bad ? RED : GL}
        strokeWidth="4" strokeDasharray={`${Math.min(fill, CIRC)} ${CIRC}`} strokeLinecap="round"/>
    </svg>
    <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color: bad ? RED : GD }}>
        {p}%
      </span>
    </div>
  );
};

/* ─────── Macro card (from .macro-card) ─────── */
const MacroCard = ({ label, value, maxValue, unit, trend, isAlert }) => {
  const p = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const pos = parseFloat(trend) >= 0;
  return (
    <div style={{
      flex: 1,
      border: `1px solid ${CARD_B}`,
      borderRadius: '16px',
      padding: '16px 12px',
      boxShadow: '0 8px 20px -16px rgba(0,0,0,0.3)',
      background: '#fff',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: isAlert ? '#FCE9E9' : ACTIVE_TRACK,
          color: isAlert ? RED : GD,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {isAlert
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>}
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#fff',
          padding: '4px 8px', borderRadius: '8px',
          background: isAlert ? RED : '#1C1E1B'
        }}>{trend}</span>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: TD, marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: TG, fontWeight: 600 }}>
          {formatCompact(value)} / {unit}
        </span>
        <MiniRing pct={Math.min(p, 110)} bad={isAlert}/>
      </div>
    </div>
  );
};

/* ─────── List row (from .list-row) ─────── */
const ListRow = ({ icon, label, right, onClick, isToggle, toggled }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px',
      borderBottom: `1px solid ${CARD_B}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background .15s',
    }}
    onMouseEnter={e => { if(onClick) e.currentTarget.style.background = '#F7FAFD'; }}
    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
  >
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACTIVE_TRACK, color: GD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <span style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: TD }}>{label}</span>
    {isToggle ? (
      <div style={{ width: 36, height: 20, borderRadius: '12px', background: toggled ? GL : '#DDD', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, [toggled?'right':'left']: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'all .2s' }}/>
      </div>
    ) : right || (
      <svg style={{ color: '#C7CCC3' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6"/></svg>
    )}
  </div>
);



/* ══════════════════════════════════════════════════════════════ */
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
    if (timeFilter === 'hafta') return (now-d)/864e5 <= 7;
    if (timeFilter === 'oy') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    if (timeFilter === 'yil') return d.getFullYear()===now.getFullYear();
    return true;
  });

  const filteredSales = filterByDate(sales);
  const revenue       = filteredSales.reduce((a,s) => a + Number(s.finalTotal||0), 0);
  const salesCount    = filteredSales.length;

  // Products map for cost lookup
  const productsMap = useMemo(() => {
    const map = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  // Profit calculation (sellPrice - costPrice) * qty
  const { totalCost, grossProfit } = useMemo(() => {
    let costAcc = 0;
    let profitAcc = 0;
    filteredSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const qty = Number(item.qty || 0);
          const sellP = Number(item.price || item.sellPrice || 0);
          const prod = productsMap[item.productId];
          const costP = Number(item.costPrice !== undefined && item.costPrice !== '' ? item.costPrice : (prod?.costPrice || 0));
          
          const itemCost = costP * qty;
          const itemRevenue = sellP * qty;
          const itemProfit = itemRevenue - itemCost;

          costAcc += itemCost;
          profitAcc += itemProfit;
        });
      }
    });
    return { totalCost: costAcc, grossProfit: profitAcc };
  }, [filteredSales, productsMap]);

  const profitMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  // yesterday trend
  const yest = new Date(now); yest.setDate(yest.getDate()-1);
  const yesterdayRev  = sales.filter(s => s.createdAt && new Date(s.createdAt).toDateString()===yest.toDateString()).reduce((a,s)=>a+Number(s.finalTotal||0),0);
  const yesterdayCnt  = sales.filter(s => s.createdAt && new Date(s.createdAt).toDateString()===yest.toDateString()).length;

  // payment breakdown
  const payDist = { cash:0, card:0, debt:0 };
  filteredSales.forEach(s => {
    if (s.paymentBreakdown?.length>0) s.paymentBreakdown.forEach(({method,amount})=>{ if(payDist[method]!==undefined) payDist[method]+=Number(amount||0); });
    else { const t=s.paymentType||'cash'; if(payDist[t]!==undefined) payDist[t]+=Number(s.finalTotal||0); }
  });

  // alerts
  const lowStock     = products.filter(p => Number(p.stockByWarehouse?.[selectedWarehouseId]||0) <= Number(p.minStock||5));
  const activeDebts  = debts.filter(d => ['active','partial','partially_paid'].includes(d.status));
  const totalDebt    = activeDebts.reduce((a,d)=>a+Number(d.remainingAmount||0),0);
  const overdueDebts = activeDebts.filter(d=>new Date(d.dueDate)<now).length;
  const pendingOrders = orders.filter(o=>o.status==='pending');

  // top products
  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        map[item.productId].qty     += Number(item.qty||0);
        map[item.productId].revenue += Number(item.qty||0)*Number(item.price||0);
      });
    });
    return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,5);
  }, [filteredSales]);

  // bar chart
  const chartBars = useMemo(() => {
    if (timeFilter==='hafta') {
      const DAYS = ['Yak','Du','Se','Chor','Pay','Ju','Shan'];
      const map = {}; DAYS.forEach(d=>map[d]=0);
      filteredSales.forEach(s => { const k=DAYS[new Date(s.createdAt).getDay()]; if(map[k]!==undefined) map[k]+=Number(s.finalTotal||0); });
      
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const name = DAYS[d.getDay()];
        result.push({ name, jami: map[name], active: i === 0 });
      }
      return result;
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
    // bugun / kecha — soatlar
    const map = {}; for(let i=0;i<=23;i++) map[`${String(i).padStart(2,'0')}`]=0;
    filteredSales.forEach(s=>{ const h=String(new Date(s.createdAt).getHours()).padStart(2,'0'); if(map[h]!==undefined) map[h]+=Number(s.finalTotal||0); });
    const nowH = timeFilter==='bugun' ? String(now.getHours()).padStart(2,'0') : '23';
    
    const result = [];
    for(let i=0; i<=23; i++) {
      const k = String(i).padStart(2,'0');
      if (parseInt(k) <= parseInt(nowH)) {
        result.push({ name: `${k}:00`, jami: map[k], active: k === nowH });
      }
    }
    return result;
  }, [filteredSales, timeFilter]);

  const maxBar = Math.max(...chartBars.map(b=>b.jami), 1);

  const filterLabels = { kecha:'Kecha', bugun:'Bugun', hafta:'Hafta', oy:'Oy', yil:'Yil' };

  if (loading) return (
    <div className="flex-center" style={{ height:'100%', flexDirection:'column', gap:'1rem' }}>
      <div className="spinner"/>
    </div>
  );

  const totalRevTrend = trendStr(revenue, yesterdayRev);
  const trendPos      = parseFloat(totalRevTrend) >= 0;

  return (
    <div className="dashboard-wrapper">

      {/* ══ HEADER & FILTERS ══ */}
      <div className="dashboard-header-row">
        {/* Filter pills */}
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
              {lowStock.length > 0 && `${lowStock.length} ta tovar qoldig'i kamaygan. `}
              {overdueDebts > 0 && `${overdueDebts} ta qarz muddati o'tgan. `}
              {pendingOrders.length > 0 && `${pendingOrders.length} ta buyurtma kutilmoqda.`}
            </span>
          </div>
          <button
            className="alert-strip-btn"
            onClick={() => navigate(lowStock.length > 0 ? '/products' : overdueDebts > 0 ? '/customers/debts' : '/orders')}
          >
            Barchasini ko'rish <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* ══ TOP 4-STAT GRID ══ */}
      <div className="dash-stats-grid">
        {/* Card 1: Revenue */}
        <div className="dash-card dash-card-hero-revenue" onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <span className="dash-card-title">{filterLabels[timeFilter]} Tushum</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: trendPos ? 'rgba(16,185,129,0.3)' : 'rgba(239,75,75,0.4)', color: '#fff' }}>
              {totalRevTrend}%
            </span>
          </div>
          <div className="dash-card-val">
            <CurrencyDisplay amount={revenue} />
          </div>
          <div className="dash-card-sub">
            <TrendingUp size={12} /> Kechaga nisbatan
          </div>
        </div>

        {/* Card 2: Sof Foyda (Gross Profit) */}
        <div className="dash-card dash-card-hero-profit">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <span className="dash-card-title">Sof Foyda (Marja)</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              {profitMarginPct}% marja
            </span>
          </div>
          <div className="dash-card-val">
            +<CurrencyDisplay amount={grossProfit} />
          </div>
          <div className="dash-card-sub">
            Tannarx ustiga marja
          </div>
        </div>

        {/* Card 3: Sotuvlar Soni */}
        <div className="dash-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <span className="dash-card-title" style={{ color: TG }}>Sotuvlar</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', color: GL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={14} />
            </div>
          </div>
          <div className="dash-card-val" style={{ color: TD }}>
            {salesCount} <span style={{ fontSize: '13px', fontWeight: 600, color: TG }}>ta</span>
          </div>
          <div className="dash-card-sub" style={{ color: TG }}>
            Mijozlar: {customers.filter(c => c.status !== 'archived').length}
          </div>
        </div>

        {/* Card 4: Tovarlar Tannarxi */}
        <div className="dash-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <span className="dash-card-title" style={{ color: TG }}>Tovarlar Tannarxi</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8FAFC', color: TG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={14} />
            </div>
          </div>
          <div className="dash-card-val" style={{ color: TD }}>
            <CurrencyDisplay amount={totalCost} />
          </div>
          <div className="dash-card-sub" style={{ color: TG }}>
            Mahsulotlar tannarxi
          </div>
        </div>
      </div>

      {/* ══ MAIN GRID (2 columns) ══ */}
      <div className="dashboard-main-grid">

        {/* LEFT COLUMN */}
        <div className="dashboard-col">

          {/* Savdo Grafigi */}
          <div style={{ border: `1px solid ${CARD_B}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 16px -10px rgba(0,0,0,0.08)', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '15px', color: TD }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#D1EDFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GL }}>
                  <BarChart2 size={14} />
                </div>
                Savdo grafigi
              </div>
              <span style={{ fontSize: '12px', color: TG, fontWeight: 600 }}>{filterLabels[timeFilter]}</span>
            </div>

            {/* AreaChart */}
            <div style={{ height: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartBars} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJami" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GL} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={GL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: TG, fontSize: 11 }} dy={6} minTickGap={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: TG, fontSize: 11 }} tickFormatter={v => formatCompact(v)} />
                  <Tooltip content={<CustomTooltip curr={curr} />} cursor={{ stroke: `${GL}55`, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="jami" stroke={GL} strokeWidth={2.5} fillOpacity={1} fill="url(#colorJami)" activeDot={{ r: 5, strokeWidth: 0, fill: GD }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Breakdown (3-Grid) */}
          <div className="pay-breakdown-grid">
            <div className="pay-card">
              <div className="pay-card-header">
                <span className="pay-card-title">Naqd</span>
                <Banknote size={14} color="#10B981" />
              </div>
              <div className="pay-card-val"><CurrencyDisplay amount={payDist.cash} /></div>
              <div className="pay-progress-bg">
                <div className="pay-progress-bar" style={{ width: `${pct(payDist.cash, revenue)}%`, background: '#10B981' }} />
              </div>
            </div>

            <div className="pay-card">
              <div className="pay-card-header">
                <span className="pay-card-title">Karta</span>
                <CreditCard size={14} color={GL} />
              </div>
              <div className="pay-card-val"><CurrencyDisplay amount={payDist.card} /></div>
              <div className="pay-progress-bg">
                <div className="pay-progress-bar" style={{ width: `${pct(payDist.card, revenue)}%`, background: GL }} />
              </div>
            </div>

            <div className="pay-card">
              <div className="pay-card-header">
                <span className="pay-card-title">Nasiya</span>
                <Wallet size={14} color="#F59E0B" />
              </div>
              <div className="pay-card-val"><CurrencyDisplay amount={payDist.debt} /></div>
              <div className="pay-progress-bg">
                <div className="pay-progress-bar" style={{ width: `${pct(payDist.debt, revenue)}%`, background: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dashboard-col">

          {/* Top Mahsulotlar */}
          <div style={{ border: `1px solid ${CARD_B}`, borderRadius: '16px', background: '#fff', overflow: 'hidden', boxShadow: '0 4px 16px -10px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: TD }}>Top mahsulotlar</div>
              <span style={{ fontSize: '12px', color: GD, fontWeight: 700 }}>{filterLabels[timeFilter]}</span>
            </div>
            <div>
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < topProducts.length - 1 ? `1px solid ${CARD_B}` : 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                    background: i === 0 ? `linear-gradient(135deg,${GL},${GD})` : '#F0F5FC',
                    color: i === 0 ? '#fff' : TG,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '13px'
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: TG, marginTop: 1 }}>{p.qty} dona sotildi</div>
                  </div>
                  <div style={{ background: GL, color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '14px', flexShrink: 0 }}>
                    {formatCompact(p.revenue)}
                  </div>
                </div>
              )) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: TG, fontSize: '13px' }}>Ma'lumot yo'q</div>
              )}
            </div>
          </div>

          {/* So'nggi Sotuvlar */}
          <div style={{ border: `1px solid ${CARD_B}`, borderRadius: '16px', background: '#fff', overflow: 'hidden', boxShadow: '0 4px 16px -10px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: TD }}>So'nggi sotuvlar</div>
              <button onClick={() => navigate('/reports')} style={{ fontSize: '12px', color: GL, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                Barchasi <ChevronRight size={12} />
              </button>
            </div>
            <div>
              {sales.slice(0, 4).map((sale, i) => (
                <div key={sale.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < 3 && i < sales.length - 1 ? `1px solid ${CARD_B}` : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: '#F0F5FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sale.paymentType === 'cash'
                      ? <Banknote size={16} color="#10B981" />
                      : sale.paymentType === 'card'
                      ? <CreditCard size={16} color={GL} />
                      : <Wallet size={16} color="#F59E0B" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: TD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sale.customerName || 'Anonim xaridor'}
                    </div>
                    <div style={{ fontSize: '11px', color: TG, marginTop: 1 }}>
                      {new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • {sale.items?.length || 0} ta mahsulot
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: GL, flexShrink: 0 }}>
                    <CurrencyDisplay amount={sale.finalTotal} />
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: TG, fontSize: '13px' }}>Hozircha sotuvlar yo'q</div>
              )}
            </div>
          </div>

          {/* Quick Actions (2x2 Grid) */}
          <div style={{ border: `1px solid ${CARD_B}`, borderRadius: '16px', background: '#fff', overflow: 'hidden', boxShadow: '0 4px 16px -10px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '14px 16px 4px', fontWeight: 700, fontSize: '15px', color: TD }}>Tezkor harakatlar</div>
            <div className="quick-actions-grid">
              <button className="quick-action-btn" onClick={() => navigate('/sales')}>
                <div className="quick-action-icon"><ShoppingCart size={16} /></div>
                Yangi sotuv
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/products')}>
                <div className="quick-action-icon"><Package size={16} /></div>
                Mahsulotlar
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/customers')}>
                <div className="quick-action-icon"><Users size={16} /></div>
                Mijozlar
              </button>
              <button className="quick-action-btn" onClick={() => navigate('/customers/debts')}>
                <div className="quick-action-icon"><Wallet size={16} /></div>
                Qarzlar {overdueDebts > 0 && <span style={{ background: RED, color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '999px', marginLeft: 'auto' }}>{overdueDebts}</span>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
