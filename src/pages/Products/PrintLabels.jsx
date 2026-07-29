import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { Printer } from 'lucide-react';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const PrintLabels = ({ products, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const windowPrint = window.open('', '', 'width=800,height=600');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Yorliqlar</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; padding: 0; }
            }
            body { font-family: sans-serif; }
            .label-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, 40mm);
              gap: 5mm;
              justify-content: center;
            }
            .label-item {
              width: 40mm;
              border: 1px solid #ccc;
              padding: 2mm;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .product-name {
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              margin-bottom: 2mm;
            }
            .product-price {
              font-size: 12px;
              font-weight: bold;
              margin-top: 1mm;
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${printContent}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{products.length} ta mahsulot tanlandi.</p>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={18} style={{ marginRight: '0.5rem' }} /> Chop etish
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
        <div ref={printRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          {products.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="label-item" style={{ 
              width: '40mm', border: '1px solid #ccc', padding: '2mm', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
              <div className="product-name" style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', marginBottom: '2mm' }}>
                {p.name}
              </div>
              {p.barcode ? (
                <Barcode value={p.barcode} width={1.2} height={40} fontSize={10} margin={0} />
              ) : (
                <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>Shtrix-kod yo'q</div>
              )}
              <div className="product-price" style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '1mm' }}>
                {new Intl.NumberFormat('uz-UZ').format(p.sellPrice)} UZS
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrintLabels;
