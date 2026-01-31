
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { Plus, Trash2, Search, X, AlertCircle, Layers, Scale, Edit3, Save, Keyboard, ClipboardCheck, History, Copy, Database, Download, FileSpreadsheet } from 'lucide-react';
import useDebounce from '../hooks/useDebounce';

const generateId = () => Math.random().toString(36).substr(2, 9);

const RejectManager: React.FC = () => {
  const { 
    rejectMasterData, rejectLogs, addRejectLog, deleteRejectLog 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'master'>('new');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<RejectItemDetail[]>([]);
  const [rejectReason, setRejectReason] = useState('Damaged');
  const [searchQuery, setSearchQuery] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [conversionRatio, setConversionRatio] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsAutocompleteOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRejectMaster = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    return rejectMasterData.filter(item => 
      item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ).slice(0, 8); 
  }, [debouncedSearchQuery, rejectMasterData]);

  const handleSelectItem = (item: RejectItem) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setSelectedUnit(item.baseUnit);
    setConversionRatio(1);
    setIsAutocompleteOpen(false);
  };

  const handleAddToCart = () => {
    if (!selectedItem || !quantityInput) return;
    const requestedBase = conversionRatio !== 0 ? quantityInput / conversionRatio : 0;
    setCartItems([...cartItems, {
      itemId: selectedItem.id, itemName: selectedItem.name, sku: selectedItem.sku,
      baseUnit: selectedItem.baseUnit, quantity: quantityInput, unit: selectedUnit,
      ratio: conversionRatio, totalBaseQuantity: requestedBase, reason: rejectReason
    }]);
    setSelectedItem(null); setSearchQuery(''); setQuantityInput(undefined);
  };

  const handleSubmitReject = () => {
    if (cartItems.length === 0) return;
    addRejectLog({ id: generateId(), date, items: cartItems, notes, timestamp: new Date().toISOString() });
    setCartItems([]); setNotes('');
  };

  const sortedLogs = [...rejectLogs].sort((a,b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-card-border dark:border-slate-800">
        <div className="pb-4">
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Reject Hub</h1>
          <p className="text-sm text-muted-gray font-medium mt-1">Manage damaged or returned assets effectively.</p>
        </div>
        <div className="flex space-x-6">
          <button onClick={() => setActiveTab('new')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'new' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><ClipboardCheck size={16} /> NEW ENTRY</button>
          <button onClick={() => setActiveTab('history')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><History size={16} /> LOG BOOK</button>
          <button onClick={() => setActiveTab('master')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'master' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><Database size={16} /> MASTER DATA</button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-red-50 text-red-500 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
                        <h3 className="font-bold text-lg text-navy dark:text-white">Reporting Desk</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1">Detection Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1">Core Reason</label>
                            <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Broken Packaging" />
                        </div>
                    </div>

                    <div className="bg-surface/50 dark:bg-slate-950/50 p-6 rounded-3xl border border-card-border dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-6 relative" ref={searchRef}>
                                <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1 mb-2 block">Item Selection</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <input type="text" value={searchQuery} onFocus={() => setIsAutocompleteOpen(true)} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search master list..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft" />
                                </div>
                                {isAutocompleteOpen && filteredRejectMaster.length > 0 && searchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl shadow-soft-lg z-50 overflow-hidden">
                                        {filteredRejectMaster.map(item => (
                                            <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left px-5 py-3 hover:bg-surface border-b last:border-0 border-slate-50 dark:border-slate-800">
                                                <p className="font-bold text-sm text-navy dark:text-white">{item.name}</p>
                                                <p className="text-[10px] text-muted-gray font-bold uppercase">{item.sku}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1 mb-2 block">Qty</label>
                                <input type="number" value={quantityInput ?? ''} onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft" placeholder="0" />
                            </div>
                            <div className="md:col-span-3">
                                <button onClick={handleAddToCart} disabled={!selectedItem || !quantityInput} className="w-full py-3.5 bg-navy dark:bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-soft hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30">Add Log</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft h-full flex flex-col overflow-hidden">
                    <div className="p-6 bg-surface/30 dark:bg-slate-950/30 border-b border-card-border dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-navy dark:text-white">Live Draft</h3>
                        <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">{cartItems.length} RECORD</span>
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[400px]">
                        {cartItems.map((it, idx) => (
                            <div key={idx} className="p-4 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-navy dark:text-white truncate max-w-[150px]">{it.itemName}</p>
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{it.quantity} {it.unit} & bull; {it.reason}</p>
                                </div>
                                <button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="p-8 bg-surface/50 dark:bg-slate-950/50 space-y-4 border-t border-card-border dark:border-slate-800">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="System notes..." className="w-full p-4 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 shadow-inner" />
                        <button onClick={handleSubmitReject} disabled={cartItems.length === 0} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-soft-lg hover:bg-red-600 active:scale-95 transition-all disabled:opacity-30">Commit To Records</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-surface/50 dark:bg-slate-950 border-b border-card-border dark:border-slate-800">
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <th className="px-8 py-5">Date</th>
                              <th className="px-6 py-5">Volume</th>
                              <th className="px-6 py-5">System Notes</th>
                              <th className="px-8 py-5 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {sortedLogs.map(log => (
                              <tr key={log.id} className="hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="px-8 py-5 text-xs font-bold text-navy dark:text-white">{log.date}</td>
                                  <td className="px-6 py-5">
                                      <div className="text-xs font-bold text-navy dark:text-white">{log.items.length} SKUs</div>
                                      <div className="text-[10px] text-muted-gray font-medium truncate max-w-[200px]">{log.items.map(i => i.itemName).join(', ')}</div>
                                  </td>
                                  <td className="px-6 py-5 text-xs text-muted-gray italic font-medium">{log.notes || 'No notes added'}</td>
                                  <td className="px-8 py-5 text-right">
                                      <button onClick={() => deleteRejectLog(log.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="text" placeholder="Search master catalog..." value={masterSearch} onChange={e => setMasterSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-soft" />
                  </div>
                  <button className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-glow-primary flex items-center gap-2 transition-all active:scale-95"><Plus size={16} /> New SKU</button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
                   <table className="w-full text-left">
                       <thead className="bg-surface/50 dark:bg-slate-950 border-b border-card-border dark:border-slate-800">
                           <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <th className="px-8 py-5">Identifier</th>
                               <th className="px-6 py-5">Asset Name</th>
                               <th className="px-6 py-5">Base Unit</th>
                               <th className="px-8 py-5 text-right">Management</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                           {rejectMasterData.filter(i => i.name.toLowerCase().includes(masterSearch.toLowerCase())).map(item => (
                               <tr key={item.id} className="hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-colors">
                                   <td className="px-8 py-5 font-mono text-[10px] font-black text-primary uppercase">{item.sku}</td>
                                   <td className="px-6 py-5 text-sm font-bold text-navy dark:text-white uppercase tracking-tight">{item.name}</td>
                                   <td className="px-6 py-5 text-[10px] font-black text-muted-gray uppercase">{item.baseUnit}</td>
                                   <td className="px-8 py-5 text-right">
                                      <button className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit3 size={16} /></button>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default RejectManager;
