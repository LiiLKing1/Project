import { dataService } from '../../services/dataService';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, FileText, ChevronDown, Percent, Calendar, X, CheckCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, writeBatch, increment, doc, orderBy, getDoc, runTransaction } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import Receipt from '../../components/Receipt';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import { motion, AnimatePresence } from 'framer-motion';


const POS = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  
  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const { addToast } = useToast();
  const barcodeInputRef = useRef(null);
  
  const isElectron = window.electronAPI && window.electronAPI.isElectron;

  const { userProfile } = useRoles();
  const { settings } = useSettings();
  const { selectedWarehouseId } = useWarehouse();
  const storeId = userProfile?.storeOwnerId;
  const curr = settings?.currency || 'UZS';
  
  const products = React.useMemo(() => {
    return allProducts.map(p => {
      let currentStock = 0;
      if (p.stockByWarehouse && p.stockByWarehouse[selectedWarehouseId] !== undefined) {
        currentStock = p.stockByWarehouse[selectedWarehouseId] || 0;
      } else if (p.stock !== undefined) {
        currentStock = p.stock; // fallback to old stock structure
      }
      return {
        ...p,
        stock: currentStock
      };
    });
  }, [allProducts, selectedWarehouseId]);

  // Payment Drawer State
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('cash'); // cash, card, mixed, debt
  
  // Discount state
  const [discountType, setDiscountType] = useState('amount'); // percent, amount
  const [discountValue, setDiscountValue] = useState('');
  
  // Mixed payment amounts
  const [mixedCash, setMixedCash] = useState('');
  const [mixedCard, setMixedCard] = useState('');
  const [mixedDebt, setMixedDebt] = useState('');
  
  // Single payment cash (for calculating change)
  const [cashAmount, setCashAmount] = useState('');
  
  const [dueDate, setDueDate] = useState('');
  const [bonusToUse, setBonusToUse] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    if (!storeId) return;

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), where('status', '==', 'active')), (snapshot) => {
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCustomers = onSnapshot(query(collection(db, `users/${storeId}/customers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [storeId]);

  // Handle Edit Sale Data
  useEffect(() => {
    const editDataStr = localStorage.getItem('editSaleData');
    if (editDataStr && products.length > 0) {
      try {
        const editData = JSON.parse(editDataStr);
        
        // Map items to cart with stock info
        const newCart = editData.items.map(item => {
           const p = products.find(p => p.id === item.productId);
           return { ...item, id: item.productId, sellPrice: item.price, stock: p ? p.stock : 1000 };
        });
        setCart(newCart);
        
        // Set Customer
        if (editData.customerId && customers.length > 0) {
           const cust = customers.find(c => c.id === editData.customerId);
           if (cust) setSelectedCustomer(cust);
        }
        
        // Set Discount
        if (editData.discount && editData.discount.value > 0) {
           setDiscountType(editData.discount.type);
           setDiscountValue(editData.discount.value);
        }

        localStorage.removeItem('editSaleData');
        addToast("Sotuv ma'lumotlari tahrirlash uchun yuklandi", "info");
      } catch(e) {
        console.error(e);
      }
    }
  }, [products, customers, addToast]);

  const addToCart = (product) => {
    if (product.stock <= 0) {
      addToast('Qoldiqda yo\'q!', 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          addToast('Qoldiqdan ortiq qo\'shib bo\'lmaydi', 'warning');
          return prev;
        }
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta, stock) => {
    setCart(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = Math.max(1, Math.min(stock, p.qty + delta));
        return { ...p, qty: newQty };
      }
      return p;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(p => p.id !== id));
  
  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  
  let discountAmount = 0;
  if (discountValue) {
    if (discountType === 'percent') {
      discountAmount = subtotal * (Number(discountValue) / 100);
    } else {
      discountAmount = Number(discountValue);
    }
  }
  
  let finalTotal = Math.max(0, subtotal - discountAmount);
  
  // Apply bonus if checked
  let usedBonusAmount = 0;
  if (selectedCustomer && selectedCustomer.bonusBalance > 0 && Number(bonusToUse) > 0) {
    usedBonusAmount = Math.min(finalTotal, Math.min(selectedCustomer.bonusBalance, Number(bonusToUse)));
    finalTotal -= usedBonusAmount;
  }
  
  // Mixed payment auto calculation
  const mCash = Number(mixedCash) || 0;
  const mCard = Number(mixedCard) || 0;
  
  const mDiff = finalTotal - (mCash + mCard);
  const mDebt = Math.max(0, mDiff);
  const mChange = Math.max(0, -mDiff);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );
  
  const cleanPhoneSearch = customerSearch.replace(/\s+/g, '').toLowerCase();
  const cleanNameSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customerSearch.trim() ? customers.filter(c => 
    (c?.fullName || '').toLowerCase().includes(cleanNameSearch) || (c?.phone || '').includes(cleanPhoneSearch)
  ).slice(0, 5) : [];

  const handleCheckout = async () => {
    const isDebtInvolved = paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0);
    
    if (isDebtInvolved) {
      if (!selectedCustomer) {
        addToast('Nasiyaga sotish uchun mijoz tanlanishi shart', 'error');
        return;
      }
      if (!dueDate) {
        addToast('Qaytarish muddati kiritilishi shart', 'error');
        return;
      }
    }

    if (cart.some(item => !item.qty || item.qty < 1)) {
      addToast('Barcha mahsulotlar soni kamida 1 bo\'lishi kerak', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      let finalSaleData = null;
      
      await runTransaction(db, async (transaction) => {
      
      // Calculate actual cash and card received
      let finalCashReceived = 0;
      let finalCardReceived = 0;
      let finalDebtAmount = 0;
      
      let paymentBreakdown = [];
      
      if (paymentType === 'cash') {
        finalCashReceived = finalTotal;
        paymentBreakdown.push({ method: 'cash', amount: finalTotal });
      } else if (paymentType === 'card') {
        finalCardReceived = finalTotal;
        paymentBreakdown.push({ method: 'card', amount: finalTotal });
      } else if (paymentType === 'debt') {
        finalDebtAmount = finalTotal;
        paymentBreakdown.push({ method: 'debt', amount: finalTotal });
      } else if (paymentType === 'mixed') {
        let actualCash = mCash;
        let actualCard = mCard;
        let change = mChange;
        
        if (change > 0) {
          if (actualCash >= change) {
            actualCash -= change;
          } else {
             let rem = change - actualCash;
             actualCash = 0;
             actualCard -= rem;
          }
        }
        finalCashReceived = actualCash;
        finalCardReceived = actualCard;
        finalDebtAmount = mDebt;
        if (actualCash > 0) paymentBreakdown.push({ method: 'cash', amount: actualCash });
        if (actualCard > 0) paymentBreakdown.push({ method: 'card', amount: actualCard });
        if (mDebt > 0) paymentBreakdown.push({ method: 'debt', amount: mDebt });
      }

      
      if (usedBonusAmount > 0) {
        paymentBreakdown.push({ method: 'bonus', amount: usedBonusAmount });
      }

      // Loyalty calculation
      let bonusEarned = 0;
      if (selectedCustomer && selectedCustomer.bonusPercent > 0) {
        bonusEarned = finalTotal * (Number(selectedCustomer.bonusPercent) / 100);
      }

      // 1. Update product stocks
      cart.forEach(item => {
        const productRef = doc(db, `users/${storeId}/products`, item.id);
        transaction.update(productRef, {
          [`stockByWarehouse.${selectedWarehouseId}`]: increment(-item.qty)
        });
      });

      // 2. Create Sale Document
      const saleRef = doc(collection(db, `users/${storeId}/sales`));
      const saleData = {
        saleNumber: 'CH-' + Date.now().toString().slice(-6),
        items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.sellPrice, costPrice: i.costPrice })),
        subtotal: subtotal,
        discount: { type: discountType, value: discountAmount },
        finalTotal: finalTotal,
        paymentType: paymentType,
        paymentBreakdown: paymentBreakdown,
        cashReceived: finalCashReceived,
        cardAmount: finalCardReceived,
        bonusEarned: bonusEarned,
        customerId: selectedCustomer?.id || null,
        cashierId: userProfile?.name || 'Kassir',
        status: 'completed',
        createdAt: new Date().toISOString()
      };
      transaction.set(saleRef, saleData);
      finalSaleData = { id: saleRef.id, ...saleData };

      // 3. Create Debt Document if needed
      if (finalDebtAmount > 0 && selectedCustomer) {
        const debtRef = doc(collection(db, `users/${storeId}/customerDebts`));
        transaction.set(debtRef, { 
          customerId: selectedCustomer.id, 
          relatedSaleId: saleRef.id,
          amount: finalDebtAmount, 
          remainingAmount: finalDebtAmount,
          dueDate: dueDate,
          note: 'Nasiya savdo ' + saleData.saleNumber,
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.name || 'Kassir'
        });
      }

      // 4. Update Customer
      if (selectedCustomer) {
        const custRef = doc(db, `users/${storeId}/customers`, selectedCustomer.id);
        const updates = { 
          totalPurchases: increment(finalTotal), 
          visits: increment(1) 
        };
        
        if (finalDebtAmount > 0) {
          updates.currentDebt = increment(finalDebtAmount);
        }
        
        const netBonusChange = bonusEarned - usedBonusAmount;
        if (netBonusChange !== 0) {
          updates.bonusBalance = increment(netBonusChange);
        }
        
        transaction.update(custRef, updates);
      }
      });

      addToast('Sotuv muvaffaqiyatli amalga oshirildi', 'success');
      setLastSale({ ...finalSaleData, customerName: selectedCustomer?.fullName });
      
      // Reset POS state
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setIsPaymentDrawerOpen(false);
      setDiscountValue('');
      setBonusToUse('');
      setMixedCash('');
      setMixedCard('');
      setMixedDebt('');
      setCashAmount('');
      
      setIsReceiptModalOpen(true);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPaymentDrawer = () => {
    setIsPaymentDrawerOpen(true);
    
    // Set default due date to +30 days
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
  };
  
  const canDiscount = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-[80px]">
      {/* 1. Header & Search */}
      <div className="bg-white p-4 shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-800 mb-3">Sotuv oynasi</h1>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Katalogdan qidirish..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 rounded-xl py-3 pl-10 pr-4 text-sm"
          />
        </div>
      </div>

      {/* 2. Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => p.stock > 0 && addToCart(p)}
              className={`bg-white rounded-xl p-3 border shadow-sm transition-transform active:scale-95 flex flex-col ${p.stock > 0 ? 'border-gray-200 cursor-pointer' : 'border-gray-100 opacity-60'}`}
            >
              <div className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px] mb-2">{p.name}</div>
              <div className="mt-auto flex flex-col gap-1">
                <div className="text-blue-600 font-bold"><CurrencyDisplay amount={p.sellPrice} /></div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{p.barcode || 'Kod yo\'q'}</span>
                  <span className={`font-medium ${p.stock <= p.minStock ? 'text-red-500' : 'text-green-500'}`}>Qoldiq: {p.stock}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            Mahsulot topilmadi
          </div>
        )}
      </div>

      {/* 3. Floating Bottom Bar */}
      <div className="fixed bottom-[65px] left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-between items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-medium">{cart.length} xil mahsulot</span>
          <span className="font-bold text-lg text-gray-900"><CurrencyDisplay amount={finalTotal}/></span>
        </div>
        <button 
          onClick={() => setIsCartDrawerOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
        >
          <ShoppingCart size={18} /> 
          Savatchani ochish
          {cart.length > 0 && (
            <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs ml-1">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* 4. Cart Drawer */}
      <Drawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} title="Savatcha" position="bottom" width="100%">
        <div className="flex flex-col gap-4 pb-4">
          
          {/* Customer Selection */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            {selectedCustomer ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <User size={18} /> {selectedCustomer.fullName}
                  {selectedCustomer.bonusBalance > 0 && (
                    <span className="ml-2 text-xs py-0.5 px-2 bg-yellow-400 text-yellow-900 rounded-full">
                      Bonus: <CurrencyDisplay amount={selectedCustomer.bonusBalance} />
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-red-500 p-1"><X size={18}/></button>
              </div>
            ) : (
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Mijoz qidirish..." 
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg py-2 pl-9 pr-3 text-sm"
                />
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg rounded-lg mt-1 max-h-48 overflow-y-auto z-30">
                    {filteredCustomers.map(c => (
                      <div key={c.id} className="p-3 border-b border-gray-50 flex justify-between items-center" onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(''); }}>
                        <div>
                          <div className="font-medium text-sm text-gray-800">{c.fullName}</div>
                          <div className="text-xs text-gray-500">{c.phone}</div>
                        </div>
                        <button className="text-blue-600 text-xs font-medium px-3 py-1 bg-blue-50 rounded-full">Tanlash</button>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">Mijoz topilmadi</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
            {cart.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate mb-1">{item.name}</div>
                  <div className="text-xs text-gray-500"><CurrencyDisplay amount={item.sellPrice}/> x {item.qty}</div>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <button onClick={() => updateQuantity(item.id, -1, item.stock)} className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white rounded shadow-sm">
                    {item.qty <= 1 ? <Trash2 size={14} className="text-red-500"/> : <Minus size={14} />}
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => updateQuantity(item.id, 1, item.stock)} className="w-7 h-7 flex items-center justify-center text-gray-600 bg-white rounded shadow-sm">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <ShoppingCart size={48} className="mb-3 opacity-20" />
                <p>Savatcha bo'sh</p>
              </div>
            )}
          </div>

          {/* Checkout Totals */}
          {cart.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Jami summa:</span>
                <span><CurrencyDisplay amount={subtotal}/></span>
              </div>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-600">Chegirma:</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={discountValue} 
                    onChange={e => setDiscountValue(e.target.value)}
                    disabled={!canDiscount}
                    className="w-20 px-2 py-1 text-right border border-gray-200 rounded text-sm disabled:bg-gray-100"
                    placeholder="0"
                  />
                  <select 
                    value={discountType} 
                    onChange={e => setDiscountType(e.target.value)}
                    disabled={!canDiscount}
                    className="border border-gray-200 rounded p-1 text-sm bg-white disabled:bg-gray-100"
                  >
                    <option value="fixed">So'm</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
              
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-end">
                <span className="text-gray-800 font-medium">To'lov summasi:</span>
                <span className="text-xl font-bold text-blue-600"><CurrencyDisplay amount={finalTotal}/></span>
              </div>

              <button 
                onClick={() => { setIsCartDrawerOpen(false); openPaymentDrawer(); }}
                className="w-full bg-blue-600 text-white rounded-xl py-3 mt-4 font-bold text-base shadow-lg shadow-blue-200 active:scale-95 transition-transform"
              >
                To'lovga o'tish
              </button>
            </div>
          )}
        </div>
      </Drawer>

      {/* 5. Payment Drawer */}
      <Drawer isOpen={isPaymentDrawerOpen} onClose={() => setIsPaymentDrawerOpen(false)} title="To'lovni tasdiqlash" position="bottom" width="100%">
        <div className="flex flex-col gap-4 pb-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-center">
            <div className="text-sm opacity-80 mb-1">To'lanishi kerak:</div>
            <div className="text-2xl font-bold"><CurrencyDisplay amount={finalTotal}/></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setPaymentType('cash')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentType === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
            >
              <Banknote size={24} />
              <span className="text-xs font-semibold">Naqd</span>
            </button>
            <button 
              onClick={() => setPaymentType('card')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentType === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}
            >
              <CreditCard size={24} />
              <span className="text-xs font-semibold">Karta</span>
            </button>
            <button 
              onClick={() => setPaymentType('debt')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentType === 'debt' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
            >
              <Calendar size={24} />
              <span className="text-xs font-semibold">Nasiya</span>
            </button>
          </div>

          {paymentType === 'cash' && (
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">Mijoz bergan summa:</label>
              <input 
                type="number" 
                value={cashAmount} 
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full text-lg p-3 border border-gray-300 rounded-xl focus:border-blue-500"
                placeholder={finalTotal.toString()}
              />
              {Number(cashAmount) > finalTotal && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg flex justify-between">
                  <span>Qaytim:</span>
                  <span className="font-bold"><CurrencyDisplay amount={Number(cashAmount) - finalTotal}/></span>
                </div>
              )}
            </div>
          )}

          {paymentType === 'debt' && (
            <div className="mt-2 flex flex-col gap-3">
              {!selectedCustomer && (
                <div className="text-xs text-red-500 bg-red-50 p-2 rounded">Nasiya uchun mijoz tanlash majburiy!</div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To'lash muddati (Qaytarish sanasi):</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
          )}

          <button 
            disabled={isProcessing || (paymentType === 'debt' && !selectedCustomer)}
            onClick={handleCheckout}
            className="w-full bg-green-600 disabled:bg-gray-400 text-white rounded-xl py-4 mt-2 font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {isProcessing ? <div className="spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle size={20} />}
            Tasdiqlash va Sotish
          </button>
        </div>
      </Drawer>

      {/* 6. Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {lastSale && (
          <div className="flex flex-col items-center gap-6">
            <Receipt sale={lastSale} storeId={storeId} />
            <div className="w-full max-w-sm flex gap-3">
              <button className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold active:bg-gray-50" onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default POS;
