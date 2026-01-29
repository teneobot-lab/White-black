
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Search, ChevronDown, Camera, X, Box, Layers, Calendar, Sparkles } from 'lucide-react';

const Transactions: React.FC = () => {
  const { items, processTransaction } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState<number | string>(''); 
  const [selectedUnit, setSelectedUnit] = useState<'base' | 'secondary'>('base');
  
  const [details, setDetails] = useState({ 
    supplierName: '', poNumber: '', riNumber: '', sjNumber: '',
    date: new Date().toISOString().split('T')[0] 
  });
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = () => {
    if (!selectedItem) return;
    const qtyValue = parseFloat(quantity.toString());
    if (isNaN(qtyValue) || qtyValue <= 0) return;

    let finalQty = qtyValue;
    if (selectedUnit === 'secondary' && selectedItem.secondaryUnit && selectedItem.conversionRate) {
      finalQty = qtyValue * selectedItem.conversionRate;
    }

    if (activeTab === 'Outbound' && finalQty > selectedItem.currentStock) {
      setMessage({ type: 'error', text: `Insufficient stock.` });
      return;
    }

    setCart([...cart, { 
      itemId: selectedItem.id, itemName: selectedItem.name, sku: selectedItem.sku, 
      quantity: finalQty, currentStock: selectedItem.currentStock,
      inputQuantity: qtyValue, inputUnit: selectedUnit === 'secondary' ? selectedItem.secondaryUnit : selectedItem.unit
    }]);
    
    setQuantity(''); setSelectedItem(null); setSearchTerm('');
  };

  const handleProcess = async () => {
    if (cart.length === 0) return;
    const success = await processTransaction(activeTab, cart, details);
    if (success) {
      setCart([]); setMessage({ type: 'success', text: 'Success! Order processed.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Movement Desk</h1>
          <p className="text-sm text-muted-gray font-medium">Issue or receive warehouse shipments.</p>
        </div>
        
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-card-border dark:border-slate-800 flex gap-1">
          <button 
            onClick={() => setActiveTab('Outbound')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'Outbound' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted-gray hover:text-navy'}`}
          >
            Outbound
          </button>
          <button 
            onClick={() => setActiveTab('Inbound')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'Inbound' ? 'bg-secondary text-white shadow-glow-primary' : 'text-muted-gray hover:text-navy'}`}
          >
            Inbound
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-soft border border-card-border dark:border-slate-800 space-y-8">
            <h3 className="text-lg font-bold text-navy dark:text-white flex items-center gap-2">
              <Sparkles className="text-primary" size={20} /> Selection
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2 relative">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Search SKU</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => {setSearchTerm(e.target.value); setIsDropdownOpen(true);}}
                      className="w-full bg-surface dark:bg-slate-950 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all"
                      placeholder="SKU or product name..."
                    />
                  </div>
                  {isDropdownOpen && searchTerm && filteredItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-900 mt-2 rounded-2xl shadow-soft-lg border border-card-border dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                      {filteredItems.map(item => (
                        <button key={item.id} onClick={() => {setSelectedItem(item); setSearchTerm(item.name); setIsDropdownOpen(false);}} className="w-full text-left px-5 py-3 hover:bg-surface dark:hover:bg-slate-800 text-sm font-medium transition-colors border-b last:border-0 border-slate-50 dark:border-slate-800">
                          {item.name} <span className="text-[10px] text-muted-gray ml-2">{item.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Quantity</label>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-surface dark:bg-slate-950 rounded-2xl py-3 px-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Unit</label>
                    <div className="relative">
                        <select 
                          value={selectedUnit}
                          onChange={(e) => setSelectedUnit(e.target.value as any)}
                          className="w-full bg-surface dark:bg-slate-950 rounded-2xl py-3 px-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all appearance-none"
                        >
                          <option value="base">{selectedItem?.unit || 'Base'}</option>
                          {selectedItem?.secondaryUnit && <option value="secondary">{selectedItem.secondaryUnit}</option>}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
               </div>
            </div>

            <button 
              onClick={addToCart}
              disabled={!selectedItem || !quantity}
              className="w-full py-4 bg-navy dark:bg-primary text-white rounded-2xl font-bold text-sm shadow-soft hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30"
            >
              Add Item to Cart
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-soft border border-card-border dark:border-slate-800">
             <h3 className="text-lg font-bold text-navy dark:text-white mb-6">Document Info</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Shipping Date</label>
                  <input type="date" value={details.date} onChange={e => setDetails({...details, date: e.target.value})} className="w-full bg-surface dark:bg-slate-950 rounded-2xl py-3 px-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">{activeTab === 'Inbound' ? 'Supplier Name' : 'Recipient'}</label>
                  <input type="text" value={details.supplierName} onChange={e => setDetails({...details, supplierName: e.target.value})} className="w-full bg-surface dark:bg-slate-950 rounded-2xl py-3 px-4 text-sm outline-none border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all" placeholder="Reference name..." />
                </div>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-soft-lg border border-card-border dark:border-slate-800 flex flex-col min-h-[500px] sticky top-28 overflow-hidden">
          <div className="p-8 bg-surface/30 dark:bg-slate-950/30 border-b border-card-border dark:border-slate-800">
            <h3 className="text-xl font-bold text-navy dark:text-white flex items-center gap-3">
              <ShoppingCart size={22} className="text-primary" /> Cart Summary
            </h3>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[400px]">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-surface dark:bg-slate-950 rounded-2xl group animate-in slide-in-from-right-4 duration-300">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-soft border border-card-border dark:border-slate-800">
                  <Box size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy dark:text-white truncate">{item.itemName}</p>
                  <p className="text-[10px] text-muted-gray font-bold uppercase">{item.inputQuantity} {item.inputUnit}</p>
                </div>
                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center opacity-30">
                <ShoppingCart size={40} className="text-muted-gray mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
              </div>
            )}
          </div>
          <div className="p-8 bg-surface/50 dark:bg-slate-950/50 space-y-4 border-t border-card-border dark:border-slate-800">
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-gray font-medium">Total Vol.</span>
                <span className="text-navy dark:text-white font-bold">{cart.length} SKUs</span>
             </div>
             <button 
               onClick={handleProcess}
               disabled={cart.length === 0}
               className={`w-full py-4 rounded-2xl font-bold text-white shadow-soft-lg hover:scale-[1.01] active:scale-95 transition-all ${activeTab === 'Inbound' ? 'bg-secondary' : 'bg-primary'}`}
             >
               Finalize {activeTab}
             </button>
          </div>
        </div>
      </div>
      {message && (
        <div className={`fixed bottom-10 right-10 p-5 rounded-3xl shadow-soft-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle /> : <AlertCircle />}
          <span className="font-bold text-sm">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-4 p-1 hover:bg-black/5 rounded-full"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default Transactions;
