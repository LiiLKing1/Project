import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const PingMeter = () => {
  const [ping, setPing] = useState(null);

  useEffect(() => {
    const checkPing = async () => {
      const start = Date.now();
      try {
        // Haqiqiy internet tezligini o'lchash uchun tashqi manbaga murojaat qilamiz (localhost emas)
        await fetch('https://www.google.com/favicon.ico?_t=' + start, { 
          mode: 'no-cors',
          cache: 'no-store'
        });
        const latency = Date.now() - start;
        setPing(latency);
      } catch (error) {
        setPing(-1);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, []);

  let color = '#22c55e'; // Green
  if (ping > 500) color = '#ef4444'; // Red
  else if (ping > 200) color = '#eab308'; // Yellow
  if (ping === -1) color = '#ef4444'; // Error

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'var(--bg-card, #ffffff)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      padding: '8px 16px',
      borderRadius: '9999px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: '600',
      border: '1px solid var(--border-color, #e5e7eb)',
      transition: 'all 0.3s ease'
    }}>
      {ping === -1 ? (
        <WifiOff size={16} color={color} />
      ) : (
        <Wifi size={16} color={color} />
      )}
      <span style={{ color: color }}>
        {ping === null ? 'O\'lchanmoqda...' : ping === -1 ? 'Aloqa yo\'q' : `${ping} ms`}
      </span>
    </div>
  );
};

export default PingMeter;
