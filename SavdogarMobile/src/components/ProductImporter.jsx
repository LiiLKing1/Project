import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { writeBatch, doc, collection, getDocs, query } from '../services/firebaseMock';
import { useRoles } from '../context/RolesContext';
import { useToast } from '../context/ToastContext';
import { useWarehouse } from '../context/WarehouseContext';
import Drawer from './Drawer';

const ProductImporter = ({ isOpen, onClose }) => {
  const [importData, setImportData] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, new: 0, update: 0, error: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [importHistory, setImportHistory] = useState([]);

  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (isOpen && storeId) {
      // Fetch current products and categories when opened to validate barcodes and categories
      const fetchData = async () => {
        try {
          const prodSnap = await getDocs(collection(db, `users/${storeId}/products`));
          setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          const catSnap = await getDocs(collection(db, `users/${storeId}/categories`));
          setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          const historySnap = await getDocs(query(collection(db, `users/${storeId}/importHistory`)));
          const historyData = historySnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setImportHistory(historyData);
        } catch (err) {
          console.error("Error fetching data for import", err);
        }
      };
      fetchData();
    } else {
      setImportData([]);
      setImportStats({ total: 0, new: 0, update: 0, error: 0 });
    }
  }, [isOpen, storeId]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Shtrix-kod', 'Nomi', 'Kategoriya', 'O\'lchov birligi', 'Tannarx', 'Sotish narxi', 'Qoldiq', 'Minimal qoldiq']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shablon");
    XLSX.writeFile(wb, `shablon_mahsulotlar.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let newCount = 0;
      let updateCount = 0;
      let errCount = 0;
      
      const parsedData = data.map((row) => {
        let status = 'success';
        let reason = '';
        
        const barcode = row['Shtrix-kod'] ? String(row['Shtrix-kod']) : '';
        const name = row['Nomi'] ? String(row['Nomi']) : '';
        const categoryName = row['Kategoriya'] ? String(row['Kategoriya']) : 'Boshqa';
        const costPrice = Number(row['Tannarx']);
        const sellPrice = Number(row['Sotish narxi']);
        
        if (!name.trim()) { status = 'error'; reason = 'Nomi kiritilmagan'; }
        else if (isNaN(costPrice) || costPrice < 0) { status = 'error'; reason = 'Tannarx noto\'g\'ri'; }
        else if (isNaN(sellPrice) || sellPrice < 0) { status = 'error'; reason = 'Sotish narxi noto\'g\'ri'; }
        
        let isUpdate = false;
        if (status !== 'error') {
          if (barcode) {
            isUpdate = products.some(p => p.barcode === barcode);
          }
          if (isUpdate) {
            status = 'warning'; reason = 'Shtrix-kod mavjud, yangilanadi';
            updateCount++;
          } else {
            newCount++;
          }
        } else {
          errCount++;
        }
        
        return {
          originalRow: row,
          parsed: {
            barcode, name, categoryName, 
            unit: row['O\'lchov birligi'] || 'dona', 
            costPrice: costPrice || 0, 
            sellPrice: sellPrice || 0, 
            stock: Number(row['Qoldiq']) || 0, 
            minStock: Number(row['Minimal qoldiq']) || 5
          },
          status, reason
        };
      });
      
      setImportData(parsedData);
      setImportStats({ total: data.length, new: newCount, update: updateCount, error: errCount });
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleConfirmImport = async () => {
    if (!storeId || isImporting) return;
    setIsImporting(true);
    
    try {
      const batch = writeBatch(db);
      const validRows = importData.filter(d => d.status !== 'error');
      
      const categoryMap = {};
      categories.forEach(c => { categoryMap[c.name.toLowerCase().trim()] = c.id; });
      
      for (const row of validRows) {
        const { parsed, status } = row;
        
        let catId = categoryMap[parsed.categoryName.toLowerCase().trim()];
        if (!catId) {
          const newCatRef = doc(collection(db, `users/${storeId}/categories`));
          batch.set(newCatRef, { name: parsed.categoryName, createdAt: new Date().toISOString() });
          catId = newCatRef.id;
          categoryMap[parsed.categoryName.toLowerCase().trim()] = catId;
        }
        
        let barcode = parsed.barcode;
        if (!barcode) {
          barcode = '200' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        }
        
        const payload = {
          name: parsed.name,
          barcode: barcode,
          categoryId: catId,
          unit: parsed.unit,
          costPrice: parsed.costPrice,
          sellPrice: parsed.sellPrice,
          minStock: parsed.minStock,
          status: 'active'
        };
        
        if (status === 'warning') {
          const existingProd = products.find(p => p.barcode === barcode);
          if (existingProd) {
            batch.update(doc(db, `users/${storeId}/products`, existingProd.id), {
               ...payload, 
               [`stockByWarehouse.${selectedWarehouseId}`]: parsed.stock,
               updatedAt: new Date().toISOString()
            });
          }
        } else {
          const newProdRef = doc(collection(db, `users/${storeId}/products`));
          batch.set(newProdRef, {
             ...payload, 
             stockByWarehouse: { [selectedWarehouseId]: parsed.stock },
             createdAt: new Date().toISOString()
          });
        }
      }
      
      const newHistoryRef = doc(collection(db, `users/${storeId}/importHistory`));
      batch.set(newHistoryRef, {
        createdAt: new Date().toISOString(),
        userName: userProfile?.name || 'Kassir',
        stats: importStats
      });
      
      await batch.commit();
      addToast(`${validRows.length} ta mahsulot muvaffaqiyatli import qilindi!`, 'success');
      
      if (importStats.error > 0) {
        const errorRows = importData.filter(d => d.status === 'error').map(d => ({
          ...d.originalRow,
          'Xatolik Sababi': d.reason
        }));
        const ws = XLSX.utils.json_to_sheet(errorRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Xatolar");
        XLSX.writeFile(wb, `import_xatolar_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Drawer position="right" isOpen={isOpen} onClose={onClose} title="Excel'dan mahsulotlarni yuklash" width="500px">
      <div className="flex-col" style={{ gap: '1.5rem', padding: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--primary-light)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>1. Shablonni yuklab oling</h3>
          <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-secondary)' }}>
            To'g'ri formatdagi Excel faylni yuklash uchun quyidagi namunaviy shablonni ko'chirib oling va ichini to'ldiring.
          </p>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={downloadTemplate}>
            <Download size={18} /> Namuna shablonni yuklab olish
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>2. Faylni yuklang</h3>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <FileSpreadsheet size={32} style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 500 }}>Faylni tanlash (.xlsx, .xls)</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {importHistory.length > 0 && importData.length === 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Import tarixi</h3>
            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Sana</th>
                    <th style={{ padding: '0.75rem' }}>Xodim</th>
                    <th style={{ padding: '0.75rem' }}>Jami</th>
                    <th style={{ padding: '0.75rem' }}>Yangi</th>
                    <th style={{ padding: '0.75rem' }}>Yangilangan</th>
                    <th style={{ padding: '0.75rem' }}>Xatolar</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(h.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{h.userName}</td>
                      <td style={{ padding: '0.75rem' }}>{h.stats.total}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--success)' }}>{h.stats.new}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--warning)' }}>{h.stats.update}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--danger)' }}>{h.stats.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importData.length > 0 && (
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Oldindan ko'rish (Preview)</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <span>Jami: <b>{importStats.total}</b></span>
              <span style={{ color: 'var(--success)' }}>Yangi: <b>{importStats.new}</b></span>
              <span style={{ color: 'var(--warning)' }}>Yangilanadi: <b>{importStats.update}</b></span>
              <span style={{ color: 'var(--danger)' }}>Xato: <b>{importStats.error}</b></span>
            </div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-main)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Holat</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Shtrix-kod</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nomi</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Sabab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {row.status === 'success' && <CheckCircle2 size={16} color="var(--success)" />}
                          {row.status === 'warning' && <AlertTriangle size={16} color="var(--warning)" />}
                          {row.status === 'error' && <XCircle size={16} color="var(--danger)" />}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{row.parsed.barcode}</td>
                        <td style={{ padding: '0.5rem' }}>{row.parsed.name}</td>
                        <td style={{ padding: '0.5rem', color: row.status === 'error' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          {row.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setImportData([])}>Tozalash</button>
              <button className="btn btn-primary" onClick={handleConfirmImport} disabled={isImporting || (importStats.new === 0 && importStats.update === 0)}>
                {isImporting ? 'Yuklanmoqda...' : 'Importni tasdiqlash'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default ProductImporter;
