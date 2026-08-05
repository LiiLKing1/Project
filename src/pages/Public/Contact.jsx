import React from 'react';
import TitleBar from '../../components/TitleBar';
import StaggeredMenu from '../../components/StaggeredMenu';
import { APP_NAME } from '../../config/appConfig';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
  const menuItems = [
    { label: 'Bosh sahifa', link: '/landing' },
    { label: 'Xususiyatlar', link: '/features' },
    { label: 'Biz haqimizda', link: '/about' },
    { label: 'Narxlar', link: '/pricing' },
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
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Biz bilan aloqa</h1>
        <p className="text-lg text-zinc-600 mb-12">Savollaringiz bormi? Yordam berishdan doim xursandmiz.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center shrink-0">
                <Phone className="text-zinc-900" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Telefon</h3>
                <p className="text-zinc-600">+998 90 123 45 67</p>
                <p className="text-zinc-600">+998 71 234 56 78</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center shrink-0">
                <Mail className="text-zinc-900" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Elektron pochta</h3>
                <p className="text-zinc-600">info@{APP_NAME.toLowerCase()}.uz</p>
                <p className="text-zinc-600">support@{APP_NAME.toLowerCase()}.uz</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="text-zinc-900" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Manzil</h3>
                <p className="text-zinc-600">Toshkent shahri, Yunusobod tumani,<br/>Amir Temur shoh ko'chasi 108</p>
              </div>
            </div>
          </div>

          <form className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Ism</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-zinc-400" placeholder="Ali Valiyev" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email yoki Telefon</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-zinc-400" placeholder="+998 90 123 45 67" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Xabar</label>
              <textarea className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white h-32 resize-none focus:outline-none focus:border-zinc-400" placeholder="Savolingizni yozing..."></textarea>
            </div>
            <button type="button" className="bg-zinc-950 text-white rounded-xl py-3 font-medium hover:bg-zinc-800 transition-colors mt-2">
              Xabarni yuborish
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
