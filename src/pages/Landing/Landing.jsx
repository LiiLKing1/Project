import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TitleBar from '../../components/TitleBar';
import { APP_NAME } from '../../config/appConfig';
import StaggeredMenu from '../../components/StaggeredMenu';
import CrowdCanvas from '../../components/CrowdCanvas';
import gsap from 'gsap';

export default function Landing() {
  const navigate = useNavigate();
  const isElectron = window.electronAPI?.isElectron;

  const menuItems = [
    { label: 'Xususiyatlar', link: '#features' },
    { label: 'Biz haqimizda', link: '#about' },
    { label: 'Narxlar', link: '#pricing' },
    { label: 'Kirish', link: '/login' },
  ];

  const languages = [
    { label: 'UZ', link: '#' },
    { label: 'EN', link: '#' },
    { label: 'RU', link: '#' }
  ];

  const heroRef = useRef(null);

  useEffect(() => {
    // Simple entry animation for hero text
    if (heroRef.current) {
      gsap.fromTo(heroRef.current.children, 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background-color: #ffffff; color: #111; }
        .hero-title {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 800;
          letter-spacing: -2px;
          line-height: 1.1;
          color: #0f172a;
          margin-bottom: 1.5rem;
        }
        .hero-subtitle {
          font-size: clamp(1.2rem, 2vw, 1.5rem);
          color: #475569;
          max-width: 600px;
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        .primary-btn {
          background: #111;
          color: #fff;
          padding: 1rem 2.5rem;
          border-radius: 99px;
          font-size: 1.1rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .primary-btn:hover {
          background: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(59,130,246,0.5);
        }
      `}</style>

      {/* Electron TitleBar */}
      <TitleBar transparent hideLogo />

      {/* Fixed Glass Navbar with Staggered Menu */}
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={languages}
        displaySocials={true}
        displayItemNumbering={false}
        logoText={APP_NAME}
        colors={[]}
        accentColor="#5227FF"
        menuButtonColor="#f5f6fa"
        openMenuButtonColor="#f5f6fa"
        changeMenuColorOnOpen={true}
        isFixed={true} 
      />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: isElectron ? 120 : 100 }}>
        
        {/* Crowd Canvas at the bottom */}
        <div style={{ height: '350px', width: '100%', marginTop: 'auto', overflow: 'hidden', position: 'relative' }}>
           <CrowdCanvas src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png" rows={15} cols={7} peepColor="#111" />
        </div>
      </main>

    </div>
  );
}
