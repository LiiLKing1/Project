import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../config/appConfig';
import TitleBar from '../../components/TitleBar';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight, BarChart2, ShoppingCart, Users, Package } from 'lucide-react';
import { LiquidGlassCard } from '@/components/ui/liquid-glass';
import DashMockup from "./DashMockup";

/* ══════════════════════════════════════════════════════════
   FINANCIAL HERO — hero-financial.tsx template based
   BG: Silk WebGL canvas (from preview(2).html) — dark/silk
   Nav: Glassmorphism pill — used as hero nav background
   H1: Large, bold, centered
   Button: GlassButton from preview(2).html button #2
   Mockup: Real dashboard screenshot (iframe approach)
   ══════════════════════════════════════════════════════════ */

/* ── Intersection fade animation ─────────────────────────── */
function TimelineAnim({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      filter: visible ? 'blur(0px)' : 'blur(12px)',
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: `opacity 0.6s ease ${delay}ms, filter 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      ...style,
    }}>{children}</div>
  );
}

/* ── Silk WebGL Canvas background (from preview(2).html) ─── */
function useSilkCanvas(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) {
      canvas.parentElement?.classList.add('silk-fallback');
      return;
    }
    const vert = `attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*0.5+0.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
    const frag = `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform float uSpeed;uniform float uScale;uniform float uRotation;uniform float uNoiseIntensity;uniform vec2 uResolution;const float e=2.71828182845904523536;float noise(vec2 t){float G=e;vec2 r=(G*sin(G*t));return fract(r.x*r.y*(1.0+t.x));}vec2 rotateUvs(vec2 uv,float angle){float c=cos(angle);float s=sin(angle);mat2 rot=mat2(c,-s,s,c);return rot*uv;}void main(){float rnd=noise(gl_FragCoord.xy);vec2 uv=vUv;float aspect=uResolution.x/max(uResolution.y,1.0);uv.x=(uv.x-0.5)*aspect+0.5;uv=rotateUvs(uv*uScale,uRotation);vec2 tex=uv*uScale;float tOffset=uSpeed*uTime*0.12;tex.y+=0.03*sin(8.0*tex.x-tOffset);float pattern=0.6+0.4*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*tOffset)+sin(20.0*(tex.x+tex.y-0.1*tOffset)));vec4 col=vec4(uColor,1.0)*vec4(pattern)-rnd/15.0*uNoiseIntensity;col.a=1.0;gl_FragColor=col;}`;

    const makeShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      time: gl.getUniformLocation(prog, 'uTime'),
      color: gl.getUniformLocation(prog, 'uColor'),
      speed: gl.getUniformLocation(prog, 'uSpeed'),
      scale: gl.getUniformLocation(prog, 'uScale'),
      rotation: gl.getUniformLocation(prog, 'uRotation'),
      noiseIntensity: gl.getUniformLocation(prog, 'uNoiseIntensity'),
      resolution: gl.getUniformLocation(prog, 'uResolution'),
    };

    // Light blue-white silk (like the hero-financial sky feel but animated)
    gl.uniform3f(u.color, 0.88, 0.93, 1.0);   // #E0EDFF — light blue-white
    gl.uniform1f(u.speed, 3.5);
    gl.uniform1f(u.scale, 1.2);
    gl.uniform1f(u.rotation, 0);
    gl.uniform1f(u.noiseIntensity, 1.2);

    let start = performance.now();
    let raf;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.resolution, w, h);
      }
    };
    const render = (now) => {
      resize();
      gl.uniform1f(u.time, (now - start) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    window.addEventListener('resize', resize, { passive: true });
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);
}

/* ── GlassButton — button #2 from preview(2).html ─────────── */
function GlassButton({ children, onClick, style = {} }) {
  return (
    <div className="lnd-glass-btn-wrap" style={style}>
      <button className="lnd-glass-btn" onClick={onClick} type="button">
        <span className="lnd-glass-btn-text">
          {children}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </span>
      </button>
      <div className="lnd-glass-btn-shadow" />
    </div>
  );
}

