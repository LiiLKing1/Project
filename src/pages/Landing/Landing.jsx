import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { APP_NAME } from '../../config/appConfig';
import { ArrowRight, Box, CreditCard, BarChart3, ShieldCheck, Zap, Users } from 'lucide-react';

const FloatingNav = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`flex items-center justify-between rounded-full transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border border-zinc-200 px-6 py-3' : 'bg-transparent px-2 py-2'}`}>
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 cursor-pointer" onClick={() => navigate('/landing')}>
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-sm">★</span>
            </div>
            {APP_NAME}
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
            <button onClick={() => navigate('/features')} className="hover:text-zinc-900 transition-colors">Imkoniyatlar</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-zinc-900 transition-colors">Narxlar</button>
            <button onClick={() => navigate('/about')} className="hover:text-zinc-900 transition-colors">Biz haqimizda</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Kirish
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{ backgroundColor: '#18181b', color: '#ffffff' }}
            >
              Boshlash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <FloatingNav />

      {/* Hero Section */}
      <section className="pt-40 md:pt-48 pb-24 px-6 max-w-5xl mx-auto flex flex-col items-center text-center" style={{ paddingTop: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm mb-8"
        >
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: '#18181b', color: '#fff' }}>Yangi</span>
          <span className="text-sm font-medium text-zinc-600">Savdo va omborni avtomatlashtirish</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.05] mb-6 text-zinc-950"
        >
          Biznesingizni yangi bosqichga olib chiqing
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-500 max-w-2xl mb-10 font-medium leading-relaxed"
        >
          Barcha savdo, ombor va moliyaviy hisobotlarni bitta joyda professional boshqaring. Hech qanday ortiqcha murakkabliklarsiz.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 rounded-full text-[15px] font-semibold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#18181b', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
          >
            Tizimga kirish <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => navigate('/features')}
            className="w-full sm:w-auto bg-white border border-zinc-200 px-8 py-4 rounded-full text-[15px] font-semibold transition-all hover:bg-zinc-50 flex items-center justify-center"
            style={{ color: '#18181b' }}
          >
            Qanday ishlaydi?
          </button>
        </motion.div>
      </section>

      {/* Hero Asset - Real placeholder slot instead of fake div slop */}
      <section className="px-6 max-w-6xl mx-auto pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full aspect-video md:aspect-[21/9] bg-zinc-100 rounded-[2rem] border border-zinc-200/60 overflow-hidden flex flex-col items-center justify-center relative shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-50/50 mix-blend-overlay"></div>
          <BarChart3 size={48} className="text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium text-sm">Tizim interfeysi skrinshoti bu yerda joylashadi</p>
          <p className="text-zinc-400 text-xs mt-1">(1600 x 900 tavsiya etiladi)</p>
          {/* <!-- TODO: Insert real product dashboard screenshot here --> */}
        </motion.div>
      </section>

      {/* Features Grid - Asymmetric Layout instead of repeating zig-zags */}
      <section className="py-24 px-6 bg-white border-y border-zinc-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">Bitta platforma. Uchta qadam.</h2>
            <p className="text-lg text-zinc-500 font-medium max-w-xl">
              Savdo jarayonlarini boshqarish uchun kerak bo'ladigan barcha vositalar yagona va qulay interfeysda jamlangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Feature 1 */}
            <div className="md:col-span-2 bg-zinc-50 rounded-[2rem] p-8 md:p-12 border border-zinc-100 flex flex-col justify-between h-full min-h-[360px]">
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center mb-6">
                  <Box size={24} className="text-zinc-900" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">Omborni aniq nazorat qiling</h3>
                <p className="text-zinc-500 leading-relaxed max-w-md">
                  Tovarlar qoldig'i, qabul qilish va tarqatish jarayonlari to'liq avtomatlashtirilgan. Haqiqiy vaqtdagi qoldiqlar bilan kamchiliklarni oldini oling.
                </p>
              </div>
              <div className="mt-12 flex items-center gap-4 text-sm font-medium text-zinc-700 bg-white w-fit px-4 py-2 rounded-full border border-zinc-200">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Real vaqt sinxronizatsiyasi
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-50 rounded-[2rem] p-8 md:p-12 border border-zinc-100 flex flex-col justify-between h-full min-h-[360px]">
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center mb-6">
                  <CreditCard size={24} className="text-zinc-900" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight mb-3">Tezkor savdo va to'lovlar</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Shtrix-kod orqali 2 soniyada savdoni amalga oshiring. Split to'lovlar va barcha to'lov turlarini qo'llab-quvvatlash.
                </p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="md:col-span-3 rounded-[2rem] p-8 md:p-12 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-12" style={{ backgroundColor: '#18181b', color: 'white' }}>
              <div className="md:w-1/2">
                <div className="w-12 h-12 rounded-2xl border border-zinc-700 flex items-center justify-center mb-6 bg-zinc-800">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <h3 className="text-2xl md:text-4xl font-semibold tracking-tight mb-4">Chuqur moliyaviy analitika</h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                  Har bir mahsulot qancha foyda keltirayotganini ko'ring. Barcha xarajatlar, kassa aylanishi va sof foyda bitta professional dashboardda.
                </p>
                <button 
                  onClick={() => navigate('/features')}
                  className="px-6 py-3 rounded-full text-sm font-semibold transition-all hover:bg-zinc-100 inline-flex items-center gap-2"
                  style={{ backgroundColor: 'white', color: '#18181b' }}
                >
                  Batafsil ko'rish <ArrowRight size={16} />
                </button>
              </div>
              <div className="md:w-1/2 w-full aspect-video bg-zinc-800 rounded-2xl border border-zinc-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-700/50 to-zinc-800/20"></div>
                <BarChart3 size={48} className="text-zinc-600 relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Marquee / Grid */}
      <section className="py-24 px-6 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
           <div className="p-8">
             <div className="text-4xl font-bold tracking-tight text-zinc-900 mb-2">99.9%</div>
             <div className="text-sm font-medium text-zinc-500">Uptime kafolati</div>
           </div>
           <div className="p-8">
             <div className="text-4xl font-bold tracking-tight text-zinc-900 mb-2">24/7</div>
             <div className="text-sm font-medium text-zinc-500">Texnik yordam</div>
           </div>
           <div className="p-8">
             <div className="text-4xl font-bold tracking-tight text-zinc-900 mb-2">&lt; 2s</div>
             <div className="text-sm font-medium text-zinc-500">Tezkor tranzaksiyalar</div>
           </div>
           <div className="p-8">
             <div className="text-4xl font-bold tracking-tight text-zinc-900 mb-2">100+</div>
             <div className="text-sm font-medium text-zinc-500">Do'konlar tarmog'i</div>
           </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="pt-24 pb-12 px-6 border-t border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-16 mb-16">
          <div className="md:w-1/3">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 mb-6">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                <span className="text-white text-sm">★</span>
              </div>
              {APP_NAME}
            </div>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Kichik do'konlardan tortib yirik tarmoqlargacha savdoni avtomatlashtirishning yagona professional yechimi.
            </p>
          </div>
          <div className="flex flex-wrap gap-16">
            <div>
              <h4 className="font-semibold mb-6 text-zinc-900">Mahsulot</h4>
              <ul className="space-y-4 text-zinc-500 font-medium text-sm">
                <li><button onClick={() => navigate('/features')} className="hover:text-zinc-900 transition-colors">Xususiyatlar</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-zinc-900 transition-colors">Narxlar</button></li>
                <li><button className="hover:text-zinc-900 transition-colors">Yangilanishlar</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6 text-zinc-900">Kompaniya</h4>
              <ul className="space-y-4 text-zinc-500 font-medium text-sm">
                <li><button onClick={() => navigate('/about')} className="hover:text-zinc-900 transition-colors">Biz haqimizda</button></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-zinc-900 transition-colors">Aloqa</button></li>
                <li><button className="hover:text-zinc-900 transition-colors">Hamkorlik</button></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-zinc-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-400 text-sm font-medium">
          <p>© 2026 {APP_NAME}. Barcha huquqlar himoyalangan.</p>
          <div className="flex gap-6">
            <button className="hover:text-zinc-600 transition-colors">Maxfiylik siyosati</button>
            <button className="hover:text-zinc-600 transition-colors">Foydalanish shartlari</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
