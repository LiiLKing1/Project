import React from 'react';
import { Search, Bell, HelpCircle, BarChart2, RefreshCcw, PieChart, MessageSquare, Users, Home, ChevronDown, Download, ChevronRight, Package, SlidersHorizontal } from 'lucide-react';

export default function DashMockup() {
  const bars = [28, 45, 22, 60, 40, 78, 55, 35, 68, 80, 38, 58];
  const months = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

  return (
    <div className="relative z-30 w-full bg-[#fcfcfc] rounded-[32px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(74,144,226,0.25)] flex font-sans" style={{ minHeight: '800px', minWidth: '1100px' }}>
      
      {/* Left Sidebar */}
      <div className="w-[280px] bg-white border-r border-slate-100 flex flex-col p-6 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <BarChart2 size={18} color="#fff"/>
          </div>
          <span className="font-bold text-xl text-slate-800">Savdogar</span>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Qidirish" className="!w-full bg-slate-50 border border-slate-100 rounded-xl !py-2.5 !pl-10 !pr-4 !text-sm outline-none text-slate-600 focus:ring-2 focus:ring-indigo-500/20" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
             <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">⌘</span>
             <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">K</span>
          </div>
        </div>

        {/* Menu */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-slate-400 mb-4 px-2 uppercase tracking-wider">Menyu</div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm cursor-pointer">
              <Home size={18} /> Asosiy panel
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm cursor-pointer transition-colors">
              <RefreshCcw size={18} /> Yangilanishlar
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm cursor-pointer transition-colors">
              <PieChart size={18} /> Tahlillar
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm cursor-pointer transition-colors">
              <div className="flex items-center gap-3"><MessageSquare size={18} /> Xabarlar</div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">34</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm cursor-pointer transition-colors">
              <Users size={18} /> Mijozlar
            </div>
          </div>
        </div>

        {/* Store */}
        <div className="mb-auto">
          <div className="text-xs font-semibold text-slate-400 mb-4 px-2 uppercase tracking-wider">Do'konlar</div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 text-slate-600 font-medium text-sm cursor-pointer hover:bg-slate-50 rounded-xl">
              <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">A</span> Asosiy Filial
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-slate-600 font-medium text-sm cursor-pointer hover:bg-slate-50 rounded-xl">
              <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">C</span> Chilonzor
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-slate-600 font-medium text-sm cursor-pointer hover:bg-slate-50 rounded-xl">
              <span className="w-6 h-6 rounded bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold">M</span> Maksim Gorkiy
            </div>
          </div>
        </div>

        {/* PRO Banner */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 p-5 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/4"></div>
          <h4 className="font-bold text-sm mb-1">PRO versiya</h4>
          <p className="text-[11px] text-indigo-100 mb-4 opacity-90 leading-relaxed">Cheksiz imkoniyatlarga ega bo'ling</p>
          <button className="!w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
            Yangilash
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-slate-800">Umumiy holat</h1>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Qidirish..." className="!w-full bg-white border border-slate-200 rounded-full !py-2 !pl-10 !pr-10 !text-sm outline-none focus:border-indigo-300" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex gap-1">
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">⌘</span><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">K</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <HelpCircle size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                 AV
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-bold text-slate-800">Ali Valiyev</div>
                <div className="text-[11px] text-slate-500">@alivaliyev</div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Purple Banner */}
        <div className="bg-indigo-500 rounded-[24px] p-6 text-white mb-6 shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-400/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h2 className="text-2xl font-bold mb-1">Assalomu alaykum, Ali Valiyev ✨</h2>
              <p className="text-indigo-100 text-sm">Moliyaviy ko'rsatkichlar va so'nggi tranzaksiyalar haqida qisqacha ma'lumot</p>
            </div>
            <div className="flex gap-3">
              <button className="!bg-white text-slate-700 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm hover:bg-slate-50">
                Shu oy <ChevronDown size={14} className="text-slate-400"/>
              </button>
              <button className="!bg-white text-slate-700 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm hover:bg-slate-50">
                <Download size={14} className="text-slate-500"/> Eksport
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 relative z-10">
            {[
              { title: 'Umumiy balans', val: '$10,340', desc: 'Barcha hisoblar bo\'yicha', icon: '💰', color: 'text-indigo-600', bg: 'bg-indigo-100' },
              { title: 'Oylik tushum', val: '$5,200', desc: 'Shu oydagi umumiy kirim', icon: '📈', color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { title: 'Oylik xarajat', val: '$1,475', desc: 'Shu oydagi umumiy chiqim', icon: '📉', color: 'text-rose-600', bg: 'bg-rose-100' },
              { title: 'Jamg\'arma', val: '$620', desc: 'Shu oydagi sof foyda', icon: '💎', color: 'text-blue-600', bg: 'bg-blue-100' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl p-4 text-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center text-lg`}>{card.icon}</div>
                  <div>
                    <div className="text-xl font-bold">{card.val}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">{card.desc}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-indigo-500 text-xs font-bold cursor-pointer">
                  {card.title} <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Left Chart */}
          <div className="col-span-2 bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Tranzaksiyalar grafigi</h3>
              <button className="!bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                Bu yil <ChevronDown size={14}/>
              </button>
            </div>
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-3xl font-bold text-slate-800">$8,435<span className="text-slate-400 text-xl font-medium">.00</span></div>
              </div>
              <div className="flex gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Umumiy savdo</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Foyda</div>
              </div>
            </div>

            {/* Bar Chart Mockup */}
            <div className="h-48 flex items-end gap-2">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full relative group">
                  {i === 6 && (
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-10">
                       $22,430
                     </div>
                  )}
                  <div className={`w-full rounded-t-md ${i===6 ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-200 transition-colors'}`} style={{ height: `${h}%` }}>
                    <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex mt-3 border-t border-slate-100 pt-3">
              {months.map((m, i) => (
                <div key={i} className="flex-1 text-center text-xs text-slate-400 font-bold">{m}</div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-lg font-bold text-slate-800">
              <Package size={20} className="text-slate-400"/> Savdo tahlili
            </div>
            <div className="text-xs text-slate-500 font-bold mb-1">Umumiy savdo</div>
            <div className="flex items-center gap-2 mb-8">
              <div className="text-3xl font-bold text-slate-800">8379</div>
              <div className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">↑ 4.8%</div>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Kiyim-kechak', p: 91 },
                { name: 'Oyoq kiyim', p: 73 },
                { name: 'Aksessuarlar', p: 58 },
                { name: 'Elektronika', p: 32 },
                { name: 'Boshqa', p: 20 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>{item.name}</span>
                    <span className="text-slate-400">{item.p}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.p}%` }}>
                       <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.2)_4px,rgba(255,255,255,0.2)_8px)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-3">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">So'nggi buyurtmalar</h3>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="text" placeholder="Qidirish..." className="!bg-slate-50 border border-slate-200 rounded-lg !py-1.5 !pl-8 !pr-4 !text-xs outline-none" />
               </div>
               <button className="!bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                 <SlidersHorizontal size={14}/> Saralash <ChevronDown size={14}/>
               </button>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500">
                <th className="pb-3 px-2"><input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/></th>
                <th className="pb-3">Mahsulot</th>
                <th className="pb-3">Buyurtma ID</th>
                <th className="pb-3">Sana</th>
                <th className="pb-3">Mijoz</th>
                <th className="pb-3">Holat</th>
                <th className="pb-3 text-right pr-2">Summa</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { product: "Erkaklar krossovkasi", id: "#878010", date: "2 Dek 2026", cust: "Ali Valiyev", stat: "Kutilmoqda", color: "rose", sum: "$780.00" },
                { product: "Ayollar sumkasi", id: "#878011", date: "1 Dek 2026", cust: "Zarina M.", stat: "Yetkazildi", color: "emerald", sum: "$245.50" },
                { product: "Bolalar kiyimi", id: "#878012", date: "1 Dek 2026", cust: "Rustam T.", stat: "To'langan", color: "blue", sum: "$120.00" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-2"><input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"/></td>
                  <td className="py-3 font-bold text-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-lg">📦</div>
                    {row.product}
                  </td>
                  <td className="py-3 text-slate-500 font-bold text-xs">{row.id}</td>
                  <td className="py-3 text-slate-500 text-xs">{row.date}</td>
                  <td className="py-3 font-bold text-slate-700 text-xs">{row.cust}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded bg-${row.color}-100 text-${row.color}-600 text-[10px] font-bold`}>{row.stat}</span>
                  </td>
                  <td className="py-3 font-bold text-slate-800 text-right pr-2">{row.sum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