/* ── Features ─────────────────────────────────────────────── */
const features = [
  { icon: <ShoppingCart size={20}/>, color: '#3B82F6', bg: '#EFF6FF', label: 'KASSA TIZIMI',   heading: "Kassani to'liq nazorat qiling.",   body: "Mahsulot skanerlash, to'lov qabul qilish, chek chiqarish — hammasi bir ekranda. Naqd, karta va aralash to'lovlar." },
  { icon: <Package size={20}/>,      color: '#10B981', bg: '#ECFDF5', label: 'OMBOR & INVENTAR', heading: 'Tovar har doim nazoratda.',          body: "Kirim-chiqim, qoldiqlar, minimal zaxira ogohlantirishlari va omborlararo transfer. Inventarizatsiya daqiqalarda." },
  { icon: <Users size={20}/>,        color: '#F59E0B', bg: '#FEF3C7', label: 'MIJOZLAR CRM',    heading: "Mijozlarni yaxshiroq tushining.",    body: "Bonus tizimi, nasiya hisobi, xarid tarixi. Har bir mijoz haqida to'liq ma'lumot bir joyda." },
  { icon: <BarChart2 size={20}/>,    color: '#8B5CF6', bg: '#F5F3FF', label: 'HISOBOTLAR',      heading: 'Raqamlarda haqiqat bor.',           body: "Kunlik, oylik va davriy hisobotlar. Foyda-zarar, eng ko'p sotiladigan tovarlar, kassa balansi — vizual va aniq." },
];

