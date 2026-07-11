import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useStoreId } from '../../context/useStoreId';
import { useNavigate } from 'react-router-dom';

const Import = () => {
  const { currentUser } = useAuth();
  const storeId = useStoreId();
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [columns, setColumns] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        setColumns(data[0]); // Birinchi qator sarlavhalar (headers)
        setFileData(data.slice(1).filter(row => row.length > 0)); // Qolgani data
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async () => {
    if (!fileData || !currentUser) return;
    setIsImporting(true);

    try {
      const productsRef = collection(db, `users/${storeId}/products`);
      
      // Har bir qator uchun product obyekti yaratamiz
      // Biz kutgan standart ustunlar bo'lmasligi mumkin, shuning uchun eng asosiylarini izlaymiz.
      // Misol uchun 0-ustun Name, 1-ustun Miqdor, 2-ustun Narx deb faraz qilamiz yoki nomlari bo'yicha.
      
      for (const row of fileData) {
        // Eng sodda mapping: Agar birinchi ustun nom bo'lsa
        const name = row[0] ? String(row[0]) : 'Nomsiz tovar';
        const quantity = Number(row[1]) || 0;
        const priceUz = Number(row[2]) || 0;

        await addDoc(productsRef, {
          name,
          quantity,
          priceUz,
          unit: 'Dona',
          costUz: 0,
          costUsd: 0,
          priceUsd: 0,
          supplierId: '',
          currencySettings: 'UZS',
          createdAt: serverTimestamp()
        });
      }

      alert("Muvaffaqiyatli import qilindi!");
      navigate('/products/catalog');
    } catch (error) {
      console.error("Importda xatolik:", error);
      alert("Xatolik yuz berdi");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Tovarlarni Excel orqali import qilish</h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '500px', marginBottom: '2rem' }}>
        Excel faylingizdagi birinchi qator sarlavha bo'lishi kerak. Biz 1-ustunni Nomi, 2-ustunni Miqdori, 3-ustunni Sotish narxi (UZS) deb qabul qilamiz.
      </p>

      {!fileData ? (
        <div>
          <label style={{ cursor: 'pointer', padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '500', display: 'inline-block' }}>
            Excel faylni tanlash (.xlsx)
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Fayl o'qildi: {fileData.length} ta mahsulot topildi</h3>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-hover)' }}>
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileData.slice(0, 5).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {fileData.length > 5 && <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>... va yana {fileData.length - 5} ta qator</div>}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setFileData(null)} 
              disabled={isImporting}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
            >
              Bekor qilish
            </button>
            <button 
              onClick={processImport}
              disabled={isImporting}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: '600' }}
            >
              {isImporting ? 'Import qilinmoqda...' : 'Bazaga saqlash'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
