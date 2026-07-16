import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import { Download, Upload, CloudLightning, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../../components/Modal';
import ProductImporter from '../../components/ProductImporter';

const ALL_COLLECTIONS = [
  { id: 'products', label: 'Mahsulotlar' },
  { id: 'customers', label: 'Mijozlar' },
  { id: 'sales', label: 'Sotuvlar' },
  { id: 'staff', label: 'Xodimlar' },
  { id: 'purchaseOrders', label: 'Buyurtmalar' },
  { id: 'suppliers', label: 'Yetkazib beruvchilar' },
  { id: 'categories', label: 'Kategoriyalar' },
  { id: 'customerDebts', label: 'Qarzlar tarixi' },
  { id: 'auditLogs', label: 'Audit Jurnali' }
];

const Backup = () => {
  const [loading, setLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState(ALL_COLLECTIONS.map(c => c.id));
  
  const [importFile, setImportFile] = useState(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isProductImportOpen, setIsProductImportOpen] = useState(false);

  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  const toggleCollection = (id) => {
    setSelectedCollections(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = (select) => {
    if (select) setSelectedCollections(ALL_COLLECTIONS.map(c => c.id));
    else setSelectedCollections([]);
  };

  const fetchAllData = async () => {
    const backupData = {};
    for (const col of selectedCollections) {
      try {
        const snap = await getDocs(collection(db, `users/${storeId}/${col}`));
        backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error(`Error fetching ${col}:`, err);
      }
    }
    return backupData;
  };

  const downloadJSON = (data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = (data, filename) => {
    const wb = XLSX.utils.book_new();
    
    for (const colName of Object.keys(data)) {
      const colData = data[colName];
      if (colData && colData.length > 0) {
        const flatData = colData.map(item => {
          const flat = { ...item };
          Object.keys(flat).forEach(key => {
            if (typeof flat[key] === 'object' && flat[key] !== null) {
              flat[key] = JSON.stringify(flat[key]);
            }
          });
          return flat;
        });
        const ws = XLSX.utils.json_to_sheet(flatData);
        XLSX.utils.book_append_sheet(wb, ws, colName.substring(0, 31));
      }
    }

    XLSX.writeFile(wb, filename);
  };

  const handleBackup = async (type) => {
    if (!storeId) return;
    if (selectedCollections.length === 0) {
      addToast('Kamida bitta bo\'limni tanlang', 'warning');
      return;
    }

    setLoading(true);
    addToast('Ma\'lumotlar yig\'ilmoqda, kuting...', 'info');
    
    try {
      const data = await fetchAllData();
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (type === 'json') {
        downloadJSON(data, `backup_${storeId}_${dateStr}.json`);
      } else if (type === 'excel') {
        downloadExcel(data, `backup_${storeId}_${dateStr}.xlsx`);
      }
      
      addToast('Zaxira muvaffaqiyatli saqlandi', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setIsRestoreModalOpen(true);
    }
  };

  const handleRestore = async () => {
    if (!importFile || !storeId) return;
    setIsRestoring(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          
          let totalImported = 0;
          let batch = writeBatch(db);
          let operationsCount = 0;

          for (const sheetName of wb.SheetNames) {
            const isValidCollection = ALL_COLLECTIONS.some(c => c.id === sheetName);
            if (!isValidCollection) continue;

            const ws = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws);
            
            for (const row of data) {
              const parsedRow = { ...row };
              Object.keys(parsedRow).forEach(key => {
                if (typeof parsedRow[key] === 'string' && (parsedRow[key].startsWith('{') || parsedRow[key].startsWith('['))) {
                  try {
                    parsedRow[key] = JSON.parse(parsedRow[key]);
                  } catch (e) {
                    // Ignore
                  }
                }
              });

              const docId = parsedRow.id;
              delete parsedRow.id; 
              
              const docRef = docId ? doc(db, `users/${storeId}/${sheetName}`, docId) : doc(collection(db, `users/${storeId}/${sheetName}`));
              
              batch.set(docRef, parsedRow);
              operationsCount++;
              totalImported++;

              if (operationsCount >= 490) {
                 await batch.commit();
                 batch = writeBatch(db);
                 operationsCount = 0;
              }
            }
          }
          
          if (operationsCount > 0) {
            await batch.commit();
          }

          addToast(`${totalImported} ta yozuv muvaffaqiyatli tiklandi!`, 'success');
          setIsRestoreModalOpen(false);
          setImportFile(null);
        } catch (err) {
          addToast('Faylni o\'qishda xatolik: ' + err.message, 'error');
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsBinaryString(importFile);
    } catch (err) {
      addToast(err.message, 'error');
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <h1 className="h1">Yuklanishlar (Import / Eksport)</h1>

      <div className="glass-panel flex-col" style={{ gap: '1.5rem', padding: '2rem' }}>
        
        <div>
          <h2 className="h3" style={{ marginBottom: '1rem' }}>Yuklab olinadigan bo'limlar:</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectAll(true)}>Barchasini belgilash</button>
            <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => selectAll(false)}>Hech birini belgilanmaslik</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {ALL_COLLECTIONS.map(col => (
              <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={selectedCollections.includes(col.id)} 
                  onChange={() => toggleCollection(col.id)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontWeight: 500 }}>{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
            <FileJson size={48} color="var(--primary)" />
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>JSON format</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To'liq baza (Dasturchilar uchun)</p>
            </div>
            <button className="btn btn-primary" onClick={() => handleBackup('json')} disabled={loading}>
              <Download size={18} /> Yuklab olish
            </button>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
            <FileSpreadsheet size={48} color="var(--success)" />
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>Excel format</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Odam o'qishi va tahlil qilishi uchun (.xlsx)</p>
            </div>
            <button className="btn btn-primary" onClick={() => handleBackup('excel')} disabled={loading}>
              <Download size={18} /> Yuklab olish
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Upload size={24} color="var(--warning)" />
              <h3 style={{ margin: 0, color: 'var(--warning)' }}>Zaxiradan tiklash (Restore)</h3>
            </div>
            <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-secondary)' }}>
              Oldin yuklab olingan zaxira (.xlsx) faylini yuklash orqali ma'lumotlarni tiklashingiz mumkin. Tizimdagi bor ma'lumotlar ustidan yoziladi.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label className="btn btn-outline" style={{ borderColor: 'var(--warning)', color: 'var(--warning)', cursor: 'pointer' }}>
                <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileChange} />
                Excel orqali tiklash
              </label>
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FileSpreadsheet size={24} color="var(--success)" />
              <h3 style={{ margin: 0, color: 'var(--success)' }}>Mahsulotlarni Yuklash</h3>
            </div>
            <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-secondary)' }}>
              Yangi mahsulotlarni shablon orqali ommaviy yuklash imkoniyati.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: 'auto' }}>
              <button className="btn btn-outline" style={{ borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => setIsProductImportOpen(true)}>
                Mahsulot importi
              </button>
            </div>
          </div>
        </div>

      </div>

      <Modal isOpen={isRestoreModalOpen} onClose={() => { setIsRestoreModalOpen(false); setImportFile(null); }} title="Diqqat! Xavfli operatsiya">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--danger)', backgroundColor: 'var(--danger-light)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={32} style={{ minWidth: '32px' }} />
            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>Siz <strong>{importFile?.name}</strong> fayli orqali ma'lumotlarni qayta tiklamoqchisiz. Bu amaliyot mavjud ma'lumotlarning ustidan yozadi va uni ortga qaytarib bo'lmaydi. Rozimisiz?</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => { setIsRestoreModalOpen(false); setImportFile(null); }}>Bekor qilish</button>
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? 'Tiklanmoqda...' : 'Ha, roziman'}
            </button>
          </div>
        </div>
      </Modal>

      <ProductImporter isOpen={isProductImportOpen} onClose={() => setIsProductImportOpen(false)} />

    </div>
  );
};

export default Backup;
