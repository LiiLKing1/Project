import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Users, Package, TrendingUp, TrendingDown,
  CreditCard, Banknote, Wallet, ChevronRight, BarChart2,
  AlertCircle, ArrowUpRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  const now      = useMemo(() => new Date(), []);

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
      const today = DAYS[now.getDay()];
      return DAYS.map(name => ({ name, jami: map[name], active: name===today }));
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
    const entries = Object.entries(map).filter(([k])=>parseInt(k)<=parseInt(nowH));
    return entries.map(([name,jami])=>({ name: `${name}:00`, jami, active: name===nowH }));
  }, [filteredSales, timeFilter]);

  const maxBar = Math.max(...chartBars.map(b=>b.jami), 1);

  const filterLabels = { kecha:'Kecha', bugun:'Bugun', hafta:'Hafta', oy:'Oy', yil:'Yil' };

  if (loading) return (
    <div className="flex-center" style={{ height:'100%', flexDirection:'column', gap:'1rem' }}>
      <div className="spinner"/>
    </div>
  );

  const totalRevTrend = trendStr(revenue, yesterdayRev);
  const cntTrend      = trendStr(salesCount, yesterdayCnt);
  const trendPos      = parseFloat(totalRevTrend) >= 0;

  return (
    <div style={{ fontFamily:"'Poppins','Segoe UI',sans-serif", display:'flex', flexDirection:'column', gap:'1.25rem', paddingBottom:'2rem', color: TD }}>

      {/* ══ HEADER ══ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
        <div style={{ display:'flex', gap:'8px' }}>
          {/* Filter pill */}
          <div style={{ display:'flex', background:'#fff', border:`1px solid ${CARD_B}`, borderRadius:'30px', padding:'4px', gap:'4px', boxShadow:'0 4px 12px -6px rgba(0,0,0,.12)' }}>
            {Object.entries(filterLabels).map(([key,label]) => (
              <button key={key} onClick={()=>setTimeFilter(key)} style={{
                padding:'8px 18px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'14px', fontWeight: timeFilter===key?700:500,
                background: timeFilter===key ? `linear-gradient(135deg,${GL},${GM})` : 'transparent',
                color: timeFilter===key ? '#fff' : TG,
                transition:'all .2s'
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ALERTS ══ */}
      {(lowStock.length>0 || overdueDebts>0 || pendingOrders.length>0) && (
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {lowStock.length>0 && (
            <button onClick={()=>navigate('/products')} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:'999px', border:'1px solid #F59E0B55', background:'#FEF9EC', color:'#B45309', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              <Package size={16}/> {lowStock.length} ta tovar kam <ChevronRight size={14}/>
            </button>
          )}
          {overdueDebts>0 && (
            <button onClick={()=>navigate('/customers/debts')} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:'999px', border:`1px solid ${RED}55`, background:'#FEF2F2', color: RED, fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              <AlertCircle size={16}/> {overdueDebts} ta qarz muddati o'tgan <ChevronRight size={14}/>
            </button>
          )}
          {pendingOrders.length>0 && (
            <button onClick={()=>navigate('/orders')} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:'999px', border:`1px solid ${GL}66`, background:'#F0F6FC', color: GD, fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              <ShoppingCart size={16}/> {pendingOrders.length} ta buyurtma <ChevronRight size={14}/>
            </button>
          )}
        </div>
      )}

      {/* ══ MAIN GRID ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>

        {/* LEFT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Revenue hero card */}
          <div onClick={()=>navigate('/reports')} style={{
            background: HERO_GRADIENT,
            borderRadius:'20px', padding:'20px',
            boxShadow:`0 16px 40px -12px ${GL}55`,
            cursor:'pointer', position:'relative', overflow:'hidden'
          }}>
            <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
            <div style={{ position:'absolute', right:30, bottom:-30, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,.8)', fontWeight:500, marginBottom:8 }}>{filterLabels[timeFilter]} tushum</div>
              <div style={{ fontSize:'32px', fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>
                <CurrencyDisplay amount={revenue}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14 }}>
                <span style={{ fontSize:'13px', fontWeight:700, color:'#fff', padding:'4px 10px', borderRadius:'8px', background: trendPos?'rgba(0,0,0,.25)':'rgba(239,75,75,.5)' }}>
                  {trendPos?<TrendingUp size={12} style={{display:'inline',marginRight:4}}/>:<TrendingDown size={12} style={{display:'inline',marginRight:4}}/>}
                  {totalRevTrend}%
                </span>
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,.75)' }}>kechaga nisbatan</span>
              </div>
            </div>
            <div style={{ marginTop:24, paddingTop:18, borderTop:'1px solid rgba(255,255,255,.2)', display:'flex', gap:24, position:'relative' }}>
              <div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.7)', marginBottom: 4 }}>Sotuvlar</div>
                <div style={{ fontWeight:700, color:'#fff', fontSize:'18px' }}>{salesCount} ta</div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,.7)', marginBottom: 4 }}>Mijozlar</div>
                <div style={{ fontWeight:700, color:'#fff', fontSize:'18px' }}>{customers.filter(c=>c.status!=='archived').length}</div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
                <ArrowUpRight size={18} color="rgba(255,255,255,.6)"/>
              </div>
            </div>
          </div>

          <div style={{ border:`1px solid ${CARD_B}`, borderRadius:'20px', padding:'20px', boxShadow:'0 8px 24px -18px rgba(0,0,0,.3)', background:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, fontWeight:700, fontSize:'16px', color: TD }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'#D1EDFB', display:'flex', alignItems:'center', justifyContent:'center', color: GL }}>
                  <BarChart2 size={16}/>
                </div>
                Savdo grafigi
              </div>
              <span style={{ fontSize:'13px', color: TG, fontWeight:600 }}>{filterLabels[timeFilter]} ⌄</span>
            </div>

            {/* Recharts BarChart */}
            <div style={{ height:'160px', marginTop:'10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartBars} margin={{ top:10, right:0, left:-25, bottom:0 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: TG, fontSize:12 }} dy={8}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: TG, fontSize:12 }} tickFormatter={v => formatCompact(v)}/>
                  <Tooltip content={<CustomTooltip curr={curr}/>} cursor={{ fill: `${GL}15`, radius:8 }}/>
                  <Bar dataKey="jami" radius={[6,6,0,0]} maxBarSize={36}>
                    {chartBars.map((entry, index) => (
                      <Cell key={index} fill={entry.active ? GL : `${GL}66`}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macro-style: payment types (from .macros) */}
          <div style={{ display:'flex', gap:'8px' }}>
            <MacroCard
              label="Naqd"
              value={payDist.cash}
              maxValue={revenue}
              unit={formatCompact(revenue) + ' ' + curr}
              trend={`${pct(payDist.cash,revenue)}%`}
              isAlert={false}
            />
            <MacroCard
              label="Karta"
              value={payDist.card}
              maxValue={revenue}
              unit={formatCompact(revenue) + ' ' + curr}
              trend={`${pct(payDist.card,revenue)}%`}
              isAlert={false}
            />
            <MacroCard
              label="Nasiya"
              value={payDist.debt}
              maxValue={revenue}
              unit={formatCompact(revenue) + ' ' + curr}
              trend={`${pct(payDist.debt,revenue)}%`}
              isAlert={payDist.debt > revenue * 0.4}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          <div style={{ border:`1px solid ${CARD_B}`, borderRadius:'20px', background:'#fff', overflow:'hidden', boxShadow:'0 8px 24px -18px rgba(0,0,0,.3)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 0' }}>
              <div style={{ fontWeight:700, fontSize:'16px', color: TD }}>Top mahsulotlar</div>
              <span style={{ fontSize:'13px', color: GD, fontWeight:700 }}>{filterLabels[timeFilter]}</span>
            </div>
            <div style={{ marginTop:14 }}>
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i<topProducts.length-1?`1px solid ${CARD_B}`:'none' }}>
                  <div style={{
                    width:44, height:44, borderRadius:'14px', flexShrink:0,
                    background: i===0?`linear-gradient(135deg,${GL},${GD})`:'#F0F5FC',
                    color: i===0?'#fff': TG,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:'14px'
                  }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'15px', color: TD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize:'13px', color: TG, marginTop:2 }}>{p.qty} dona sotildi</div>
                  </div>
                  <div style={{ background: GL, color:'#fff', fontSize:'13px', fontWeight:700, padding:'6px 14px', borderRadius:'20px', flexShrink:0 }}>
                    {formatCompact(p.revenue)}
                  </div>
                </div>
              )) : (
                <div style={{ padding:'2rem', textAlign:'center', color: TG, fontSize:'15px' }}>Ma'lumot yo'q</div>
              )}
            </div>
          </div>

          {/* Recent Sales (from .list-card .list-row) */}
          <div style={{ border:`1px solid ${CARD_B}`, borderRadius:'20px', background:'#fff', overflow:'hidden', boxShadow:'0 8px 24px -18px rgba(0,0,0,.3)', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 8px' }}>
              <div style={{ fontWeight:700, fontSize:'16px', color: TD }}>So'nggi sotuvlar</div>
              <button onClick={()=>navigate('/reports')} style={{ fontSize:'13px', color: GL, fontWeight:700, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                Barchasi <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6"/></svg>
              </button>
            </div>
            <div>
              {sales.slice(0,6).map((sale, i) => (
                <div key={sale.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i<5&&i<sales.length-1?`1px solid ${CARD_B}`:'none' }}>
                  <div style={{ width:44, height:44, borderRadius:'14px', background:'#F0F5FC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {sale.paymentType==='cash'
                      ? <Banknote size={18} color="#10B981"/>
                      : sale.paymentType==='card'
                      ? <CreditCard size={18} color={GL}/>
                      : <Wallet size={18} color="#F59E0B"/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'15px', color: TD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {sale.customerName || 'Anonim xaridor'}
                    </div>
                    <div style={{ fontSize:'12px', color: TG, marginTop:2 }}>
                      {new Date(sale.createdAt).toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})} • {sale.items?.length||0} mahsulot
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'15px', color: GL, flexShrink:0 }}>
                    <CurrencyDisplay amount={sale.finalTotal}/>
                  </div>
                </div>
              ))}
              {sales.length===0 && (
                <div style={{ padding:'3rem', textAlign:'center', color: TG, fontSize:'15px' }}>Hozircha sotuvlar yo'q</div>
              )}
            </div>
          </div>

          {/* Quick Actions (from .list-card) */}
          <div style={{ border:`1px solid ${CARD_B}`, borderRadius:'20px', background:'#fff', overflow:'hidden', boxShadow:'0 8px 24px -18px rgba(0,0,0,.3)' }}>
            <div style={{ padding:'18px 20px 8px', fontWeight:700, fontSize:'16px', color: TD }}>Tezkor harakatlar</div>
            <ListRow icon={<ShoppingCart size={16}/>} label="Yangi sotuv" onClick={()=>navigate('/sales')}/>
            <ListRow icon={<Package size={16}/>} label="Mahsulot qo'shish" onClick={()=>navigate('/products')}/>
            <ListRow icon={<Users size={16}/>} label="Mijozlar" onClick={()=>navigate('/customers')}/>
            <ListRow icon={<Wallet size={16}/>} label="Qarzlar" onClick={()=>navigate('/customers/debts')}
              right={overdueDebts>0 && <span style={{ fontSize:'12px', fontWeight:700, color:'#fff', background: RED, padding:'2px 10px', borderRadius:'999px' }}>{overdueDebts}</span>}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
