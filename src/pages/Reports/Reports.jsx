import { dataService } from '../../services/dataService';
import React, { useState, useEffect } from 'react';
import './Reports.css';
import { BarChart3, Download, Calendar, DollarSign, ShoppingBag, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, getDocs, where } from '../../services/firebaseMock';
import { useRoles } from '../../context/RolesContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Receipt from '../../components/Receipt';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { Eye, Edit2 } from 'lucide-react';
import DateRangePicker from '../../components/DateRangePicker';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [shiftsData, setShiftsData] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const getTodayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const { userProfile } = useRoles();
  const { addToast } = useToast();
  const storeId = userProfile?.storeOwnerId;

  useEffect(() => {
    if (!storeId) return;

    const unsubShifts = onSnapshot(query(collection(db, `users/${storeId}/cashShifts`), orderBy('openedAt', 'desc')), (snapshot) => {
      setShiftsData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsub = onSnapshot(query(collection(db, `users/${storeId}/sales`), orderBy('createdAt', 'desc')), (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalesData(sales);
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, `users/${storeId}/customers`), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsub(); unsubCustomers(); unsubShifts(); };
  }, [storeId]);

  const formatMoney = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  const filteredSales = salesData.filter(sale => {
    let matchSearch = true;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const customerName = customers.find(c => c.id === sale.customerId)?.fullName?.toLowerCase() || '';
      matchSearch = (sale.saleNumber && sale.saleNumber.toLowerCase().includes(q)) ||
                    customerName.includes(q);
    }
    let matchDate = true;
    if (startDate || endDate) {
      const saleDate = new Date(sale.createdAt);
      if (startDate) {
        matchDate = matchDate && saleDate >= new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        matchDate = matchDate && saleDate <= endD;
      }
    }
    return matchSearch && matchDate;
  });

  const getMonthLabel = () => {
    if (!startDate && !endDate) return '';
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    let startD = startDate ? new Date(startDate) : new Date();
    let endD = endDate ? new Date(endDate) : new Date();
    if (startDate && !endDate) endD = new Date();
    else if (!startDate && endDate) {
      startD = new Date(endDate);
      startD.setDate(startD.getDate() - 7);
    }
    if (startD > endD) { const temp = startD; startD = endD; endD = temp; }
    
    const m1 = months[startD.getMonth()];
    const m2 = months[endD.getMonth()];
    if (m1 === m2 && startD.getFullYear() === endD.getFullYear()) return m1;
    return `${m1} > ${m2}`;
  };

  const getChartData = () => {
    if (!startDate && !endDate) {
      const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
      const result = [];
      for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push({
          name: days[d.getDay()],
          dateStr: d.toDateString(),
          savdo: 0
        });
      }
      filteredSales.forEach(sale => {
        if(!sale.createdAt) return;
        const saleDate = new Date(sale.createdAt).toDateString();
        const dayData = result.find(r => r.dateStr === saleDate);
        if (dayData) {
          dayData.savdo += sale.finalTotal || 0;
        }
      });
      return result;
    } else {
      let startD = startDate ? new Date(startDate) : new Date();
      let endD = endDate ? new Date(endDate) : new Date();
      
      if (startDate && !endDate) {
        endD = new Date();
      } else if (!startDate && endDate) {
        startD = new Date(endDate);
        startD.setDate(startD.getDate() - 7);
      }
      
      if (startD > endD) {
        const temp = startD; startD = endD; endD = temp;
      }
      
      const map = {};
      filteredSales.forEach(sale => {
        if(!sale.createdAt) return;
        const d = new Date(sale.createdAt);
        const ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (!map[ymd]) map[ymd] = 0;
        map[ymd] += sale.finalTotal || 0;
      });

      const result = [];
      let currD = new Date(startD);
      while(currD <= endD) {
        const ymd = currD.getFullYear() + '-' + String(currD.getMonth()+1).padStart(2,'0') + '-' + String(currD.getDate()).padStart(2,'0');
        result.push({
          name: String(currD.getDate()),
          savdo: map[ymd] || 0
        });
        currD.setDate(currD.getDate() + 1);
      }
      return result;
    }
  };

  const chartData = getChartData();

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + (curr.finalTotal || 0), 0);
  const totalProfit = filteredSales.reduce((acc, curr) => {
    const cost = curr.items?.reduce((c, item) => c + (item.costPrice * item.qty), 0) || 0;
    return acc + ((curr.finalTotal || 0) - cost);
  }, 0);

  const handleReturnSale = async (saleToProcess = selectedSale) => {
    if (!saleToProcess || !storeId) return false;
    setIsDeleting(true);
    try {
      const debtAmount = saleToProcess.paymentBreakdown?.find(p => p.method === 'debt')?.amount || 0;
      let debtDocsToUpdate = [];
      if (debtAmount > 0 && saleToProcess.customerId) {
        const debtsQuery = query(collection(db, `users/${storeId}/customerDebts`), where('relatedSaleId', '==', saleToProcess.id));
        const debtsSnap = await getDocs(debtsQuery);
        debtDocsToUpdate = debtsSnap.docs.map(d => d.ref);
      }

      await runTransaction(db, async (transaction) => {
        // --- READS ---
        let productRefs = [];
        let productSnaps = [];
        if (saleToProcess.items && saleToProcess.items.length > 0) {
          productRefs = saleToProcess.items.map(item => ({ ref: doc(db, `users/${storeId}/products`, item.productId), qty: item.qty }));
          productSnaps = await Promise.all(productRefs.map(p => transaction.get(p.ref)));
        }

        let custRef = null;
        let custSnap = null;
        if (saleToProcess.customerId) {
          custRef = doc(db, `users/${storeId}/customers`, saleToProcess.customerId);
          custSnap = await transaction.get(custRef);
        }

        // --- WRITES ---
        for (let i = 0; i < productSnaps.length; i++) {
          const snap = productSnaps[i];
          const pData = productRefs[i];
          if (snap.exists()) {
            transaction.update(pData.ref, { stock: snap.data().stock + pData.qty });
          }
        }

        if (custSnap && custSnap.exists()) {
          const currentCust = custSnap.data();
          const updates = {};
          
          if (currentCust.totalPurchases !== undefined) {
            updates.totalPurchases = Math.max(0, currentCust.totalPurchases - saleToProcess.finalTotal);
          }
          if (currentCust.visits !== undefined) {
            updates.visits = Math.max(0, currentCust.visits - 1);
          }
          if (debtAmount > 0 && currentCust.currentDebt !== undefined) {
            updates.currentDebt = Math.max(0, currentCust.currentDebt - debtAmount);
          }

          if (Object.keys(updates).length > 0) {
            transaction.update(custRef, updates);
          }
        }

        debtDocsToUpdate.forEach(ref => {
           // We shouldn't necessarily delete the debt if they partially paid, but for a full return we'll mark as returned.
           // To be safe, just update status or amount
          transaction.update(ref, { status: 'returned', remainingAmount: 0 });
        });
        
        // Mark sale as fully_returned instead of deleting
        const saleRef = doc(db, `users/${storeId}/sales`, saleToProcess.id);
        transaction.update(saleRef, { status: 'fully_returned' });
        
        // Add to returns collection
        const returnRef = doc(collection(db, `users/${storeId}/returns`));
        transaction.set(returnRef, {
           originalSaleId: saleToProcess.id,
           items: saleToProcess.items,
           refundAmount: saleToProcess.finalTotal,
           refundMethod: saleToProcess.paymentType,
           reason: 'Qaytarish (To\'liq)',
           cashierId: userProfile?.name || 'Admin',
           createdAt: new Date().toISOString()
        });
      });

      return true;
    } catch (error) {
      addToast(error.message, 'error');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = async () => {
    const success = await handleReturnSale(selectedSale);
    if (success) {
      addToast('Sotuv muvaffaqiyatli qaytarildi', 'success');
      setIsDeleteModalOpen(false);
      setSelectedSale(null);
    }
  };

  const handleEditSale = async () => {
    if (!selectedSale) return;
    const success = await handleReturnSale(selectedSale);
    if (success) {
      // Save sale to localStorage and redirect to POS
      localStorage.setItem('editSaleData', JSON.stringify(selectedSale));
      setIsEditModalOpen(false);
      setSelectedSale(null);
      addToast('Tahrirlash uchun kassaga yo\'naltirilmoqda...', 'info');
      setTimeout(() => {
        window.location.href = '/sales';
      }, 500);
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem', height: '100%' }}>
      <div className="flex-between">
        <div>
          <h1 className="h1">Hisobotlar</h1>
          <p className="subtitle">Sotuvlar va foyda tahlili</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <DateRangePicker 
            startDate={startDate} 
            endDate={endDate} 
            onChange={({ start, end }) => {
              const formatYMD = (d) => d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '';
              setStartDate(formatYMD(start));
              setEndDate(formatYMD(end));
            }} 
          />
          <button className="btn btn-primary" onClick={() => addToast("Tez orada qo'shiladi", 'info')}><Download size={18} /> Excel</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
         <button className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('sales')} style={{ borderRadius: '8px 8px 0 0' }}>Sotuvlar tarixi</button>
         <button className={`btn ${activeTab === 'shifts' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('shifts')} style={{ borderRadius: '8px 8px 0 0' }}>Smenalar tarixi</button>
      </div>
      
      {activeTab === 'sales' ? (
      <>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-card-label">Jami tushum</span>
          <span className="stat-card-value blue"><CurrencyDisplay amount={totalRevenue} /></span>
          <span className="stat-card-sub">Tanlangan davr bo'yicha</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Sof foyda</span>
          <span className="stat-card-value green"><CurrencyDisplay amount={totalProfit} /></span>
          <span className="stat-card-sub">Tanlangan davr bo'yicha</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Cheklar soni</span>
          <span className="stat-card-value amber">{filteredSales.length} ta</span>
          <span className="stat-card-sub">Sotilgan cheklar</span>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: '1.5rem', minHeight: '350px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="h2" style={{ margin: 0 }}>{startDate || endDate ? "Davr bo'yicha sotuvlar grafigi" : "Haftalik sotuvlar grafigi"}</h2>
          {(startDate || endDate) && (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '1rem' }}>
              {getMonthLabel()}
            </span>
          )}
        </div>
        <div style={{ flex: 1, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} tickFormatter={v => (v/1000000).toFixed(1)+'M'} />
              <Tooltip formatter={(v) => [formatMoney(v), "Sotuv"]} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)'}} cursor={{fill: 'var(--bg-main)'}} />
              <Bar dataKey="savdo" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel flex-col" style={{ flex: 1, padding: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h2 className="h2">Sotuvlar tarixi</h2>
          <input 
            type="text" 
            placeholder="Chek raqami yoki mijoz qidirish..." 
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
          />
        </div>
        <div className="table-responsive">
          <table className="page-table mobile-card-table">
            <thead>
              <tr>
                <th>Sana</th>
                <th>Chek №</th>
                <th>Mijoz</th>
                <th>Mahsulotlar</th>
                <th>To'lov turi</th>
                <th>Summa</th>
                <th style={{ textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#8A9BB5' }}>Ma'lumot topilmadi</td></tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id}>
                  <td>{new Date(sale.createdAt).toLocaleString('uz-UZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ fontWeight: 500 }}>
                    {sale.saleNumber}
                    {sale.status === 'fully_returned' && <span style={{display: 'inline-block', marginLeft: '8px', padding: '2px 6px', fontSize: '10px', background: '#FCE8E8', color: '#EF4B4B', borderRadius: '4px'}}>Qaytarilgan</span>}
                  </td>
                  <td>
                    {sale.customerId 
                      ? (customers.find(c => c.id === sale.customerId)?.fullName || 'Noma\'lum mijoz') 
                      : 'Umumiy mijoz'
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {sale.items?.map((item, idx) => (
                        <span key={idx} style={{ fontSize: '0.875rem' }}>{item.name} <span style={{ color: '#8A9BB5', fontWeight: 600 }}>x{item.qty}</span></span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#F1F5F9', fontWeight: 600, color: '#334155' }}>
                      {sale.paymentType === 'cash' ? 'Naqd' : sale.paymentType === 'card' ? 'Karta' : sale.paymentType === 'debt' ? 'Nasiya' : 'Aralash'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}><CurrencyDisplay amount={sale.finalTotal} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="action-btn edit" 
                        onClick={() => {
                          const custName = sale.customerId ? (customers.find(c => c.id === sale.customerId)?.fullName) : 'Umumiy mijoz';
                          setSelectedSale({ ...sale, customerName: custName });
                          setIsReceiptModalOpen(true);
                        }}
                        title="Ko'rish"
                      >
                        <Eye size={14} />
                      </button>
                      {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                        <>
                          <button 
                            className="action-btn edit" 
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsEditModalOpen(true);
                            }}
                            title="Tahrirlash"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="action-btn delete" 
                            onClick={() => {
                              setSelectedSale(sale);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Qaytarish"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>
      ) : (
         <div className="glass-panel flex-col" style={{ flex: 1, padding: '1.5rem' }}>
            <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Smenalar tarixi</h2>
            <div className="table-responsive">
              <table className="page-table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Kassir</th>
                    <th>Holat</th>
                    <th>Kutilgan summa</th>
                    <th>Haqiqiy summa</th>
                    <th>Farq</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsData.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Smenalar yo'q</td></tr>
                  ) : shiftsData.map(shift => (
                    <tr key={shift.id}>
                      <td>{new Date(shift.openedAt).toLocaleString('uz-UZ')}</td>
                      <td style={{ fontWeight: 600 }}>{shift.cashierName}</td>
                      <td>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: shift.status === 'ochiq' ? '#EFF6FF' : '#F0FDF4', color: shift.status === 'ochiq' ? '#2563EB' : '#16A34A', fontWeight: 600 }}>
                          {shift.status === 'ochiq' ? 'Ochiq' : 'Yopiq'}
                        </span>
                      </td>
                      <td>{shift.expectedCash ? <CurrencyDisplay amount={shift.expectedCash} /> : '-'}</td>
                      <td>{shift.actualCash ? <CurrencyDisplay amount={shift.actualCash} /> : '-'}</td>
                      <td>
                        {shift.difference ? (
                           <span style={{ color: shift.difference < 0 ? '#E11D48' : '#16A34A', fontWeight: 600 }}>
                              {shift.difference > 0 ? '+' : ''}<CurrencyDisplay amount={shift.difference} />
                           </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      )}

      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {selectedSale && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={selectedSale} storeId={storeId} />
            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => dataService.printReceipt()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} title="Sotuvni qaytarish">
        {selectedSale && (
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
              <strong>Diqqat!</strong> Siz ushbu sotuvni (Chek: {selectedSale.saleNumber}) qaytarmoqchisiz (Return). 
              Buning natijasida:
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Ushbu chekdagi barcha tovarlar ombor qoldig'iga qaytariladi.</li>
                <li>Sotuv va foyda tarixidan o'chiriladi.</li>
                <li>Agar nasiyaga berilgan bo'lsa, mijozning qarzidan shu summa olib tashlanadi.</li>
              </ul>
              Haqiqatan ham bekor qilasizmi?
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--danger)' }} disabled={isDeleting} onClick={confirmDelete}>
                {isDeleting ? 'Bajarilmoqda...' : 'Qaytarish (Tasdiqlash)'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => !isDeleting && setIsEditModalOpen(false)} title="Sotuvni tahrirlash">
        {selectedSale && (
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--radius-md)' }}>
              <strong>E'tibor bering!</strong> Tahrirlash uchun ushbu sotuv (Chek: {selectedSale.saleNumber}) avval <strong>bekor qilinadi</strong> (tovarlar omborga qaytadi, tushumdan o'chadi) va kassa (Sotuv oynasi) bo'limiga yuboriladi. 
              U yerda chek ma'lumotlarini tahrirlab, qaytadan "To'lash" tugmasini bosasiz.
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" disabled={isDeleting} onClick={() => setIsEditModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" disabled={isDeleting} onClick={handleEditSale}>
                {isDeleting ? 'Bajarilmoqda...' : 'Tahrirlashga o\'tish'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;
