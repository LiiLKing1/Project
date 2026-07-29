import { dataService } from '../../services/dataService';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, FileText, ChevronDown, Percent, Calendar, X, CheckCircle, ChevronLeft, ChevronRight, Archive, LogOut, Download, Play, Save } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, writeBatch, increment, doc, orderBy, getDoc, runTransaction, getDocs, addDoc, updateDoc } from '../../services/firebaseMock';
import { useToast } from '../../context/ToastContext';
import { useRoles } from '../../context/RolesContext';
import { useSettings } from '../../context/SettingsContext';
import { useWarehouse } from '../../context/WarehouseContext';
import Modal from '../../components/Modal';
import Drawer from '../../components/Drawer';
import FormInput from '../../components/FormInput';
import Receipt from '../../components/Receipt';
import CurrencyDisplay from '../../components/CurrencyDisplay';
import AnimatedNumber from '../../components/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';

const normalizeSearchText = (text) => (text || '').toLowerCase().replace(/х/g, 'x').replace(/Х/g, 'x');

const HighlightText = ({ text, search }) => {
  if (!search || !search.trim()) return <span>{text}</span>;
  const searchTerms = normalizeSearchText(search).trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return <span>{text}</span>;

  const normText = normalizeSearchText(text);
  const regex = new RegExp(`(${searchTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  
  let parts = [];
  let lastIndex = 0;
  
  normText.replace(regex, (match, p1, offset) => {
    if (offset > lastIndex) {
      parts.push({ text: text.substring(lastIndex, offset), highlight: false });
    }
    parts.push({ text: text.substring(offset, offset + match.length), highlight: true });
    lastIndex = offset + match.length;
  });
  
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false });
  }
  
  return (
    <span>
      {parts.map((p, i) => p.highlight ? <span key={i} style={{backgroundColor: '#FFE066', padding: '0 2px', borderRadius: '2px', color: '#1A2538'}}>{p.text}</span> : <span key={i}>{p.text}</span>)}
    </span>
  );
};

const POS = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  
  // -- NEW STATES --
  const [openShift, setOpenShift] = useState(null);
  const [isCheckingShift, setIsCheckingShift] = useState(true);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [shiftExpectedCash, setShiftExpectedCash] = useState(0);
  
  const [parkedSales, setParkedSales] = useState([]);
  const [isParkedDrawerOpen, setIsParkedDrawerOpen] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  // ----------------
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('available_first');
  const [visibleCount, setVisibleCount] = useState(30);
  
  // Mobile Cart Drawer State
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile || isCartDrawerOpen) {
      setShowSwipeHint(false);
      return;
    }
    let timeout;
    const resetTimer = () => {
      setShowSwipeHint(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!isCartDrawerOpen && window.innerWidth <= 1024) {
          setShowSwipeHint(true);
        }
      }, 3000);
    };
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('touchmove', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('touchmove', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [isMobile, isCartDrawerOpen]);

  const handleTouchStart = (e) => setTouchStartX(e.targetTouches[0].clientX);
  const handleTouchEnd = (e) => {
    if (!touchStartX) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX - touchEndX;
    if (distance > 60) setIsCartDrawerOpen(true);
    if (distance < -60) setIsCartDrawerOpen(false);
    setTouchStartX(null);
  };
  
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
  const cashierId = userProfile?.uid || userProfile?.storeOwnerId || 'unknown';
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

  // Daily Receipts (Cheklar)
  const [isReceiptsDrawerOpen, setIsReceiptsDrawerOpen] = useState(false);
  const [selectedReceiptDate, setSelectedReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySales, setDailySales] = useState([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [selectedOldReceipt, setSelectedOldReceipt] = useState(null);

  useEffect(() => {
    if (isReceiptsDrawerOpen && storeId) {
      const fetchSales = async () => {
        setIsLoadingReceipts(true);
        try {
          const snapshot = await getDocs(collection(db, `users/${storeId}/sales`));
          let sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          sales = sales.filter(s => s.createdAt && s.createdAt.startsWith(selectedReceiptDate));
          sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setDailySales(sales);
        } catch (e) {
          console.error(e);
        }
        setIsLoadingReceipts(false);
      };
      fetchSales();
    }
  }, [isReceiptsDrawerOpen, selectedReceiptDate, storeId]);

  useEffect(() => {
    if (!storeId || !cashierId) return;

    const unsubProducts = onSnapshot(query(collection(db, `users/${storeId}/products`), where('status', '==', 'active')), (snapshot) => {
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCustomers = onSnapshot(query(collection(db, `users/${storeId}/customers`), orderBy('createdAt', 'desc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // Listen for open shift
    const unsubShift = onSnapshot(query(collection(db, `users/${storeId}/cashShifts`), where('cashierId', '==', cashierId), where('status', '==', 'ochiq')), (snapshot) => {
      if (!snapshot.empty) {
        setOpenShift({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setOpenShift(null);
      }
      setIsCheckingShift(false);
    });
    
    // Listen for parked sales
    const unsubParked = onSnapshot(query(collection(db, `users/${storeId}/parkedSales`), where('cashierId', '==', cashierId)), (snapshot) => {
      setParkedSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubShift();
      unsubParked();
    };
  }, [storeId, userProfile?.uid]);

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

  const updateItemPrice = (id, newPrice) => {
    setCart(prev => prev.map(p => p.id === id ? { ...p, sellPrice: newPrice } : p));
  };
  
  // Totals calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.qty), 0);
  
  let discountAmount = 0;
  if (appliedCoupon) {
     if (appliedCoupon.discountType === 'percent') {
       discountAmount = subtotal * (Number(appliedCoupon.discountValue) / 100);
     } else {
       discountAmount = Number(appliedCoupon.discountValue);
     }
  } else if (discountValue) {
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

  const searchTerms = normalizeSearchText(search).trim().split(/\s+/);
  const filteredProducts = products.filter(p => {
    if (p.status === 'archived') return false;
    const lowerName = normalizeSearchText(p.name);
    const barcode = p.barcode || '';
    if (!search.trim()) return true;
    return searchTerms.every(term => lowerName.includes(term) || barcode.includes(term));
  }).sort((a, b) => {
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'qty_desc') {
      return b.stock - a.stock;
    } else if (sortBy === 'qty_asc') {
      return a.stock - b.stock;
    } else if (sortBy === 'available_first') {
      if (a.stock > 0 && b.stock <= 0) return -1;
      if (b.stock > 0 && a.stock <= 0) return 1;
      return a.name.localeCompare(b.name);
    }
    return 0;
  });
  
  const cleanPhoneSearch = customerSearch.replace(/\s+/g, '').toLowerCase();
  
  // Reset visible count when search or sort changes
  useEffect(() => {
    setVisibleCount(30);
  }, [search, sortBy]);

  const handleGridScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 150;
    if (bottom && visibleCount < filteredProducts.length) {
      setVisibleCount(prev => prev + 30);
    }
  };
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
        shiftId: openShift ? openShift.id : null,
        couponId: appliedCoupon ? appliedCoupon.id : null,
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
      
      // Update coupon usage
      if (appliedCoupon) {
        const couponRef = doc(db, `users/${storeId}/coupons`, appliedCoupon.id);
        transaction.update(couponRef, {
          usedCount: increment(1)
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
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponError('');
      
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


  const handleOpenShift = async () => {
    if (!openingCashInput) {
      addToast('Iltimos, boshlang\'ich summani kiriting', 'error');
      return;
    }
    try {
      await addDoc(collection(db, `users/${storeId}/cashShifts`), {
        cashierId: cashierId,
        cashierName: userProfile.name || userProfile.fullName || 'Kassir',
        openingCash: Number(openingCashInput),
        openedAt: new Date().toISOString(),
        closedAt: null,
        expectedCash: 0,
        actualCash: 0,
        difference: 0,
        status: 'ochiq',
        totalCash: 0,
        totalCard: 0,
        totalDebt: 0,
        salesCount: 0,
        warehouseId: selectedWarehouseId
      });
      addToast('Smena muvaffaqiyatli ochildi', 'success');
    } catch (e) {
      addToast('Xatolik: ' + e.message, 'error');
    }
  };

  const handleCloseShiftPrepare = async () => {
    if (!openShift) return;
    try {
      // Calculate expected cash
      const salesSnap = await getDocs(query(collection(db, `users/${storeId}/sales`), where('shiftId', '==', openShift.id)));
      let cashTotal = 0;
      salesSnap.forEach(d => {
        const s = d.data();
        if (s.status !== 'fully_returned' && s.status !== 'archived') {
           cashTotal += (s.cashReceived || 0);
        }
      });
      setShiftExpectedCash(openShift.openingCash + cashTotal);
      setIsCloseShiftModalOpen(true);
    } catch (e) {
      addToast('Xatolik: ' + e.message, 'error');
    }
  };

  const handleCloseShift = async () => {
    if (!actualCashInput) {
      addToast('Iltimos, haqiqiy summani kiriting', 'error');
      return;
    }
    const actual = Number(actualCashInput);
    const diff = actual - shiftExpectedCash;
    
    try {
      // Get all sales for stats
      const salesSnap = await getDocs(query(collection(db, `users/${storeId}/sales`), where('shiftId', '==', openShift.id)));
      let tCash = 0, tCard = 0, tDebt = 0;
      salesSnap.forEach(d => {
        const s = d.data();
        if (s.status !== 'fully_returned' && s.status !== 'archived') {
          tCash += (s.cashReceived || 0);
          tCard += (s.cardAmount || 0);
          tDebt += (s.paymentBreakdown?.find(p => p.method === 'debt')?.amount || 0);
        }
      });

      await updateDoc(doc(db, `users/${storeId}/cashShifts`, openShift.id), {
        status: 'yopiq',
        closedAt: new Date().toISOString(),
        expectedCash: shiftExpectedCash,
        actualCash: actual,
        difference: diff,
        totalCash: tCash,
        totalCard: tCard,
        totalDebt: tDebt,
        salesCount: salesSnap.size
      });
      addToast('Smena yopildi', 'success');
      setIsCloseShiftModalOpen(false);
      setOpenShift(null);
      setActualCashInput('');
    } catch (e) {
      addToast('Xatolik: ' + e.message, 'error');
    }
  };

  const handleParkSale = async () => {
    if (cart.length === 0) return;
    try {
      await addDoc(collection(db, `users/${storeId}/parkedSales`), {
        cashierId: cashierId,
        items: cart,
        customerId: selectedCustomer ? selectedCustomer.id : null,
        createdAt: new Date().toISOString(),
      });
      setCart([]);
      setSelectedCustomer(null);
      addToast('Savat chetga qo\'yildi', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleRestoreParked = async (parked) => {
    if (cart.length > 0) {
       addToast('Joriy savatni tozalab oling yoki avval to\'lang', 'error');
       return;
    }
    try {
      setCart(parked.items);
      if (parked.customerId) {
        const c = customers.find(c => c.id === parked.customerId);
        if (c) setSelectedCustomer(c);
      }
      await updateDoc(doc(db, `users/${storeId}/parkedSales`, parked.id), { status: 'restored' }); 
      // or delete it
      // Let's just delete it for simplicity
      const { deleteDoc } = require('firebase/firestore'); // wait, we don't have deleteDoc. Let's just soft delete or use runTransaction.
      // Actually we have runTransaction. Let's just use updateDoc status = deleted
      await updateDoc(doc(db, `users/${storeId}/parkedSales`, parked.id), { status: 'deleted' });
      addToast('Savat qayta yuklandi', 'success');
      setIsParkedDrawerOpen(false);
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const snap = await getDocs(query(collection(db, `users/${storeId}/coupons`), where('code', '==', couponCode.trim().toUpperCase())));
      if (snap.empty) {
        setCouponError('Kupon topilmadi');
        setIsApplyingCoupon(false);
        return;
      }
      const c = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (!c.isActive) {
        setCouponError('Kupon faol emas');
      } else if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
        setCouponError('Kupon muddati o\'tgan');
      } else if (c.usageLimit && c.usedCount >= c.usageLimit) {
        setCouponError('Kupon ishlatish limiti tugagan');
      } else {
        setAppliedCoupon(c);
        addToast('Kupon qo\'llanildi', 'success');
      }
    } catch (e) {
      setCouponError(e.message);
    }
    setIsApplyingCoupon(false);
  };

  useEffect(() => {
    const topbar = document.querySelector('.topbar');
    if (topbar && isMobile) {
      if (isCartDrawerOpen) {
        topbar.style.transform = 'translateX(-30%)';
        topbar.style.opacity = '0.3';
        topbar.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1), opacity 0.5s ease';
      } else {
        topbar.style.transform = 'translateX(0)';
        topbar.style.opacity = '1';
      }
    }
    return () => {
      if (topbar) {
        topbar.style.transform = '';
        topbar.style.opacity = '';
        topbar.style.transition = '';
      }
    }
  }, [isCartDrawerOpen, isMobile]);
  
  if (isCheckingShift) {
    return <div className="flex-center" style={{ height: '100%', fontSize: '1.2rem', color: '#666' }}>Yuklanmoqda...</div>;
  }
  
  if (!openShift) {
    return (
      <div className="flex-center" style={{ height: '100%', background: '#F8FAFC' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel flex-col" style={{ width: '400px', padding: '2rem', gap: '1.5rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Play size={32} color="var(--primary)" />
          </div>
          <h2 className="h2" style={{ margin: 0 }}>Smenani Boshlash</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Iltimos kassa oynasini ochish uchun boshlang'ich naqd summani kiriting.</p>
          <FormInput 
             label="Kassadagi naqd pul" 
             type="number" 
             value={openingCashInput}
             onChange={(e) => setOpeningCashInput(e.target.value)}
             placeholder="0"
          />
          <button className="btn btn-primary" onClick={handleOpenShift} style={{ padding: '1rem', fontSize: '1.1rem' }}>
             Smenani Ochish
          </button>
        </motion.div>
      </div>
    );
  }



  return (
    <div className="pos-layout" style={{ overflow: 'hidden', height: '100%', display: isMobile ? 'flex' : undefined, flexDirection: isMobile ? 'column' : undefined }}>
      {/* Products Section */}
      <motion.div 
        className="flex-col pos-products-wrapper" 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        animate={{ 
          x: isMobile && isCartDrawerOpen ? '-30%' : '0%', 
          opacity: isMobile && isCartDrawerOpen ? 0.3 : 1 
        }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        style={{ gap: '1.5rem', overflow: 'hidden', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                <h1 className="h1" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Sotuv Oynasi</h1>
                <button className="btn btn-outline" onClick={() => setIsReceiptsDrawerOpen(true)} style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <FileText size={18} /> Cheklar
                </button>
                <button className="btn btn-outline" onClick={() => setIsParkedDrawerOpen(true)} style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Archive size={18} /> Chetga qo'yilganlar ({parkedSales.filter(p => p.status !== 'deleted').length})
                </button>
                <button className="btn" onClick={handleCloseShiftPrepare} style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FCE8E8', color: '#EF4B4B', border: '1.5px solid #FFE0E0', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <LogOut size={18} /> Smenani yopish
                </button>
              </div>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', outline: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                <option value="available_first">Mavjudlari oldin</option>
                <option value="name_asc">Nomi bo'yicha (A-Z)</option>
                <option value="qty_desc">Qoldiq ko'p</option>
                <option value="qty_asc">Qoldiq kam</option>
              </select>
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Shtrix-kod yoki nom..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '1rem', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                autoFocus
              />
            </div>
          </div>

          <div className="pos-products-grid" onScroll={handleGridScroll} style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
            {filteredProducts.slice(0, visibleCount).map(p => (
              <motion.div key={p.id} className="glass-panel" onClick={() => addToCart(p)} whileTap={{ scale: p.stock > 0 ? 0.94 : 1, backgroundColor: p.stock > 0 ? '#EAF4FC' : '' }} style={{ padding: '1rem', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', opacity: p.stock > 0 ? 1 : 0.5, transition: 'background-color 0.2s', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}><HighlightText text={p.name} search={search} /></div>
                <div style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '1.125rem' }}><CurrencyDisplay amount={p.sellPrice} isSell /></div>
                <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  <span><HighlightText text={p.barcode} search={search} /></span>
                  <span style={{ fontWeight: 600, color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    Qoldiq: <AnimatedNumber value={p.stock} />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
      </motion.div>

      {/* Cart Section Desktop */}
      {!isMobile && (
        <div className="glass-panel flex-col" style={{ width: 'auto', height: '100%', display: 'flex', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
            <div className="flex-between">
              <h2 className="h2">Savat</h2>
              <button onClick={handleParkSale} disabled={cart.length === 0} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Save size={16} style={{marginRight: 4}}/> Chetga qo'yish
              </button>
            </div>
          
            <div style={{ position: 'relative' }}>
              {selectedCustomer ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                    <User size={18} /> {selectedCustomer.fullName}
                    {selectedCustomer.bonusBalance > 0 && !isMobile && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#fbbf24', color: '#000', borderRadius: '1rem' }}>
                        Bonus: <CurrencyDisplay amount={selectedCustomer.bonusBalance} />
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} style={{ color: 'var(--danger)' }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        placeholder="Mijoz qidirish..." 
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        style={{ width: '100%', paddingLeft: '2.5rem' }}
                      />
                    </div>
                    {!isMobile && (
                      <button 
                        className="btn btn-outline" 
                        onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ChevronDown size={18} />
                      </button>
                    )}
                  </div>
                  {showCustomerDropdown && (customerSearch.trim() ? filteredCustomers.length > 0 : customers.length > 0) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', zIndex: 10, marginTop: '0.5rem', boxShadow: 'var(--shadow-md)', maxHeight: '250px', overflowY: 'auto' }}>
                      {(customerSearch.trim() ? filteredCustomers : customers.slice(0, 10)).map(c => (
                        <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0 }}>
            {cart.length === 0 ? (
              <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Savat bo'sh</div>
            ) : (
              <div className="flex-col" style={{ gap: '1rem' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <CurrencyDisplay amount={item.sellPrice} isSell />
                          <span style={{color: 'var(--text-secondary)', alignSelf: 'flex-start', marginTop: '2px'}}>x {item.qty}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                          <span style={{color: 'var(--text-secondary)', fontWeight: 500}}>=</span>
                          <CurrencyDisplay amount={item.sellPrice * item.qty} isSell />
                        </div>
                      </div>
                    </div>
                    <div className="flex-center" style={{ gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, -1, item.stock)}><Minus size={16} /></button>
                      {isMobile ? (
                        <span style={{ fontWeight: 600, width: '30px', textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}><AnimatedNumber value={item.qty} /></span>
                      ) : (
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={item.qty} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val === '') {
                              setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: '' } : p));
                            } else {
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: Math.min(item.stock, num) } : p));
                            }
                          }}
                          onBlur={(e) => {
                            let num = parseInt(e.target.value.replace(/\D/g, ''), 10);
                            if (isNaN(num) || num < 1) num = 1;
                            setCart(prev => prev.map(p => p.id === item.id ? { ...p, qty: Math.min(item.stock, num) } : p));
                          }}
                          style={{ width: '65px', textAlign: 'center', fontWeight: '600', padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'transparent', color: 'var(--text-main)' }}
                        />
                      )}
                      <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, 1, item.stock)}><Plus size={16} /></button>
                      <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem', marginLeft: '0.5rem' }} onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', flexShrink: 0 }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Jami summa:</span>
              <span className="h1" style={{ color: 'var(--primary)', fontSize: '2rem' }}><CurrencyDisplay amount={subtotal} /></span>
            </div>
            <button className="btn btn-primary" disabled={cart.length === 0} onClick={() => setIsPaymentDrawerOpen(true)} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
               To'lash
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Fullscreen Drawer */}
      <AnimatePresence>
        {isMobile && isCartDrawerOpen && (
          <motion.div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="h2" style={{ margin: 0 }}>Savat</h2>
                <button className="btn btn-ghost" onClick={() => setIsCartDrawerOpen(false)} style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                  <ChevronRight size={28}/>
                </button>
              </div>
            
              <div style={{ position: 'relative' }}>
                {selectedCustomer ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                      <User size={18} /> {selectedCustomer.fullName}
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} style={{ color: 'var(--danger)' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input 
                          type="text" 
                          placeholder="Mijoz qidirish..." 
                          value={customerSearch}
                          onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          style={{ width: '100%', paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid var(--border-color)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredCustomers.map(c => (
                          <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerDropdown(false); }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
              {cart.length === 0 ? (
                <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Savat bo'sh</div>
              ) : (
                <div className="flex-col" style={{ gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '1rem' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <CurrencyDisplay amount={item.sellPrice} isSell />
                          <span style={{color: 'var(--text-secondary)'}}>x {item.qty} =</span> <CurrencyDisplay amount={item.sellPrice * item.qty} isSell />
                        </div>
                      </div>
                      <div className="flex-center" style={{ gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, -1, item.stock)}><Minus size={16} /></button>
                        <span style={{ fontWeight: 600, width: '30px', textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}><AnimatedNumber value={item.qty} /></span>
                        <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => updateQty(item.id, 1, item.stock)}><Plus size={16} /></button>
                        <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.25rem', marginLeft: '0.5rem' }} onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#fff', flexShrink: 0 }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Jami summa:</span>
                <span className="h1" style={{ color: 'var(--primary)', fontSize: '2rem' }}><CurrencyDisplay amount={subtotal} /></span>
              </div>
              <button className="btn btn-primary" disabled={cart.length === 0} onClick={() => { setIsCartDrawerOpen(false); setIsPaymentDrawerOpen(true); }} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}>
                 To'lash
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Mobile Swipe Hint ══ */}
      <AnimatePresence>
        {isMobile && showSwipeHint && !isCartDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
              position: 'fixed', bottom: '100px', right: '0',
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
              padding: '12px 24px 12px 20px', 
              borderTopLeftRadius: '30px', borderBottomLeftRadius: '30px', 
              boxShadow: '-8px 8px 32px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1000, 
              color: '#1A2538', fontWeight: 600, fontSize: '14px', lineHeight: '1.3',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', color: 'var(--primary)', marginLeft: '-8px' }}>
              <ChevronLeft size={18} style={{ marginRight: '-12px' }}/>
              <ChevronLeft size={18} style={{ marginRight: '-12px' }}/>
              <ChevronLeft size={18} />
            </div>
            <div style={{ whiteSpace: 'nowrap' }}>Savatni ochish uchun chapga suring</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Fullscreen Payment Overlay ══ */}
      <AnimatePresence>
        {isPaymentDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="pay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => !isProcessing && setIsPaymentDrawerOpen(false)}
              style={{
                position: 'fixed', top: isElectron ? '40px' : 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10,20,40,0.55)',
                backdropFilter: 'blur(6px)',
                zIndex: 1100,
              }}
            />

            {/* Panel */}
            <motion.div
              key="pay-panel"
              initial={{ opacity: 0, scale: 0.94, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 32 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: isElectron ? '40px' : 0, left: 0, right: 0, bottom: 0,
                zIndex: 1101,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? 0 : '20px',
                pointerEvents: 'none',
              }}
            >
              <div className="pos-payment-drawer" style={{
                width: '100%',
                maxWidth: '960px',
                height: isMobile ? '100%' : 'calc(100vh - 40px)',
                maxHeight: isMobile ? '100%' : '700px',
                background: '#F4F8FF',
                borderRadius: isMobile ? '0' : '28px',
                boxShadow: '0 40px 100px -20px rgba(0,0,0,0.45)',
                display: 'flex',
                overflow: 'hidden',
                pointerEvents: 'all',
              }}>

                {/* ── LEFT: Receipt ── */}
                {!isMobile && (
                  <div className="pos-payment-left" style={{
                    width: '380px',
                    flexShrink: 0,
                    background: 'linear-gradient(160deg, #1A2538 0%, #2C4A7C 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 20px',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(74,144,226,0.12)' }} />
                    <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(123,206,235,0.1)' }} />

                    <div style={{ position: 'relative', zIndex: 1, color: '#fff', textAlign: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Chek namunasi</div>
                      <div style={{ fontSize: 12, opacity: 0.4 }}>Tasdiqlashdan avval tekshiring</div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      style={{ position: 'relative', zIndex: 1, width: '100%', overflowY: 'auto', maxHeight: 'calc(100% - 80px)',
                        scrollbarWidth: 'none',
                      }}
                    >
                      <style>{`.receipt-scroll::-webkit-scrollbar{display:none}`}</style>
                      <div className="receipt-scroll">
                        <Receipt sale={{
                          id: 'PREVIEW',
                          items: cart,
                          subtotal,
                          discountAmount,
                          usedBonusAmount,
                          finalTotal,
                          paymentType,
                          customerName: selectedCustomer ? selectedCustomer.fullName : 'Xaridor',
                          createdAt: new Date().toISOString(),
                          cashierId: userProfile?.name || 'Kassir',
                          storeId,
                        }} storeId={storeId} />
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ── RIGHT: Payment Form ── */}
                <div className="pos-payment-right" style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  background: '#fff',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #DCE8F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1A2538', letterSpacing: '-0.5px' }}>To'lovni qabul qilish</div>
                      <div style={{ fontSize: 13, color: '#8A9BB5', marginTop: 2 }}>
                        {cart.reduce((a, c) => a + c.qty, 0)} ta mahsulot · Oraliq: <CurrencyDisplay amount={subtotal} />
                      </div>
                    </div>
                    <button
                      onClick={() => !isProcessing && setIsPaymentDrawerOpen(false)}
                      style={{ width: 36, height: 36, borderRadius: '10px', border: '1.5px solid #DCE8F5', background: '#F7FAFF', color: '#8A9BB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FCE8E8'; e.currentTarget.style.color = '#EF4B4B'; e.currentTarget.style.borderColor = '#FFE0E0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F7FAFF'; e.currentTarget.style.color = '#8A9BB5'; e.currentTarget.style.borderColor = '#DCE8F5'; }}
                    ><X size={16}/></button>
                  </div>

                  {/* Scrollable body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Final Total */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      style={{
                        background: 'linear-gradient(135deg, #4A90E2, #7BCEEB)',
                        borderRadius: '18px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#fff',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yakuniy summa</div>
                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', marginTop: 2 }}>
                          <CurrencyDisplay amount={finalTotal} isSell />
                        </div>
                      </div>
                      <div style={{ width: 52, height: 52, borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Banknote size={26} color="#fff" />
                      </div>
                    </motion.div>

                    {/* Cart Items Price Edit */}
                    {cart.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                        style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2538', marginBottom: '4px' }}>Mahsulotlar narxi</div>
                        {cart.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F7FAFF', borderRadius: '12px', border: '1px solid #DCE8F5' }}>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#1A2538', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: '#8A9BB5' }}>{item.qty} x <CurrencyDisplay amount={item.sellPrice} isSell /></div>
                            </div>
                            <div style={{ width: '120px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '8px', border: '1.5px solid #DCE8F5', overflow: 'hidden', padding: '4px 8px' }}>
                                <input 
                                  type="number"
                                  value={item.sellPrice}
                                  onChange={e => updateItemPrice(item.id, Number(e.target.value))}
                                  style={{ width: '100%', border: 'none', fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right', background: 'transparent' }}
                                  disabled={!canDiscount}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Coupon Block */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
                      style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2538' }}>Kupon kodi</span>
                      </div>
                      {appliedCoupon ? (
                        <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: '10px', color: '#059669', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>{appliedCoupon.code} qo'llanildi!</span>
                          <button onClick={() => setAppliedCoupon(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer' }}><X size={16}/></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Kupon kodi"
                            style={{ flex: 1, minWidth: '150px', padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #DCE8F5', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                          />
                          <button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#4A90E2', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                          >{isApplyingCoupon ? '...' : "Qo'llash"}</button>
                        </div>
                      )}
                      {couponError && <div style={{ color: '#EF4B4B', fontSize: '12px', marginTop: '6px' }}>{couponError}</div>}
                    </motion.div>

                    {/* Discount Block */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2538' }}>Chegirma</span>
                        {!canDiscount && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Faqat admin ruxsati bilan</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ display: 'flex', background: '#F0F5FC', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                          {[{ val: 'percent', label: '%' }, { val: 'amount', label: curr }].map(t => (
                            <button key={t.val} disabled={!canDiscount} onClick={() => setDiscountType(t.val)}
                              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                                background: discountType === t.val ? '#4A90E2' : 'transparent',
                                color: discountType === t.val ? '#fff' : '#8A9BB5',
                              }}
                            >{t.label}</button>
                          ))}
                        </div>
                        <input
                          type="number" disabled={!canDiscount} value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)} placeholder="Chegirma miqdori"
                          style={{ flex: 1, padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #DCE8F5', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = '#4A90E2'}
                          onBlur={e => e.target.style.borderColor = '#DCE8F5'}
                        />
                      </div>
                    </motion.div>

                    {/* Bonus */}
                    {selectedCustomer && selectedCustomer.bonusBalance > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                        style={{ border: '1.5px solid #D1FAE5', borderRadius: '16px', padding: '16px', background: '#F0FDF4' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>Bonus ishlatish</span>
                          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Mavjud: <CurrencyDisplay amount={selectedCustomer.bonusBalance} /></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" value={bonusToUse}
                            onChange={e => { const val = Number(e.target.value); if (val <= selectedCustomer.bonusBalance) setBonusToUse(e.target.value); }}
                            placeholder="Qancha ishlatmoqchisiz?"
                            style={{ flex: 1, padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #A7F3D0', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                          />
                          <button onClick={() => setBonusToUse(selectedCustomer.bonusBalance)}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #A7F3D0', background: '#fff', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                          >Barchasi</button>
                        </div>
                      </motion.div>
                    )}

                    {/* Expected Bonus */}
                    {selectedCustomer && selectedCustomer.bonusPercent > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F0FDF4', borderRadius: '12px', border: '1.5px solid #D1FAE5' }}>
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>Ushbu xariddan tushadigan bonus:</span>
                        <span style={{ color: '#059669', fontWeight: 800, fontSize: 13 }}>
                          <CurrencyDisplay amount={finalTotal * (Number(selectedCustomer.bonusPercent) / 100)} />
                        </span>
                      </div>
                    )}

                    {/* Payment Methods */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>To'lov usuli</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'cash', label: "Naqd pul", icon: <Banknote size={20}/>, color: '#10B981' },
                          { id: 'card', label: 'Plastik karta', icon: <CreditCard size={20}/>, color: '#4A90E2' },
                          { id: 'mixed', label: 'Aralash', icon: <FileText size={20}/>, color: '#8B5CF6' },
                          { id: 'debt', label: 'Nasiya', icon: <Calendar size={20}/>, color: '#F59E0B' },
                        ].map((type, i) => {
                          const active = paymentType === type.id;
                          return (
                            <motion.button
                              key={type.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setPaymentType(type.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 14px', borderRadius: '14px', cursor: 'pointer',
                                border: active ? `2px solid ${type.color}` : '2px solid #DCE8F5',
                                background: active ? `${type.color}12` : '#F7FAFF',
                                color: active ? type.color : '#8A9BB5',
                                fontWeight: active ? 700 : 500,
                                fontSize: 14,
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                              }}
                            >
                              <div style={{
                                width: 36, height: 36, borderRadius: '10px',
                                background: active ? `${type.color}20` : '#F0F5FC',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, color: active ? type.color : '#8A9BB5',
                                transition: 'all 0.2s',
                              }}>
                                {type.icon}
                              </div>
                              {type.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mixed inputs */}
                    {paymentType === 'mixed' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ border: '1.5px solid #DCE8F5', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <FormInput label={`Naqd (${curr})`} type="number" value={mixedCash} onChange={e => setMixedCash(e.target.value)} placeholder="0" />
                        <FormInput label={`Karta (${curr})`} type="number" value={mixedCard} onChange={e => setMixedCard(e.target.value)} placeholder="0" />
                        {mDebt > 0 && (
                          <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13, padding: '10px 14px', background: '#FFFBEB', borderRadius: '10px' }}>
                            Nasiyaga o'tmoqda: <CurrencyDisplay amount={mDebt} />
                          </div>
                        )}
                        {mChange > 0 && (
                          <div style={{ color: '#10B981', fontWeight: 700, fontSize: 13, padding: '10px 14px', background: '#F0FDF4', borderRadius: '10px' }}>
                            Qaytim: <CurrencyDisplay amount={mChange} />
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Debt warning */}
                    {(paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && (
                      <>
                        {!selectedCustomer && (
                          <div style={{ color: '#EF4B4B', fontSize: 13, fontWeight: 600, padding: '12px 14px', background: '#FFF5F5', borderRadius: '12px', border: '1.5px solid #FFE0E0' }}>
                            ⚠ Nasiyaga sotish uchun kassa oynasidan mijozni tanlashingiz shart!
                          </div>
                        )}
                        <FormInput label="Qaytarish muddati *" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                      </>
                    )}
                  </div>

                  {/* Footer CTA */}
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #DCE8F5', flexShrink: 0, background: '#fff' }}>
                    <motion.button
                      whileHover={{ scale: isProcessing ? 1 : 1.01 }}
                      whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                      onClick={handleCheckout}
                      disabled={isProcessing || ((paymentType === 'debt' || (paymentType === 'mixed' && mDebt > 0)) && !selectedCustomer)}
                      style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '16px',
                        border: 'none',
                        background: isProcessing ? '#8A9BB5' : 'linear-gradient(135deg, #10B981, #34D399)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '16px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: isProcessing ? 'none' : '0 6px 20px -6px rgba(16,185,129,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      <CheckCircle size={20} />
                      {isProcessing ? 'Bajarilmoqda...' : "To'lovni yakunlash"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* Chek (Receipt) Modali */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Xarid cheki">
        {lastSale && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={lastSale} storeId={storeId} />

            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => dataService.printReceipt()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>
      {/* Shift Close Modal */}
      <Modal isOpen={isCloseShiftModalOpen} onClose={() => setIsCloseShiftModalOpen(false)} title="Smenani Yopish">
        <div className="flex-col" style={{ gap: '1.5rem' }}>
           <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '12px' }}>
              <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Kutilayotgan naqd pul:</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A' }}><CurrencyDisplay amount={shiftExpectedCash} /></div>
           </div>
           
           <FormInput 
             label="Kassadagi haqiqiy naqd pul (Sanab kiriting)" 
             type="number"
             value={actualCashInput}
             onChange={e => setActualCashInput(e.target.value)}
           />
           
           {actualCashInput && Number(actualCashInput) !== shiftExpectedCash && (
              <div style={{ padding: '1rem', background: '#FFF1F2', color: '#E11D48', borderRadius: '12px', fontWeight: 500 }}>
                 Farq: <CurrencyDisplay amount={Number(actualCashInput) - shiftExpectedCash} /> 
              </div>
           )}
           
           <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsCloseShiftModalOpen(false)}>Bekor qilish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCloseShift}>Smenani Yopish</button>
           </div>
        </div>
      </Modal>

      {/* Parked Sales Drawer */}
      <Drawer isOpen={isParkedDrawerOpen} onClose={() => setIsParkedDrawerOpen(false)} title="Chetga qo'yilgan savatlar">
         <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {parkedSales.filter(p => p.status !== 'deleted').length === 0 ? (
               <div style={{ textAlign: 'center', padding: '3rem', color: '#8A9BB5' }}>Bo'sh</div>
            ) : (
               parkedSales.filter(p => p.status !== 'deleted').map(p => (
                  <div key={p.id} style={{ padding: '1.5rem', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <div style={{ fontWeight: 600 }}>{p.items.length} ta mahsulot</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{new Date(p.createdAt).toLocaleTimeString()}</div>
                     </div>
                     <button className="btn btn-outline" onClick={() => handleRestoreParked(p)}>Davom ettirish</button>
                  </div>
               ))
            )}
         </div>
      </Drawer>

      {/* Daily Receipts Drawer */}
      <Drawer isOpen={isReceiptsDrawerOpen} onClose={() => setIsReceiptsDrawerOpen(false)} title="Kunlik Cheklar">
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: 600 }}>Sana:</label>
            <input type="date" value={selectedReceiptDate} onChange={e => setSelectedReceiptDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingReceipts ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
            ) : dailySales.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Bu sanada sotuvlar topilmadi</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dailySales.map(sale => (
                  <div key={sale.id} onClick={() => setSelectedOldReceipt(sale)} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{sale.customerName || 'Xaridor'}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(sale.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      <CurrencyDisplay amount={sale.finalTotal} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <Modal isOpen={!!selectedOldReceipt} onClose={() => setSelectedOldReceipt(null)} title="Chek">
        {selectedOldReceipt && (
          <div className="flex-col" style={{ gap: '1.5rem', alignItems: 'center' }}>
            <Receipt sale={selectedOldReceipt} storeId={storeId} />
            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedOldReceipt(null)}>Yopish</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => dataService.printReceipt()}>Chop etish</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default POS;