/* ══ MAIN ════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isElectron = window.electronAPI?.isElectron;

  return (
    <div style={{
      background: '#f7f9fc',
      color: '#1e293b',
      minHeight: '100vh',
      fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
      overflowX: 'hidden',
    }}>
      <TitleBar transparent hideLogo />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(59,130,246,.15); }

        /* ── @property for glass button gradient angle ── */
        @property --angle-1 {
          syntax: "<angle>"; inherits: false; initial-value: -75deg;
        }
        @property --angle-2 {
          syntax: "<angle>"; inherits: false; initial-value: -45deg;
        }

        /* ── Sky photo background ── */
        .sky-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url('https://images.unsplash.com/photo-1597200381847-30ec200eeb9a?q=80&w=1600&auto=format&fit=crop');
          background-size: cover; background-position: center;
          opacity: 0.5;
        }
        /* Sky tint overlay */
        .sky-tint {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(180deg, rgba(219,234,254,.55) 0%, rgba(241,245,249,.3) 60%, rgba(247,249,252,.8) 100%);
        }

        /* ── Nav ── */
        .fin-nav-link {
          color: #64748B; text-decoration: none; font-size: 14px; font-weight: 500;
          transition: color .2s; background: none; border: none; cursor: pointer;
          font-family: inherit; letter-spacing: -.1px;
        }
        .fin-nav-link:hover { color: #3b82f6; }

        /* ── Glass Button #2 (from preview(2).html) ─────────────────── */
        .lnd-glass-btn-wrap {
          position: relative; z-index: 2; border-radius: 999vw;
          background: transparent; pointer-events: none;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
          font-size: 16px; display: inline-block;
        }
        .lnd-glass-btn-wrap:has(.lnd-glass-btn:active) {
          transform: rotate3d(1, 0, 0, 25deg);
        }
        .lnd-glass-btn-shadow {
          --shadow-cuttoff-fix: 2em;
          position: absolute;
          width: calc(100% + var(--shadow-cuttoff-fix));
          height: calc(100% + var(--shadow-cuttoff-fix));
          top: calc(0% - var(--shadow-cuttoff-fix) / 2);
          left: calc(0% - var(--shadow-cuttoff-fix) / 2);
          filter: blur(clamp(2px, 0.125em, 12px));
          overflow: visible; pointer-events: none; border-radius: 999vw;
        }
        .lnd-glass-btn-shadow::after {
          content: ""; position: absolute; z-index: 0; inset: 0; border-radius: 999vw;
          background: linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.11));
          width: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          height: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          left: calc(var(--shadow-cuttoff-fix) - 0.875em);
          padding: 0.125em; box-sizing: border-box;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
          overflow: visible; opacity: 1;
        }
        .lnd-glass-btn {
          --border-width: clamp(1px, 0.0625em, 4px);
          all: unset; cursor: pointer; position: relative;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          pointer-events: auto; z-index: 3;
          background: linear-gradient(-75deg, rgba(255,255,255,.08), rgba(255,255,255,.28), rgba(255,255,255,.08));
          border-radius: 999vw;
          box-shadow:
            inset 0 0.125em 0.125em rgba(0,0,0,.05),
            inset 0 -0.125em 0.125em rgba(255,255,255,.50),
            0 0.25em 0.125em -0.125em rgba(0,0,0,.20),
            0 0 0.1em 0.25em inset rgba(255,255,255,.20),
            0 0 0 0 rgba(255,255,255,1);
          backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          -webkit-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
        }
        .lnd-glass-btn:hover {
          transform: scale(0.975);
          backdrop-filter: blur(0.01em);
          -webkit-backdrop-filter: blur(0.01em);
          box-shadow:
            inset 0 0.125em 0.125em rgba(0,0,0,.05),
            inset 0 -0.125em 0.125em rgba(255,255,255,.50),
            0 0.15em 0.05em -0.1em rgba(0,0,0,.25),
            0 0 0.05em 0.1em inset rgba(255,255,255,.50),
            0 0 0 0 rgba(255,255,255,1);
        }
        .lnd-glass-btn-text {
          position: relative; display: flex; align-items: center;
          justify-content: center; gap: 0.5em;
          user-select: none; -webkit-user-select: none;
          font-family: Inter, ui-sans-serif, sans-serif;
          letter-spacing: -0.04em; font-weight: 600; font-size: 1em; line-height: 1;
          color: #000;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
          padding-inline: 1.6em; padding-block: 0.9em; min-height: 48px;
        }
        .lnd-glass-btn-text::after {
          content: ""; display: block; position: absolute; z-index: 1;
          width: calc(100% - var(--border-width));
          height: calc(100% - var(--border-width));
          top: calc(0% + var(--border-width) / 2);
          left: calc(0% + var(--border-width) / 2);
          box-sizing: border-box; border-radius: 999vw; overflow: clip;
          background: linear-gradient(var(--angle-2), rgba(255,255,255,0) 0%, rgba(255,255,255,.50) 40% 50%, rgba(255,255,255,0) 55%);
          mix-blend-mode: screen; pointer-events: none;
          background-size: 200% 200%; background-position: 0% 50%; background-repeat: no-repeat;
          transition: background-position 500ms cubic-bezier(0.25, 1, 0.5, 1), --angle-2 500ms cubic-bezier(0.25, 1, 0.5, 1);
        }
        .lnd-glass-btn:hover .lnd-glass-btn-text::after { background-position: 25% 50%; }
        .lnd-glass-btn:active .lnd-glass-btn-text::after { background-position: 50% 15%; --angle-2: -15deg; }
        .lnd-glass-btn::after {
          content: ""; position: absolute; z-index: 1; inset: 0; border-radius: 999vw;
          width: calc(100% + var(--border-width)); height: calc(100% + var(--border-width));
          top: calc(0% - var(--border-width) / 2); left: calc(0% - var(--border-width) / 2);
          padding: var(--border-width); box-sizing: border-box;
          background:
            conic-gradient(from var(--angle-1) at 50% 50%, rgba(255,255,255,.78), rgba(255,255,255,.05) 5% 40%, rgba(255,255,255,.72) 50%, rgba(255,255,255,.05) 60% 95%, rgba(255,255,255,.78)),
            linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,255,255,.22));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1), --angle-1 500ms ease;
          box-shadow: inset 0 0 0 calc(var(--border-width) / 2) rgba(255,255,255,.50);
          pointer-events: none;
        }
        .lnd-glass-btn:hover::after { --angle-1: -125deg; }
        .lnd-glass-btn:active::after { --angle-1: -75deg; }
        .lnd-glass-btn-wrap:has(.lnd-glass-btn:hover) .lnd-glass-btn-shadow {
          filter: blur(clamp(2px, 0.0625em, 6px)); -webkit-filter: blur(clamp(2px, 0.0625em, 6px));
          transition: filter 400ms cubic-bezier(0.25, 1, 0.5, 1);
        }
        .lnd-glass-btn-wrap:has(.lnd-glass-btn:hover) .lnd-glass-btn-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.875em); opacity: 1;
        }
        .lnd-glass-btn-wrap:has(.lnd-glass-btn:active) .lnd-glass-btn { 
          box-shadow:
            inset 0 0.125em 0.125em rgba(0,0,0,.05),
            inset 0 -0.125em 0.125em rgba(255,255,255,.50),
            0 0.125em 0.125em -0.125em rgba(0,0,0,.20),
            0 0 0.1em 0.25em inset rgba(255,255,255,.20),
            0 0.225em 0.05em 0 rgba(0,0,0,.05),
            0 0.25em 0 0 rgba(255,255,255,.75),
            inset 0 0.25em 0.05em 0 rgba(0,0,0,.15);
        }

        /* ── Navbar glass (GlassButton #2 style) ── */
        .nav-glass-wrap {
          position: relative; z-index: 2; border-radius: 999vw;
          background: transparent; pointer-events: none;
          font-size: 14px; display: block;
        }
        .nav-glass-wrap .nav-glass-shadow {
          --shadow-cuttoff-fix: 2em;
          position: absolute;
          width: calc(100% + var(--shadow-cuttoff-fix));
          height: calc(100% + var(--shadow-cuttoff-fix));
          top: calc(0% - var(--shadow-cuttoff-fix) / 2);
          left: calc(0% - var(--shadow-cuttoff-fix) / 2);
          filter: blur(clamp(2px, 0.125em, 12px));
          overflow: visible; pointer-events: none; border-radius: 999vw;
        }
        .nav-glass-wrap .nav-glass-shadow::after {
          content: ""; position: absolute; z-index: 0; inset: 0; border-radius: 999vw;
          background: linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15));
          width: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          height: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
          top: calc(var(--shadow-cuttoff-fix) - 0.5em);
          left: calc(var(--shadow-cuttoff-fix) - 0.875em);
          padding: 0.125em; box-sizing: border-box;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          overflow: visible; opacity: 1;
        }
        .nav-glass-inner {
          --border-width: 4px;
          pointer-events: auto;
          position: relative;
          background: linear-gradient(-75deg, rgba(255,255,255,.15), rgba(255,255,255,.35), rgba(255,255,255,.15));
          border-radius: 999vw;
          box-shadow:
            inset 0 0.125em 0.125em rgba(0,0,0,.04),
            inset 0 -0.125em 0.125em rgba(255,255,255,.45),
            0 0.25em 0.125em -0.125em rgba(0,0,0,.25),
            0 0 0.2em 0.35em inset rgba(255,255,255,.2);
          backdrop-filter: blur(clamp(8px, 1em, 24px));
          -webkit-backdrop-filter: blur(clamp(8px, 1em, 24px));
          padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
          z-index: 3;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1);
        }
        .nav-glass-inner::after {
          content: ""; position: absolute; z-index: 1; inset: 0; border-radius: 999vw;
          width: calc(100% + var(--border-width)); height: calc(100% + var(--border-width));
          top: calc(0% - var(--border-width) / 2); left: calc(0% - var(--border-width) / 2);
          padding: var(--border-width); box-sizing: border-box;
          background:
            conic-gradient(from var(--angle-1) at 50% 50%, rgba(255,255,255,.75), rgba(255,255,255,.04) 5% 40%, rgba(255,255,255,.68) 50%, rgba(255,255,255,.04) 60% 95%, rgba(255,255,255,.75)),
            linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.20));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          box-shadow: inset 0 0 0 calc(var(--border-width) / 2) rgba(255,255,255,.45);
          pointer-events: none;
          transition: all 400ms cubic-bezier(0.25, 1, 0.5, 1), --angle-1 500ms ease;
        }
        .nav-glass-inner .fin-nav-link { color: #000; font-weight: 600; padding: 4px 8px; border-radius: 8px; transition: all .2s; }
        .nav-glass-inner .fin-nav-link:hover { color: #000; background: rgba(0,0,0,.05); }
        .nav-glass-wrap:hover .nav-glass-shadow {
          filter: blur(clamp(4px, 0.125em, 8px)); -webkit-filter: blur(clamp(4px, 0.125em, 8px));
        }
        .nav-glass-wrap:hover .nav-glass-shadow::after {
          top: calc(var(--shadow-cuttoff-fix) - 0.7em); opacity: 1;
        }
        .nav-glass-wrap:hover .nav-glass-inner::after { 
          --angle-1: -125deg; 
        }

        /* Feature cards */
        .fin-feat-card {
          background: rgba(255,255,255,.85); border: 1.5px solid rgba(255,255,255,.9);
          border-radius: 20px; padding: 28px 26px;
          transition: all .25s; box-shadow: 0 2px 12px rgba(0,0,0,.05);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .fin-feat-card:hover {
          border-color: #bfdbfe; transform: translateY(-4px);
          box-shadow: 0 12px 32px -8px rgba(59,130,246,.18);
        }

        /* Mockup float anim */
        @keyframes dashFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .fin-feat-grid { grid-template-columns: 1fr !important; }
          .fin-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .fin-about-grid { grid-template-columns: 1fr !important; }
          .fin-nav-links { display: none !important; }
          .fin-h1 { font-size: clamp(38px, 9vw, 60px) !important; letter-spacing: -2px !important; }
        }
      `}</style>

      {/* ══ SKY PHOTO BACKGROUND (Unsplash) ══════════════════ */}
      <div className="sky-bg" aria-hidden="true" />
      <div className="sky-tint" aria-hidden="true" />

      {/* ══ HERO SECTION ══════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 1,
      }}>
        {/* SVG diagonal streaks (hero-financial.tsx exact SVG) */}
        <svg width="358" height="483" viewBox="0 0 358 483" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="f0" x="-137.641" y="-120.646" width="440.285" height="602.787" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="32" result="effect1_foregroundBlur_0_1"/>
            </filter>
            <filter id="f1" x="-71.707" y="-215.486" width="429.598" height="599.69" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="32" result="effect1_foregroundBlur_0_1"/>
            </filter>
            <linearGradient id="g0" x1="-50.9961" y1="-33.114" x2="-50.9961" y2="507.886" gradientUnits="userSpaceOnUse">
              <stop stopColor="#91bbfb"/><stop offset="1" stopColor="#E6F1FF"/>
            </linearGradient>
            <linearGradient id="g1" x1="8.04686" y1="-135.113" x2="8.04686" y2="405.887" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8dbafd"/><stop offset="1" stopColor="#c1d9f8"/>
            </linearGradient>
          </defs>
          <g filter="url(#f0)">
            <rect x="-86.9961" y="-33.114" width="72" height="541" rx="36" transform="rotate(-30.8182 -86.9961 -33.114)" fill="url(#g0)"/>
          </g>
          <g filter="url(#f1)">
            <rect x="-17" y="-135.113" width="50.0937" height="541" rx="25.0469" transform="rotate(-30.8182 -17 -135.113)" fill="url(#g1)"/>
          </g>
        </svg>

        {/* Top blue gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '600px', zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(219,234,254,.85) 0%, rgba(191,219,254,.6) 40%, transparent 100%)',
        }} />

        {/* NAV SPACER */}
        <div style={{ height: isElectron ? 40 : 20, flexShrink: 0, zIndex: 2 }} />

        {/* ── GLASSMORPHISM NAV — GlassButton #2 style ─────── */}
        <header style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1200, margin: '16px auto 0', padding: '0 24px' }}>
          <TimelineAnim delay={0}>
            <div className="nav-glass-wrap">
              <div className="nav-glass-shadow" />
              <div className="nav-glass-inner">
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 4 }}>
                  <div style={{ filter: 'drop-shadow(0 3px 6px rgba(59,130,246,.4))' }}>
                    <div style={{ width: 30, height: 30, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}>
                      <BarChart2 size={13} color="#fff"/>
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#000', letterSpacing: '-.3px' }}>{APP_NAME}</span>
                </div>
                {/* Nav links */}
                <nav className="fin-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32, position: 'relative', zIndex: 4, paddingRight: 10 }}>
                  <button className="fin-nav-link" style={{ fontSize: 13.5 }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Xususiyatlar</button>
                  <button className="fin-nav-link" style={{ fontSize: 13.5 }} onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>Biz haqimizda</button>
                  <button className="fin-nav-link" style={{ fontSize: 13.5 }} onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}>Narxlar</button>
                </nav>
              </div>
            </div>
          </TimelineAnim>
        </header>

        {/* ── HERO TEXT CENTER ────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '52px 24px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>

          {/* H1 — large & bold, hero-financial style */}
          <TimelineAnim delay={100}>
            <h1 className="fin-h1" style={{
              fontSize: 'clamp(40px, 6vw, 76px)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-3.5px',
              color: '#0f172a',
              maxWidth: 1200,
            }}>
              Do'koningiz uchun <span style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>zamonaviy</span><br/>
              <span style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>tizim</span> — hammasi bir joyda.
            </h1>
          </TimelineAnim>

          {/* Subtitle — medium weight */}
          <TimelineAnim delay={250}>
            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 500,
              lineHeight: 1.65,
              color: '#334155',
              maxWidth: 600,
              letterSpacing: '-.1px',
            }}>
              {APP_NAME} — kassa, ombor, mijozlar va moliyaviy hisobotlarni bitta zamonaviy POS & ERP tizimida birlashtirgan platforma. Biznesingizni real vaqtda kuzating, xarajatlarni kamaytiring va daromadingizni oshiring.
            </p>
          </TimelineAnim>

          {/* Glass Button (button #2 from preview(2).html) */}
          <TimelineAnim delay={400}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <GlassButton onClick={() => navigate('/login')} style={{ fontSize: 17 }}>
                Bepul boshlash
              </GlassButton>
            </div>
          </TimelineAnim>
        </div>

        {/* ── DASHBOARD MOCKUP (real dashboard look) ──────────── */}
        <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10, marginTop: 40, paddingBottom: 80 }}>
          <TimelineAnim delay={550}>
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LiquidGlassCard
                glowIntensity="md"
                shadowIntensity="lg"
                borderRadius="32px"
                blurIntensity="md"
                draggable
                className="w-full"
                style={{ padding: '56px 48px' }}
              >
                <DashMockup />
              </LiquidGlassCard>
            </div>
          </TimelineAnim>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #f7f9fc, transparent)', zIndex: 5, pointerEvents: 'none' }} />
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════ */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px', position: 'relative', zIndex: 1 }}>
        <TimelineAnim delay={0}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: 'rgba(239,246,255,.9)', color: '#3b82f6', fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 16, border: '1px solid #BFDBFE', backdropFilter: 'blur(8px)' }}>Xususiyatlar</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#0f172a', lineHeight: 1.15 }}>
              Biznes uchun kerakli hamma narsa
            </h2>
            <p style={{ fontSize: 17, color: '#64748B', marginTop: 14, maxWidth: 480, margin: '14px auto 0', lineHeight: 1.65 }}>
              Kichik do'kondan katta tarmoqgacha — bir tizimda.
            </p>
          </div>
        </TimelineAnim>

        <div className="fin-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <TimelineAnim key={i} delay={i * 80}>
              <div className="fin-feat-card">
                <div style={{ width: 46, height: 46, borderRadius: 14, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: `0 4px 12px -4px ${f.color}40` }}>{f.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: f.color, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>{f.label}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-.5px', marginBottom: 12, lineHeight: 1.25 }}>{f.heading}</h3>
                <p style={{ fontSize: 14.5, color: '#64748B', lineHeight: 1.65 }}>{f.body}</p>
              </div>
            </TimelineAnim>
          ))}
        </div>
      </section>

      {/* ══ ABOUT ══════════════════════════════════════════════ */}
      <section id="about" style={{ background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(12px)', padding: '100px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          <TimelineAnim>
            <div className="fin-about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-block', background: '#FEF3C7', color: '#D97706', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 20, border: '1px solid #FDE68A' }}>Biz haqimizda</div>
                <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#0f172a', lineHeight: 1.15, marginBottom: 20 }}>
                  Savdo uchun<br/>yaratilgan tizim.
                </h2>
                <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.75, marginBottom: 20 }}>
                  {APP_NAME} — o'zbek tadbirkorlarining haqiqiy ehtiyojlari asosida yaratilgan. Kichik do'kondan tortib katta savdo tarmog'igacha samarali ishlaydi.
                </p>
                <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.75 }}>
                  Firebase bulutida saqlanadigan ma'lumotlar istalgan qurilmadan — veb-brauzer yoki Windows ilovasi orqali — bir xil ko'rinadi va sinxronlashadi.
                </p>
                <div style={{ display: 'flex', gap: 48, marginTop: 36, flexWrap: 'wrap' }}>
                  {[{ n: '10+', l: 'Modul' }, { n: '24/7', l: 'Bulutda' }, { n: '100%', l: 'Sinxron' }].map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1.5px', color: '#3b82f6' }}>{s.n}</div>
                      <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius: 22, padding: 28, boxShadow: '0 16px 48px -12px rgba(79,70,229,.4)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[{ e: '🏪', t: "Do'kon", d: 'Kassa va ombor' }, { e: '📊', t: 'Hisobot', d: 'Real vaqtda' }, { e: '👥', t: 'Mijozlar', d: 'CRM tizimi' }, { e: '🔄', t: 'Sinxron', d: 'Barcha qurilma' }].map((item, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: 16, backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: 22, marginBottom: 8 }}>{item.e}</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{item.t}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>{item.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TimelineAnim>
        </div>
      </section>

      {/* ══ CTA ════════════════════════════════════════════════ */}
      <section id="cta" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 48px', position: 'relative', zIndex: 1 }}>
        <TimelineAnim>
          <div style={{ background: 'rgba(239,246,255,.8)', border: '1.5px solid #BFDBFE', borderRadius: 24, padding: '64px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(59,130,246,.07)' }}>
            <div style={{ display: 'inline-block', background: 'rgba(239,246,255,.9)', color: '#3b82f6', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 20, border: '1px solid #BFDBFE' }}>Hoziroq boshlang</div>
            <h2 style={{ fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-2.5px', color: '#0f172a', lineHeight: 1.1, marginBottom: 20, maxWidth: 600, margin: '0 auto 20px' }}>
              Ro'yxatdan o'ting.<br/>Yuklab oling.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', marginBottom: 36, maxWidth: 440, margin: '0 auto 36px', lineHeight: 1.65 }}>
              Bepul boshlang. Hech qanday kredit karta kerak emas.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <GlassButton onClick={() => navigate('/login')} style={{ fontSize: 16 }}>
                Veb-saytda ochish
              </GlassButton>
              <a href="/downloads/Savdogar-Setup.exe" download className="fin-nav-link"
                style={{ padding: '13px 26px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.8)', border: '1.5px solid #E2E8F0', borderRadius: 12, backdropFilter: 'blur(8px)', fontWeight: 600, color: '#0f172a', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                ↓ Windows (.exe) yuklab olish
              </a>
            </div>
            <p style={{ marginTop: 20, fontSize: 12, color: '#94A3B8' }}>Windows 10/11 · 64-bit · Bepul</p>
          </div>
        </TimelineAnim>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(226,232,240,.6)', padding: '30px 48px', maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={12} color="#fff"/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{APP_NAME}</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <button className="fin-nav-link" onClick={() => navigate('/login')}>Kirish</button>
          <button className="fin-nav-link" onClick={() => navigate('/login')}>Ro'yxatdan o'tish</button>
        </div>
      </footer>
    </div>
  );
}
