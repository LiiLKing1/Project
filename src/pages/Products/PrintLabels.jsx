import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import { Printer, Search, CheckSquare, Square } from 'lucide-react';
import CurrencyDisplay from '../../components/CurrencyDisplay';

const PrintLabels = ({ allProducts, initialSelected = [], onClose }) => {
  const printRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(() => {
    const set = new Set();
    initialSelected.forEach(p => set.add(p.id));
    return set;
  });
  const [search, setSearch] = useState('');

  const filteredProducts = allProducts.filter(p => {
    if (p.status === 'archived') return false;
    if (!search.trim()) return true;
    const lowerName = (p.name || '').toLowerCase();
    const term = search.toLowerCase().trim();
    return lowerName.includes(term) || (p.barcode || '').includes(term);
  });

  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    if (allSelected) {
      filteredProducts.forEach(p => newSelected.delete(p.id));
    } else {
      filteredProducts.forEach(p => newSelected.add(p.id));
    }
    setSelectedIds(newSelected);
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handlePrint = () => {
    if (selectedIds.size === 0) return;
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

  const selectedProductsToPrint = allProducts.filter(p => selectedIds.has(p.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '80vh' }}>
      
      {/* Search and Select All */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Qidirish..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>
        <button className="btn btn-outline" onClick={toggleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          {allSelected ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
        </button>
      </div>

      {/* Product List for Selection */}
      <div style={{ flex: '1 1 40%', minHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        {filteredProducts.map(p => (
          <div key={p.id} onClick={() => toggleSelect(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: selectedIds.has(p.id) ? '#F0F7FF' : '#fff' }}>
            {selectedIds.has(p.id) ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-secondary)" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Shtrix-kod: {p.barcode || 'Yo\'q'}</div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
              <CurrencyDisplay amount={p.sellPrice} isSell />
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Mahsulot topilmadi</div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Tanlangan: {selectedIds.size} ta</p>
        <button className="btn btn-primary" onClick={handlePrint} disabled={selectedIds.size === 0}>
          <Printer size={18} style={{ marginRight: '0.5rem' }} /> Chop etish
        </button>
      </div>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {selectedProductsToPrint.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="label-item">
              <div className="product-name">{p.name}</div>
              {p.barcode ? (
                <Barcode value={p.barcode} width={1.2} height={40} fontSize={10} margin={0} />
              ) : (
                <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>Shtrix-kod yo'q</div>
              )}
              <div className="product-price">{new Intl.NumberFormat('uz-UZ').format(p.sellPrice)} UZS</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrintLabels;

