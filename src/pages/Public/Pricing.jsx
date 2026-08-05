import React from 'react';
import TitleBar from '../../components/TitleBar';
import StaggeredMenu from '../../components/StaggeredMenu';
import { APP_NAME } from '../../config/appConfig';
import { Check } from 'lucide-react';

export default function Pricing() {
  const menuItems = [
    { label: 'Bosh sahifa', link: '/landing' },
    { label: 'Xususiyatlar', link: '/features' },
    { label: 'Biz haqimizda', link: '/about' },
    { label: 'Aloqa', link: '/contact' },
    { label: 'Kirish', link: '/login' },
  ];

  const languages = [
    { label: 'UZ', link: '#' },
    { label: 'EN', link: '#' },
    { label: 'RU', link: '#' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans">
      <TitleBar transparent hideLogo />
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={languages}
        displaySocials={true}
        displayItemNumbering={false}
        logoText={APP_NAME}
        colors={[]}
        accentColor="#18181b"
        menuButtonColor="#e4e4e7"
        openMenuButtonColor="#f4f4f5"
        changeMenuColorOnOpen={true}
        isFixed={true} 
      />
      
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Oddiy va shaffof narxlar</h1>
          <p className="text-lg text-zinc-500">O'zingizga mos tarifni tanlang. Hech qanday yashirin to'lovlar yo'q.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm">
            <h3 className="text-2xl font-bold mb-2">Boshlang'ich</h3>
            <p className="text-zinc-500 mb-6">Kichik biznes va do'konlar uchun</p>
            <div className="text-4xl font-bold tracking-tight mb-6">
              Bepul
            </div>
            <ul className="space-y-4 mb-8 text-zinc-600">
              <li className="flex items-center gap-3"><Check className="text-zinc-900" size={20} /> 1 ta kassir</li>
              <li className="flex items-center gap-3"><Check className="text-zinc-900" size={20} /> Baza (100 ta mahsulotgacha)</li>
              <li className="flex items-center gap-3"><Check className="text-zinc-900" size={20} /> Asosiy hisobotlar</li>
            </ul>
            <button className="w-full py-3 rounded-full font-medium border border-zinc-200 hover:bg-zinc-50 transition-colors">Boshlash</button>
          </div>

          {/* Pro Plan */}
          <div className="bg-zinc-950 text-white rounded-3xl p-8 border border-zinc-900 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Tavsiya etamiz</div>
            <h3 className="text-2xl font-bold mb-2">Professional</h3>
            <p className="text-zinc-400 mb-6">Kengayayotgan tarmoqlar uchun</p>
            <div className="text-4xl font-bold tracking-tight mb-6 flex items-end gap-2">
              $19 <span className="text-lg text-zinc-400 font-normal">/oy</span>
            </div>
            <ul className="space-y-4 mb-8 text-zinc-300">
              <li className="flex items-center gap-3"><Check className="text-zinc-100" size={20} /> Cheksiz xodimlar</li>
              <li className="flex items-center gap-3"><Check className="text-zinc-100" size={20} /> Cheksiz mahsulotlar va filiallar</li>
              <li className="flex items-center gap-3"><Check className="text-zinc-100" size={20} /> Murakkab tahlil va prognozlar</li>
              <li className="flex items-center gap-3"><Check className="text-zinc-100" size={20} /> 24/7 Premium yordam</li>
            </ul>
            <button className="w-full py-3 rounded-full font-medium bg-white text-zinc-950 hover:bg-zinc-100 transition-colors">Hozir sotib olish</button>
          </div>
        </div>
      </main>
    </div>
  );
}
