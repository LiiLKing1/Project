import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../config/appConfig';

// ── Particle constellation canvas ──────────────────────────────────────────
function ConstellationCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const DPR = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      ctx.scale(DPR, DPR);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // Particle colors — vivid spectrum
    const COLORS = [
      '#8052ff', '#a37dff', '#6b3de0',
      '#ffb829', '#ffd27a',
      '#15846e', '#1fb89a',
      '#e040fb', '#7b61ff',
      '#40c4ff', '#00e5ff',
    ];

    // Generate brain-shaped cluster center + ambient particles
    const makeParticles = () => {
      const particles = [];
      const cx = W() * 0.5, cy = H() * 0.5;
      // Brain cluster — organic oval with noise
      for (let i = 0; i < 320; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rx = (W() * 0.28) * (0.3 + Math.random() * 0.7);
        const ry = (H() * 0.38) * (0.3 + Math.random() * 0.7);
        const nx = cx + Math.cos(angle) * rx * (0.6 + Math.random() * 0.4);
        const ny = cy + Math.sin(angle) * ry * (0.6 + Math.random() * 0.4);
        particles.push({
          x: nx, y: ny,
          ox: nx, oy: ny,
          size: 2 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.6,
          drift: (Math.random() - 0.5) * 6,
          cluster: true,
        });
      }
      // Ambient scattered particles
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * W(), y: Math.random() * H(),
          ox: 0, oy: 0,
          size: 1 + Math.random() * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.3,
          drift: (Math.random() - 0.5) * 20,
          cluster: false,
        });
      }
      return particles;
    };

    let particles = makeParticles();
    let t = 0;

    const drawTriangle = (x, y, size, color, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.866, size * 0.5);
      ctx.lineTo(-size * 0.866, size * 0.5);
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, W(), H());
      t += 0.008;
      particles.forEach((p, i) => {
        const wave = Math.sin(t * p.speed + p.phase);
        if (p.cluster) {
          p.x = p.ox + Math.cos(t * p.speed + p.phase) * p.drift;
          p.y = p.oy + wave * p.drift;
        } else {
          p.x += Math.sin(t * 0.3 + i) * 0.2;
          p.y += Math.cos(t * 0.2 + i) * 0.15;
        }
        drawTriangle(p.x, p.y, p.size, p.color, t * p.speed * 0.5 + p.phase);
      });
      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── Main Landing component ─────────────────────────────────────────────────
