import React from 'react';

/* DashMockup — faqat orqa fon ko'rinishi (browser mockup shell) */
export default function DashMockup() {
  return (
    <div style={{
      width: '100%',
      borderRadius: 24,
      overflow: 'hidden',
      background: '#f1f5f9',
      minHeight: 540,
      position: 'relative',
      boxShadow: '0 40px 100px -20px rgba(74,144,226,0.18)',
    }}>
      {/* Browser chrome bar */}
      <div style={{
        height: 44,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
        </div>
        {/* URL bar */}
        <div style={{
          flex: 1,
          maxWidth: 420,
          margin: '0 auto',
          height: 26,
          background: 'rgba(241,245,249,0.9)',
          borderRadius: 8,
          border: '1px solid rgba(226,232,240,0.9)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
          gap: 6,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', letterSpacing: 0 }}>app.savdogar.uz/dashboard</span>
        </div>
      </div>

      {/* App background — gradient canvas */}
      <div style={{
        width: '100%',
        minHeight: 500,
        background: 'linear-gradient(135deg, #e8f0fe 0%, #f1f5ff 30%, #eef2ff 60%, #f8fafc 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
      }}>
        {/* Sidebar strip */}
        <div style={{
          width: 220,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(226,232,240,0.6)',
          flexShrink: 0,
        }} />

        {/* Main area */}
        <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top header strip */}
          <div style={{
            height: 40,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 12,
            backdropFilter: 'blur(8px)',
          }} />

          {/* Purple banner strip */}
          <div style={{
            height: 130,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
            opacity: 0.9,
          }} />

          {/* Two chart cards */}
          <div style={{ display: 'flex', gap: 16, flex: 1 }}>
            <div style={{
              flex: 2,
              background: 'rgba(255,255,255,0.65)',
              borderRadius: 20,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.8)',
              minHeight: 200,
            }} />
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.65)',
              borderRadius: 20,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.8)',
            }} />
          </div>

          {/* Bottom table strip */}
          <div style={{
            height: 80,
            background: 'rgba(255,255,255,0.65)',
            borderRadius: 20,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.8)',
          }} />
        </div>

        {/* Ambient light blobs */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: 100,
          width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}
