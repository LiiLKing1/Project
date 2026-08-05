import React from 'react';
import TitleBar from '../../components/TitleBar';
import StaggeredMenu from '../../components/StaggeredMenu';
import { APP_NAME } from '../../config/appConfig';

export default function Features() {
  const menuItems = [
    { label: 'Bosh sahifa', link: '/landing' },
    { label: 'Biz haqimizda', link: '/about' },
    { label: 'Narxlar', link: '/pricing' },
    { label: 'Aloqa', link: '/contact' },
    { label: 'Kirish', link: '/login' },
  ];

  const languages = [
    { label: 'UZ', link: '#' },
    { label: 'EN', link: '#' },
    { label: 'RU', link: '#' }
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans">
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
        menuButtonColor="#f4f4f5"
        openMenuButtonColor="#f4f4f5"
        changeMenuColorOnOpen={true}
        isFixed={true} 
      />
      
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-16 text-center">Tizim imkoniyatlari</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100">
            <h2 className="text-2xl font-bold mb-4">Omborni boshqarish</h2>
            <p className="text-zinc-600 leading-relaxed">
              Real vaqt rejimida qoldiqni kuzatish, qabul qilish va tarqatish jarayonlarini avtomatlashtirish.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100">
            <h2 className="text-2xl font-bold mb-4">Savdo va Kassa</h2>
            <p className="text-zinc-600 leading-relaxed">
              Shtrix-kod orqali tezkor savdo, chek chiqarish va to'lovlarni barcha turlarda qabul qilish.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100">
            <h2 className="text-2xl font-bold mb-4">Moliyaviy hisobotlar</h2>
            <p className="text-zinc-600 leading-relaxed">
              Daromad, xarajat, foyda va zarar bo'yicha aniq analitik grafiklar va jadvallar.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100">
            <h2 className="text-2xl font-bold mb-4">Xodimlar nazorati</h2>
            <p className="text-zinc-600 leading-relaxed">
              Kassirlar ish vaqtini, savdo hajmini va samaradorligini monitoring qilish.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
