
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  ChevronDown, 
  X, 
  Box, 
  Calendar, 
  User, 
  Hash,
  FileText,
  ArrowRight,
  Keyboard
} from 'lucide-react';

const Transactions: React.FC = () => {
  const { items, processTransaction } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Refs untuk navigasi fokus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State Input Item
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // Untuk navigasi panah
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<number>(0); 
  const [selectedUnit, setSelectedUnit] = useState<'base' | 'secondary'>('base');
  
  // Header Info
  const [details, setDetails] = useState({ 
    supplierName: '', 
    poNumber: '', 
    riNumber: '', 
    sjNumber: '',
    date: new Date().toISOString().split('T')[0] 
  });
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset active index saat filter berubah
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setIsDropdownOpen(false);
    setActiveIndex(-1);
    // Auto focus ke quantity setelah memilih item
    setTimeout(() => qtyInputRef.current?.focus(), 10);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filteredItems[activeIndex]) {
        selectItem(filteredItems[activeIndex]);
      } else if (filteredItems.length === 1) {
        selectItem(filteredItems[0]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;
    if (quantity <= 0) return;

    let finalQty = quantity;
    if (selectedUnit === 'secondary' && selectedItem.secondaryUnit && selectedItem.conversionRate) {
      finalQty = quantity * selectedItem.conversionRate;
    }

    if (activeTab === 'Outbound' && finalQty > selectedItem.currentStock) {
      setMessage({ type: 'error', text: `Stok tidak mencukupi (${selectedItem.currentStock} tersedia).` });
      return;
    }

    setCart([...cart, { 
      itemId: selectedItem.id, 
      itemName: selectedItem.name, 
      sku: selectedItem.sku, 
      quantity: finalQty, 
      currentStock: selectedItem.currentStock,
      inputQuantity: quantity, 
      inputUnit: selectedUnit === 'secondary' ? selectedItem.secondaryUnit : selectedItem.unit
    }]);
    
    // Reset state
    setQuantity(0); 
    setSelectedItem(null); 
    setSearchTerm('');
    setSelectedUnit('base');
    
    // Fokus kembali ke pencarian untuk barang berikutnya
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addToCart();
    }
  };

  const handleProcess = async () => {
    if (cart.length === 0) return;
    const success = await processTransaction(activeTab, cart, details);
    if (success) {
      setCart([]); 
      setMessage({ type: 'success', text: 'Transaksi berhasil diproses ke server.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-[1200px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-soft border border-card-border dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white shadow-sm ${activeTab === 'Outbound' ? 'bg-primary' : 'bg-secondary'}`}>
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy dark:text-white leading-none">Formulir Transaksi</h1>
            <p className="text-[10px] font-bold text-muted-gray uppercase tracking-widest mt-1">Mode: {activeTab}</p>
          </div>
        </div>
        
        <div className="p-1 bg-surface dark:bg-slate-800 rounded-xl flex gap-1">
          <button onClick={() => setActiveTab('Outbound')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Outbound' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-muted-gray hover:text-navy'}`}>PENGELUARAN</button>
          <button onClick={() => setActiveTab('Inbound')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'Inbound' ? 'bg-white dark:bg-slate-700 text-secondary shadow-sm' : 'text-muted-gray hover:text-navy'}`}>PENERIMAAN</button>
        </div>
      </div>

      {/* Accurate Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-soft border border-card-border dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-gray uppercase tracking-wider">
              <User size={12} className="text-primary" /> {activeTab === 'Inbound' ? 'Pemasok / Vendor' : 'Penerima / Customer'}
            </label>
            <input type="text" value={details.supplierName} onChange={e => setDetails({...details, supplierName: e.target.value})} className="w-full px-3 py-2 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-gray uppercase tracking-wider">
              <Calendar size={12} className="text-primary" /> Tanggal
            </label>
            <input type="date" value={details.date} onChange={e => setDetails({...details, date: e.target.value})} className="w-full px-3 py-2 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-gray uppercase tracking-wider">
              <Hash size={12} className="text-primary" /> No. Referensi
            </label>
            <input type="text" value={details.sjNumber} onChange={e => setDetails({...details, sjNumber: e.target.value})} className="w-full px-3 py-2 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-muted-gray uppercase tracking-wider">
              <FileText size={12} className="text-primary" /> No. Instruksi
            </label>
            <input type="text" value={details.poNumber} onChange={e => setDetails({...details, poNumber: e.target.value})} className="w-full px-3 py-2 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Table & Keyboard Workflow */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-card-border dark:border-slate-800 overflow-hidden">
        {/* Rapid Entry Row */}
        <div className="p-3 bg-surface/50 dark:bg-slate-950/50 border-b border-card-border dark:border-slate-800 grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12 md:col-span-6 relative" ref={dropdownRef}>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block flex justify-between">
              Cari Produk <span className="flex items-center gap-1 opacity-50"><Keyboard size={10} /> Arrow & Enter</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchTerm}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => {setSearchTerm(e.target.value); setIsDropdownOpen(true);}}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {isDropdownOpen && searchTerm && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-900 mt-1 rounded-lg shadow-soft-lg border border-card-border dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                {filteredItems.map((item, index) => (
                  <button 
                    key={item.id} 
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors border-b last:border-0 border-slate-50 dark:border-slate-800 ${activeIndex === index ? 'bg-primary/10 text-primary' : 'hover:bg-surface dark:hover:bg-slate-800'}`}
                  >
                    <span className="font-bold text-navy dark:text-white">{item.sku}</span> - {item.name} 
                    <span className="ml-2 text-[10px] text-muted-gray opacity-60">({item.currentStock} {item.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Qty</label>
            <input 
              ref={qtyInputRef}
              type="number" 
              value={quantity || ''}
              onKeyDown={handleQtyKeyDown}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
            />
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Satuan</label>
            <div className="relative">
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              >
                <option value="base">{selectedItem?.unit || 'Pcs'}</option>
                {selectedItem?.secondaryUnit && <option value="secondary">{selectedItem.secondaryUnit}</option>}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="col-span-4 md:col-span-2">
            <button 
              onClick={addToCart}
              disabled={!selectedItem || quantity <= 0}
              className="w-full py-2 bg-primary text-white rounded-lg text-xs font-black shadow-sm hover:bg-blue-600 disabled:opacity-30 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase"
            >
              <Plus size={14} /> TAMBAH
            </button>
          </div>
        </div>

        {/* List Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface/30 dark:bg-slate-950/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-card-border dark:border-slate-800">
                <th className="px-6 py-3 w-16 text-center">No.</th>
                <th className="px-4 py-3">Kode / SKU</th>
                <th className="px-4 py-3">Deskripsi Barang</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {cart.map((item, idx) => (
                <tr key={idx} className="group hover:bg-surface/50 dark:hover:bg-slate-800/20 transition-colors animate-in slide-in-from-left-2 duration-200">
                  <td className="px-6 py-3 text-center text-[11px] font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{item.sku}</td>
                  <td className="px-4 py-3 text-xs font-medium text-navy dark:text-white uppercase tracking-tight">{item.itemName}</td>
                  <td className="px-4 py-3 text-right text-xs font-black text-navy dark:text-white">{item.inputQuantity}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-muted-gray uppercase">{item.inputUnit}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center opacity-30">
                    <div className="flex flex-col items-center gap-2">
                      <Box size={32} className="text-muted-gray" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-gray">Daftar item masih kosong</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Final Summary */}
        <div className="p-6 bg-surface/30 dark:bg-slate-950/30 border-t border-card-border dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Unik</span>
              <span className="text-sm font-black text-navy dark:text-white">{cart.length} SKU</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Qty</span>
              <span className="text-sm font-black text-navy dark:text-white">
                {cart.reduce((a, b) => a + (b.inputQuantity || 0), 0)} Unit
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleProcess}
            disabled={cart.length === 0}
            className={`px-12 py-3.5 rounded-2xl font-black text-[11px] text-white shadow-soft-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest ${activeTab === 'Inbound' ? 'bg-secondary' : 'bg-primary'} disabled:opacity-30`}
          >
            SIMPAN TRANSAKSI <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Alert Popups */}
      {message && (
        <div className={`fixed bottom-10 right-10 p-5 rounded-2xl shadow-soft-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 border border-white/20 backdrop-blur-md ${
          message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default Transactions;