const features = [
  {
    label: 'KASSA TIZIMI',
    heading: 'Kassani to\'liq nazorat qiling.',
    body: 'Mahsulot skanerlash, to\'lov qabul qilish, chek chiqarish — hammasi bir ekranda. Naqd, karta va aralash to\'lovlar birdek ishlaydi.',
  },
  {
    label: 'OMBOR & INVENTAR',
    heading: 'Tovar har doim nazoratda.',
    body: 'Kirim-chiqim, qoldiqlar, minimal zaxira ogohlantirishlari va omborlararo transfer. Inventarizatsiya bir necha daqiqada.',
  },
  {
    label: 'MIJOZLAR CRM',
    heading: 'Mijozlarni yaxshiroq tushining.',
    body: 'Bonus tizimi, nasiya hisobi, xarid tarixi. Har bir mijoz haqida to\'liq ma\'lumot bir joyda.',
  },
  {
    label: 'HISOBOTLAR',
    heading: 'Raqamlarda haqiqat bor.',
    body: 'Kunlik, oylik va davriy hisobotlar. Foyda-zarar, eng ko\'p sotiladigan tovarlar, kassa balansi — vizual va aniq.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navBg = scrollY > 60
    ? 'rgba(0,0,0,0.92)'
    : 'transparent';

  return (
    <div style={{
      background: '#000',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
      overflowX: 'hidden',
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: #8052ff33; }

        /* Fade-in on scroll */
        .fade-up {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-up.visible {
          opacity: 1;
          transform: none;
        }

        /* Nav link hover */
        .nav-link {
          color: #9a9a9a;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .nav-link:hover { color: #fff; }

        /* Pill CTA */
        .pill-btn {
          background: #8052ff;
          color: #fff;
          border: none;
          border-radius: 9999px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.15s;
          text-decoration: none;
          display: inline-block;
        }
        .pill-btn:hover { opacity: 0.88; transform: scale(1.03); }
        .pill-btn:active { transform: scale(0.97); }

        /* Ghost download link */
        .ghost-link {
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.35px;
          border-bottom: 1px solid rgba(255,255,255,0.25);
          padding-bottom: 2px;
          transition: border-color 0.2s;
          font-family: inherit;
          cursor: pointer;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
        }
        .ghost-link:hover { border-bottom-color: #fff; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 48px',
        background: navBg,
        backdropFilter: scrollY > 60 ? 'blur(16px)' : 'none',
        transition: 'background 0.4s, backdrop-filter 0.4s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <polygon points="11,1 21,20 1,20" stroke="#8052ff" strokeWidth="1.5" fill="none"/>
            <polygon points="11,6 18,18 4,18" stroke="#15846e" strokeWidth="0.8" fill="none" opacity="0.6"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>{APP_NAME}</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <button className="nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Xususiyatlar</button>
          <button className="nav-link" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>Biz haqimizda</button>
          <button className="nav-link" onClick={() => navigate('/login')}>Kirish</button>
          <button className="pill-btn" onClick={() => navigate('/login')}>Boshlash</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 48px',
        gap: 60,
        paddingTop: 80,
      }}>
        {/* Left — text */}
        <div>
          <p style={{
            fontSize: 14, fontWeight: 600, letterSpacing: '0.35px',
            textTransform: 'uppercase', color: '#ffb829',
            marginBottom: 32,
          }}>
            Savdo tizimi — yangi avlod
          </p>
          <h1 style={{
            fontSize: 'clamp(52px, 5.5vw, 78px)',
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-3.12px',
            color: '#fff',
            marginBottom: 36,
          }}>
            Do'koningizni{' '}
            <span style={{ color: '#8052ff' }}>aqlli</span>{' '}
            boshqaring.
          </h1>
          <p style={{
            fontSize: 18, fontWeight: 200, lineHeight: 1.6,
            color: '#bdbdbd', maxWidth: 440, marginBottom: 48,
          }}>
            {APP_NAME} — kassa, ombor, mijozlar va hisobotlarni bitta dasturda birlashtirgan zamonaviy POS & ERP tizimi. Veb va Windows ilovasi sifatida ishlaydi.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <button className="pill-btn" style={{ padding: '15px 32px', fontSize: 15 }}
              onClick={() => navigate('/login')}>
              Bepul boshlash →
            </button>
            <a href="/downloads/Savdogar-Setup.exe" download="Savdogar-Setup.exe" className="ghost-link">
              ↓ Windows (.exe) yuklab olish
            </a>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: '#9a9a9a', fontWeight: 400 }}>
            Windows 10/11 · 64-bit · Bepul
          </p>
        </div>

        {/* Right — constellation */}
        <div style={{ height: '70vh', minHeight: 420, position: 'relative' }}>
          <ConstellationCanvas />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px' }}>
        {features.map((f, i) => (
          <FadeUpBlock key={i} delay={i * 50}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
              gap: 60,
              padding: '80px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              direction: i % 2 === 0 ? 'ltr' : 'rtl',
            }}>
              <div style={{ direction: 'ltr' }}>
                <p style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.35px',
                  color: '#8052ff', textTransform: 'uppercase', marginBottom: 24,
                }}>{f.label}</p>
                <h2 style={{
                  fontSize: 'clamp(36px, 3.5vw, 48px)',
                  fontWeight: 400, lineHeight: 1.1,
                  letterSpacing: '-1.68px', color: '#fff',
                }}>{f.heading}</h2>
              </div>
              <div style={{ direction: 'ltr', display: 'flex', alignItems: 'center' }}>
                <p style={{
                  fontSize: 18, fontWeight: 200, lineHeight: 1.7,
                  color: '#9a9a9a', maxWidth: 460,
                }}>{f.body}</p>
              </div>
            </div>
          </FadeUpBlock>
        ))}
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────── */}
      <section id="about" style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px' }}>
        <FadeUpBlock>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 80,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 60,
            alignItems: 'start',
          }}>
            <div>
              <p style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.35px',
                color: '#ffb829', textTransform: 'uppercase', marginBottom: 24,
              }}>BIZ HAQIMIZDA</p>
              <h2 style={{
                fontSize: 'clamp(42px, 4vw, 60px)',
                fontWeight: 400, lineHeight: 1.05,
                letterSpacing: '-2.5px', color: '#fff',
              }}>
                Savdo uchun yaratilgan tizim.
              </h2>
            </div>
            <div>
              <p style={{
                fontSize: 18, fontWeight: 200, lineHeight: 1.8,
                color: '#9a9a9a', marginBottom: 40,
              }}>
                {APP_NAME} — o'zbek tadbirkorlarining haqiqiy ehtiyojlari asosida yaratilgan. Kichik do'kondan tortib katta savdo tarmog'igacha — har qanday hajmda samarali ishlaydi.
              </p>
              <p style={{
                fontSize: 18, fontWeight: 200, lineHeight: 1.8,
                color: '#9a9a9a', marginBottom: 48,
              }}>
                Firebase bulutida saqlanadigan ma'lumotlar istalgan qurilmadan — veb-brauzer yoki Windows ilovasi orqali — bir xil ko'rinadi va sinxronlashadi.
              </p>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 60 }}>
                {[
                  { n: '10+', l: 'Modul' },
                  { n: '24/7', l: 'Bulutda' },
                  { n: '100%', l: 'Sinxron' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 42, fontWeight: 400, letterSpacing: '-1.68px', color: '#8052ff' }}>{s.n}</div>
                    <div style={{ fontSize: 14, color: '#9a9a9a', marginTop: 6, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.35px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUpBlock>
      </section>

      {/* ── DOWNLOAD CTA ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px' }}>
        <FadeUpBlock>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 80,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.35px',
              color: '#ffb829', textTransform: 'uppercase', marginBottom: 32,
            }}>HOZIROQ BOSHLANG</p>
            <h2 style={{
              fontSize: 'clamp(52px, 6vw, 78px)',
              fontWeight: 400, lineHeight: 1.05,
              letterSpacing: '-3.12px', color: '#fff',
              maxWidth: 700, marginBottom: 60,
            }}>
              Ro'yxatdan o'ting.<br />Yuklab oling.
            </h2>
            <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="pill-btn" style={{ padding: '16px 36px', fontSize: 15 }}
                onClick={() => navigate('/login')}>
                Veb-saytda ochish
              </button>
              <a href="/downloads/Savdogar-Setup.exe" download="Savdogar-Setup.exe"
                className="ghost-link" style={{ fontSize: 15 }}>
                ↓ Windows ilovasini yuklab olish
              </a>
              <span style={{ color: '#9a9a9a', fontSize: 13, fontWeight: 200 }}>
                Windows 10/11 · 64-bit · 133 MB
              </span>
            </div>
          </div>
        </FadeUpBlock>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '36px 48px',
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, color: '#9a9a9a', fontWeight: 400 }}>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <div style={{ display: 'flex', gap: 36 }}>
          <button className="nav-link" onClick={() => navigate('/login')}>Kirish</button>
          <button className="nav-link" onClick={() => navigate('/login')}>Ro'yxatdan o'tish</button>
        </div>
      </footer>
    </div>
  );
}

// ── Intersection Observer fade-up ──────────────────────────────────────────
function FadeUpBlock({ children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="fade-up" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
