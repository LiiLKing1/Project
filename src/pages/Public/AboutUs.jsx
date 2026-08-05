import React from 'react';
import TitleBar from '../../components/TitleBar';
import StaggeredMenu from '../../components/StaggeredMenu';
import { APP_NAME } from '../../config/appConfig';

export default function AboutUs() {
  const menuItems = [
    { label: 'Bosh sahifa', link: '/landing' },
    { label: 'Xususiyatlar', link: '/features' },
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
      
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Biz haqimizda</h1>
        <div className="prose prose-zinc lg:prose-lg">
          <p className="text-zinc-600 text-lg leading-relaxed mb-6">
            Bizning maqsadimiz bizneslarni zamonaviy va qulay vositalar bilan ta'minlash orqali ularning o'sishiga yordam berishdir. {APP_NAME} platformasi orqali siz savdo, ombor, va xodimlarni boshqarish jarayonlarini to'liq avtomatlashtirishingiz mumkin.
          </p>
          <p className="text-zinc-600 text-lg leading-relaxed mb-6">
            Jamoamiz yillar davomida mahalliy va xalqaro bozorlarda tajriba to'plagan mutaxassislardan iborat bo'lib, ular har doim sizning ehtiyojlaringizni birinchi o'ringa qo'yadi.
          </p>
        </div>
      </main>
    </div>
  );
}
