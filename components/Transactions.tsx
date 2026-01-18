
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Search, ChevronDown, Camera, X, Box, Layers, FileDown, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

// Fix error in components/Transactions.tsx: Added return statement and export default to fix TS and export errors.
const Transactions: React.FC = () => {
  const { items, processTransaction, addItems } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Selection State
  const [quantity, setQuantity] = useState<number | string>(''); // Clear by default
  const [selectedUnit, setSelectedUnit] = useState<'base' | 'secondary'>('base');
  
  const [details, setDetails] = useState({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Refs for Focus Management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter items for autocomplete
  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedItem(null);
    setSearchTerm('');
    setQuantity('');
    setSelectedUnit('base');
  }, [activeTab]);

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm(`${item.sku} - ${item.name}`);
    setIsDropdownOpen(false);
    
    if (activeTab === 'Inbound' && item.secondaryUnit && item.conversionRate && item.conversionRate > 1) {
      setSelectedUnit('secondary');
    } else {
      setSelectedUnit('base');
    }

    setTimeout(() => qtyInputRef.current?.focus(), 10);
  };

  // Keyboard Navigation for Autocomplete
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      setIsDropdownOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      setIsDropdownOpen(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && filteredItems.length > 0) {
        selectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;

    const qtyValue = parseFloat(quantity.toString());
    if (isNaN(qtyValue) || qtyValue <= 0) {
      return;
    }

    let finalQty = qtyValue;
    let displayUnit = selectedItem.unit;
    let displayInputQty = qtyValue;

    if (selectedUnit === 'secondary' && selectedItem.secondaryUnit && selectedItem.conversionRate) {
      finalQty = qtyValue * selectedItem.conversionRate;
      displayUnit = selectedItem.secondaryUnit;
    }

    if (activeTab === 'Outbound' && finalQty > selectedItem.currentStock) {
      setMessage({ type: 'error', text: `Cannot add ${displayInputQty} ${displayUnit}. Only ${selectedItem.currentStock} ${selectedItem.unit} available.` });
      return;
    }

    const existing = cart.find(c => c.itemId === selectedItem.id);
    if (existing) {
       if (activeTab === 'Outbound' && (existing.quantity + finalQty) > selectedItem.currentStock) {
         setMessage({ type: 'error', text: 'Total quantity would exceed stock!' });
         return;
       }
       
       setCart(cart.map(c => c.itemId === selectedItem.id ? { 
           ...c, 
           quantity: c.quantity + finalQty,
           inputQuantity: (c.inputQuantity || 0) + displayInputQty,
           inputUnit: displayUnit
       } : c));
    } else {
      setCart([...cart, { 
        itemId: selectedItem.id, 
        itemName: selectedItem.name, 
        sku: selectedItem.sku, 
        quantity: finalQty,
        currentStock: selectedItem.currentStock,
        inputQuantity: displayInputQty,
        inputUnit: displayUnit
      }]);
    }
    
    setQuantity('');
    setSelectedItem(null);
    setSearchTerm('');
    setMessage(null);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const handleProcessTransaction = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const success = await processTransaction(activeTab, cart, details);
      if (success) {
        setCart([]);
        setDetails({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
        setMessage({ type: 'success', text: 'Transaction processed successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to process transaction.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { SKU: "ELEC-001", Name: "Wireless Mouse", Quantity: 5, Unit: "pcs" },
      { SKU: "OFF-001", Name: "A4 Paper Ream", Quantity: 2, Unit: "Box" }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "TransactionTemplate");
    writeFile(wb, `Jupiter_${activeTab}_Template.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      const newCartItems: CartItem[] = [];
      jsonData.forEach((row: any) => {
        const sku = String(row.SKU || "").trim();
        const qtyValue = parseFloat(row.Quantity);
        if (!sku || isNaN(qtyValue) || qtyValue <= 0) return;

        const item = items.find(i => i.sku === sku);
        if (item) {
          newCartItems.push({
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            quantity: qtyValue,
            currentStock: item.currentStock,
            inputQuantity: qtyValue,
            inputUnit: item.unit
          });
        }
      });

      if (newCartItems.length > 0) {
        setCart([...cart, ...newCartItems]);
        setMessage({ type: 'success', text: `Imported ${newCartItems.length} items to cart.` });
      } else {
        setMessage({ type: 'error', text: 'No matching items found in Excel.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import Excel file.' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transactions</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Process Inbound and Outbound inventory changes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
            <FileDown className="w-4 h-4" /> Template
          </button>
          <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
            <Upload className="w-4 h-4" /> Import
            <input ref={fileInputRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button 
          onClick={() => setActiveTab('Outbound')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'Outbound' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          OUTBOUND (STOCK OUT)
        </button>
        <button 
          onClick={() => setActiveTab('Inbound')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'Inbound' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          INBOUND (STOCK IN)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Add Items to Cart</h3>
            <div className="space-y-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Search by SKU or name..." 
                    className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
                {isDropdownOpen && searchTerm && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredItems.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className={`px-4 py-3 cursor-pointer border-b dark:border-zinc-800 last:border-0 ${idx === highlightedIndex ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                        onClick={() => selectItem(item)}
                      >
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.sku} • Stock: {item.currentStock} {item.unit}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="flex flex-wrap items-end gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Quantity</label>
                    <div className="flex gap-2">
                      <input 
                        ref={qtyInputRef}
                        type="number" 
                        placeholder="0"
                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                      />
                      <select 
                        className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-bold focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value as any)}
                      >
                        <option value="base">{selectedItem.unit}</option>
                        {selectedItem.secondaryUnit && <option value="secondary">{selectedItem.secondaryUnit}</option>}
                      </select>
                    </div>
                  </div>
                  <button onClick={addToCart} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-lg text-xs font-black uppercase hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">Add To Cart</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xs font-black text-zinc-500 uppercase">Cart Inventory</h3>
              <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">{cart.length} ITEMS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-800/20 text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3">Item Details</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {cart.map((c, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-xs">{c.itemName}</p>
                        <p className="text-[10px] text-zinc-400 font-mono tracking-tighter">{c.sku}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="font-black text-zinc-900 dark:text-zinc-100">{c.inputQuantity || c.quantity}</span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{c.inputUnit || 'pcs'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-zinc-300 hover:text-red-500 p-2 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-300 italic text-xs uppercase font-bold tracking-widest">Cart is empty</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors sticky top-6">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Process Summary</h3>
            <div className="space-y-4">
              {activeTab === 'Inbound' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Supplier Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      value={details.supplierName}
                      onChange={e => setDetails({...details, supplierName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">PO / RI Number</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      value={details.poNumber}
                      onChange={e => setDetails({...details, poNumber: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">SJ Number (Surat Jalan)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    value={details.sjNumber}
                    onChange={e => setDetails({...details, sjNumber: e.target.value})}
                  />
                </div>
              )}
              
              <div className="pt-4">
                <button 
                  onClick={handleProcessTransaction}
                  disabled={cart.length === 0 || isProcessing}
                  className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  FINALIZE {activeTab}
                </button>
              </div>
            </div>
          </div>
          
          {message && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300 ${
              message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-900/30 dark:text-green-400' : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-[10px] font-bold uppercase">{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
