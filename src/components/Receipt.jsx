import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const Receipt = ({ sale, storeId }) => {
  if (!sale) return null;

  // The QR code link
  const receiptUrl = `${window.location.origin}/receipt/${storeId}/${sale.id || sale.saleNumber}`;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#fff', color: '#000', borderRadius: '8px', width: '100%', maxWidth: '350px', margin: '0 auto', boxShadow: 'var(--shadow-sm)', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px dashed #ccc', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Do'kon: Asosiy Filial</h2>
        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Chek: {sale.saleNumber}</div>
        <div style={{ fontSize: '0.875rem' }}>Sana: {new Date(sale.createdAt).toLocaleString('uz-UZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div style={{ marginBottom: '1rem', borderBottom: '1px dashed #ccc', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Kassir:</span>
          <strong>{sale.cashierId}</strong>
        </div>
        {sale.customerName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Xaridor:</span>
            <strong>{sale.customerName}</strong>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>To'lov turi:</span>
          <strong>{sale.paymentType === 'cash' ? 'Naqd' : sale.paymentType === 'card' ? 'Karta' : sale.paymentType === 'mixed' ? 'Aralash' : 'Nasiya'}</strong>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', borderBottom: '1px dashed #ccc', paddingBottom: '1rem' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <tbody>
            {sale.items?.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingBottom: '0.5rem' }}>{item.name} <br/><small>{item.qty} x {new Intl.NumberFormat('uz-UZ').format(item.price)}</small></td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{new Intl.NumberFormat('uz-UZ').format(item.price * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        <span>JAMI TO'LOV:</span>
        <span>{new Intl.NumberFormat('uz-UZ').format(sale.total)} UZS</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <QRCodeSVG value={receiptUrl} size={120} />
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
        Xaridingiz uchun rahmat!
      </div>
    </div>
  );
};

export default Receipt;
