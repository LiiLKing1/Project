const fs = require('fs');

const path = 'c:/Users/i7/Desktop/Project/SavdogarMobile/src/pages/Sales/POS.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add state for cart drawer
content = content.replace('const [search, setSearch] = useState(\'\');', 'const [search, setSearch] = useState(\'\');\n  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);');

// Find the return statement
const returnIndex = content.indexOf('return (\n    <div className="pos-layout">');
if (returnIndex === -1) {
    console.error('Could not find return statement');
    process.exit(1);
}

// Keep everything before return
const beforeReturn = content.substring(0, returnIndex);

const newReturn = `return (
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
              className={\`bg-white rounded-xl p-3 border shadow-sm transition-transform active:scale-95 flex flex-col \${p.stock > 0 ? 'border-gray-200 cursor-pointer' : 'border-gray-100 opacity-60'}\`}
            >
              <div className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px] mb-2">{p.name}</div>
              <div className="mt-auto flex flex-col gap-1">
                <div className="text-blue-600 font-bold"><CurrencyDisplay amount={p.sellPrice} /></div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{p.barcode || 'Kod yo\\'q'}</span>
                  <span className={\`font-medium \${p.stock <= p.minStock ? 'text-red-500' : 'text-green-500'}\`}>Qoldiq: {p.stock}</span>
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
              className={\`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors \${paymentType === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}\`}
            >
              <Banknote size={24} />
              <span className="text-xs font-semibold">Naqd</span>
            </button>
            <button 
              onClick={() => setPaymentType('card')}
              className={\`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors \${paymentType === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}\`}
            >
              <CreditCard size={24} />
              <span className="text-xs font-semibold">Karta</span>
            </button>
            <button 
              onClick={() => setPaymentType('debt')}
              className={\`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors \${paymentType === 'debt' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}\`}
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
`;

fs.writeFileSync(path, beforeReturn + newReturn);
console.log('Successfully updated POS.jsx');
