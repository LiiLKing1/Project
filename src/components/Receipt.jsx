import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc } from '../services/firebaseMock';
import { db } from '../firebase';
import CurrencyDisplay from './CurrencyDisplay';
import { APP_NAME } from '../config/appConfig';

const PAYMENT_LABELS = {
  cash: 'Naqd',
  card: 'Karta',
  mixed: 'Aralash',
  debt: 'Nasiya',
};

const Receipt = ({ sale, storeId }) => {
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    if (storeId) {
      getDoc(doc(db, `users/${storeId}/settings/storeInfo`)).then(snap => {
        if (snap.exists() && snap.data().storeName) setStoreName(snap.data().storeName);
      }).catch(() => {});
    }
  }, [storeId]);

  if (!sale) return null;

  const receiptUrl = `${window.location.origin}/receipt/${storeId}/${sale.id || sale.saleNumber}`;
  const date = new Date(sale.createdAt).toLocaleString('uz-UZ', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{
      width: '100%',
      maxWidth: '340px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: "'Courier New', monospace",
      color: '#1A2538',
    }}>
      {/* Header gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Poppins, sans-serif' }}>
            {storeName || APP_NAME}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, fontFamily: 'monospace' }}>
            {sale.saleNumber ? `#${sale.saleNumber}` : '#PREVIEW'} · {date}
          </div>
        </div>
        {/* 2 extra long horizontal sweeping waves Edge to Edge 100% full width */}
        <svg viewBox="0 0 340 32" style={{ display: 'block', marginTop: 12, marginBottom: 0, width: '100%', height: '32px' }} preserveAspectRatio="none">
          <path d="M0,16 Q42.5,-2 85,16 Q127.5,34 170,16 Q212.5,-2 255,16 Q297.5,34 340,16 L340,32 L0,32 Z" fill="#ffffff"/>
        </svg>
      </div>

      {/* Body */}
      <div style={{ padding: '4px 20px 20px' }}>
        {/* Info rows */}
        <div style={{ marginBottom: 16 }}>
          {[
            { label: 'Kassir', value: sale.cashierId },
            sale.customerName && { label: 'Xaridor', value: sale.customerName },
            { label: "To'lov turi", value: PAYMENT_LABELS[sale.paymentType] || sale.paymentType },
          ].filter(Boolean).map((row, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0', borderBottom: '1px dashed #DCE8F5',
              fontSize: 13,
            }}>
              <span style={{ color: '#8A9BB5' }}>{row.label}</span>
              <span style={{ fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{
          background: '#F7FAFF',
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 14,
        }}>
          {sale.items?.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '6px 0',
              borderBottom: i < sale.items.length - 1 ? '1px dashed #DCE8F5' : 'none',
              fontSize: 13,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontFamily: 'Poppins, sans-serif', color: '#1A2538' }}>{item.name}</div>
                <div style={{ color: '#8A9BB5', fontSize: 11 }}>
                  {item.qty} × <CurrencyDisplay amount={item.price} />
                </div>
              </div>
              <span style={{ fontWeight: 700, color: '#4A90E2' }}>
                <CurrencyDisplay amount={item.price * item.qty} />
              </span>
            </div>
          ))}
        </div>

        {/* Discounts */}
        {sale.discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: '#EF4B4B' }}>
            <span>Chegirma</span>
            <span style={{ fontWeight: 700 }}>− <CurrencyDisplay amount={sale.discountAmount} /></span>
          </div>
        )}
        {sale.usedBonusAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: '#10B981' }}>
            <span>Bonus ishlatildi</span>
            <span style={{ fontWeight: 700 }}>− <CurrencyDisplay amount={sale.usedBonusAmount} /></span>
          </div>
        )}

        {/* Total */}
        <div style={{
          background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)',
          borderRadius: 14,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          color: '#fff',
        }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 14 }}>JAMI TO'LOV</span>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 18 }}>
            <CurrencyDisplay amount={sale.finalTotal || 0} />
          </span>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: 10, background: '#fff', borderRadius: 12,
            border: '1.5px solid #DCE8F5',
            boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)',
          }}>
            <QRCodeSVG value={receiptUrl} size={90} />
          </div>
          <div style={{ fontSize: 11, color: '#8A9BB5', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.03em' }}>
            Xaridingiz uchun rahmat! 🎉
          </div>
        </div>

        {/* Bottom tear edge */}
        <div style={{ marginTop: 16, borderTop: '2px dashed #DCE8F5' }} />
      </div>
    </div>
  );
};

export default Receipt;
