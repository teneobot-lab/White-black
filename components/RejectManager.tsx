
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { RejectItem, RejectLog, RejectItemDetail } from '../types';
import { 
  Plus, Trash2, Search, X, AlertCircle, Layers, Scale, Edit3, 
  Save, Keyboard, ClipboardCheck, History, Copy, Database, 
  Download, FileSpreadsheet, FileUp, FileDown, CheckCircle, Package,
  ArrowRight
} from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import { utils, read, writeFile } from 'xlsx';

const generateId = () => Math.random().toString(36).substr(2, 9);

const RejectManager: React.FC = () => {
  const { 
    rejectMasterData, rejectLogs, addRejectLog, deleteRejectLog, 
    addRejectItem, updateRejectItem, deleteRejectItem, bulkAddRejectItems 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'master'>('new');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<RejectItemDetail[]>([]);
  const [rejectReason, setRejectReason] = useState('Damaged');
  const [searchQuery, setSearchQuery] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Entry Selection States
  const [selectedItem, setSelectedItem] = useState<RejectItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<number | undefined>(undefined);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  
  // Modal states for CRUD Master Item
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [masterFormData, setMasterFormData] = useState({
    sku: '', name: '', baseUnit: 'Pcs', 
    unit2: '', ratio2: '', unit3: '', ratio3: ''
  });

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const masterImportRef = useRef<HTMLInputElement>(null);

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
    setIsAutocompleteOpen(false);
  };

  const currentConversionRatio = useMemo(() => {
    if (!selectedItem) return 1;
    if (selectedUnit === selectedItem.baseUnit) return 1;
    if (selectedUnit === selectedItem.unit2) return selectedItem.ratio2 || 1;
    if (selectedUnit === selectedItem.unit3) return selectedItem.ratio3 || 1;
    return 1;
  }, [selectedItem, selectedUnit]);

  const handleAddToCart = () => {
    if (!selectedItem || !quantityInput) return;
    
    // totalBaseQuantity is quantity * ratio (e.g. 2 Box * 10 Pcs/Box = 20 Pcs)
    const baseQuantity = quantityInput * currentConversionRatio;
    
    setCartItems([...cartItems, {
      itemId: selectedItem.id, 
      itemName: selectedItem.name, 
      sku: selectedItem.sku,
      baseUnit: selectedItem.baseUnit, 
      quantity: quantityInput, 
      unit: selectedUnit,
      ratio: currentConversionRatio, 
      totalBaseQuantity: baseQuantity, 
      reason: rejectReason
    }]);
    setSelectedItem(null); 
    setSearchQuery(''); 
    setQuantityInput(undefined);
  };

  const handleSubmitReject = () => {
    if (cartItems.length === 0) return;
    addRejectLog({ id: generateId(), date, items: cartItems, notes, timestamp: new Date().toISOString() });
    setCartItems([]); setNotes('');
    setMessage({ type: 'success', text: 'Log reject berhasil disimpan.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleOpenMasterModal = (item?: RejectItem) => {
    if (item) {
      setEditingMasterId(item.id);
      setMasterFormData({
        sku: item.sku,
        name: item.name,
        baseUnit: item.baseUnit,
        unit2: item.unit2 || '',
        ratio2: item.ratio2?.toString() || '',
        unit3: item.unit3 || '',
        ratio3: item.ratio3?.toString() || ''
      });
    } else {
      setEditingMasterId(null);
      setMasterFormData({
        sku: '', name: '', baseUnit: 'Pcs', unit2: '', ratio2: '', unit3: '', ratio3: ''
      });
    }
    setIsMasterModalOpen(true);
  };

  const handleManualMasterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterFormData.sku || !masterFormData.name) return;
    
    const payload = {
      sku: masterFormData.sku,
      name: masterFormData.name,
      baseUnit: masterFormData.baseUnit,
      unit2: masterFormData.unit2 || undefined,
      ratio2: Number(masterFormData.ratio2) || undefined,
      unit3: masterFormData.unit3 || undefined,
      ratio3: Number(masterFormData.ratio3) || undefined,
      lastUpdated: new Date().toISOString()
    };

    if (editingMasterId) {
      updateRejectItem({ ...payload, id: editingMasterId });
      setMessage({ type: 'success', text: 'Master SKU berhasil diperbarui.' });
    } else {
      addRejectItem(payload);
      setMessage({ type: 'success', text: 'Master SKU baru berhasil disimpan.' });
    }
    
    setIsMasterModalOpen(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDownloadMasterTemplate = () => {
    const headers = [
      ["SKU", "Nama Barang", "Unit Utama", "Unit 2", "Ratio 2", "Unit 3", "Ratio 3"],
      ["R-001", "Kaca Depan", "Pcs", "Box", 10, "Pallet", 100],
      ["R-002", "Baut M8", "Kg", "Gram", 0.001, "Sak", 5]
    ];
    const ws = utils.aoa_to_sheet(headers);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reject Master Template");
    writeFile(wb, "Template_Reject_Master.xlsx");
  };

  const handleBulkImportMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = utils.sheet_to_json(ws);
        if (data.length === 0) {
          setMessage({ type: 'error', text: 'File kosong atau format salah.' });
          return;
        }
        const newMasterItems: Omit<RejectItem, 'id'>[] = data.map(row => ({
          sku: String(row.SKU || '').trim(),
          name: String(row["Nama Barang"] || 'Unnamed').trim(),
          baseUnit: String(row["Unit Utama"] || 'Pcs').trim(),
          unit2: row["Unit 2"] ? String(row["Unit 2"]) : undefined,
          ratio2: Number(row["Ratio 2"]) || undefined,
          unit3: row["Unit 3"] ? String(row["Unit 3"]) : undefined,
          ratio3: Number(row["Ratio 3"]) || undefined,
        }));
        bulkAddRejectItems(newMasterItems);
        setMessage({ type: 'success', text: `${newMasterItems.length} Master Reject diimpor.` });
        if (masterImportRef.current) masterImportRef.current.value = '';
      } catch (err) {
        setMessage({ type: 'error', text: 'Gagal memproses file import.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCopyToClipboard = (log: RejectLog) => {
    const d = new Date(log.date);
    const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
    let text = `Data Reject KKL ${dateStr}\n`;
    log.items.forEach(it => {
      text += `- ${it.itemName} (${it.sku}): ${it.quantity} ${it.unit} - ${it.reason}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Teks disalin ke clipboard!' });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleExportFlattened = () => {
    if (rejectLogs.length === 0) return;
    const allDates: string[] = Array.from(new Set(rejectLogs.map(l => l.date))).sort();
    const allSkus: string[] = Array.from(new Set(rejectLogs.flatMap(l => l.items.map(it => it.sku))));

    const flattenedData = allSkus.map(sku => {
      const itemInfo = rejectMasterData.find(m => m.sku === sku);
      const row: any = {
        "SKU": sku,
        "Nama Barang": itemInfo?.name || "Unknown",
        "Satuan Dasar": itemInfo?.baseUnit || "Pcs"
      };
      allDates.forEach(date => {
        // We sum the normalized base quantities
        const totalBaseForDate = rejectLogs
          .filter(l => l.date === date)
          .flatMap(l => l.items)
          .filter(it => it.sku === sku)
          .reduce((sum, it) => sum + Number(it.totalBaseQuantity || 0), 0);
        row[date] = totalBaseForDate > 0 ? totalBaseForDate : 0;
      });
      return row;
    });

    const ws = utils.json_to_sheet(flattenedData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Normalized Reject Log");
    writeFile(wb, `Audit_Reject_BaseUnit_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sortedLogs = [...rejectLogs].sort((a,b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-6 border-b border-card-border dark:border-slate-800">
        <div className="pb-4">
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Reject Hub</h1>
          <p className="text-sm text-muted-gray font-medium mt-1">Manage and audit defective assets across multiple units.</p>
        </div>
        <div className="flex space-x-6 overflow-x-auto pb-1 no-scrollbar max-w-full">
          <button onClick={() => setActiveTab('new')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'new' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><ClipboardCheck size={16} /> NEW ENTRY</button>
          <button onClick={() => setActiveTab('history')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><History size={16} /> LOG BOOK</button>
          <button onClick={() => setActiveTab('master')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'master' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-navy'}`}><Database size={16} /> MASTER DATA</button>
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
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1">Core Reason</label>
                            <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" placeholder="e.g. Broken Packaging" />
                        </div>
                    </div>

                    <div className="bg-surface/50 dark:bg-slate-950/50 p-6 rounded-3xl border border-card-border dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5 relative" ref={searchRef}>
                                <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1 mb-2 block">Item Selection</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <input type="text" value={searchQuery} onFocus={() => setIsAutocompleteOpen(true)} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search master list..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft" />
                                </div>
                                {isAutocompleteOpen && filteredRejectMaster.length > 0 && searchQuery && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl shadow-soft-lg z-50 overflow-hidden">
                                        {filteredRejectMaster.map(item => (
                                            <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left px-5 py-3 hover:bg-surface border-b last:border-0 border-slate-50 dark:border-slate-800 transition-colors">
                                                <p className="font-bold text-sm text-navy dark:text-white">{item.name}</p>
                                                <p className="text-[10px] text-primary font-bold uppercase">{item.sku}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1 mb-2 block">Qty</label>
                                <input type="number" step="any" value={quantityInput ?? ''} onChange={e => setQuantityInput(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft font-bold" placeholder="0" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1 mb-2 block">Unit</label>
                                <select 
                                  value={selectedUnit} 
                                  onChange={e => setSelectedUnit(e.target.value)}
                                  disabled={!selectedItem}
                                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-30"
                                >
                                  {selectedItem ? (
                                    <>
                                      <option value={selectedItem.baseUnit}>{selectedItem.baseUnit} (1x)</option>
                                      {selectedItem.unit2 && <option value={selectedItem.unit2}>{selectedItem.unit2} ({selectedItem.ratio2}x)</option>}
                                      {selectedItem.unit3 && <option value={selectedItem.unit3}>{selectedItem.unit3} ({selectedItem.ratio3}x)</option>}
                                    </>
                                  ) : <option>Select item first</option>}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={handleAddToCart} disabled={!selectedItem || !quantityInput} className="w-full py-3.5 bg-navy dark:bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-soft hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                                  <Plus size={14} /> ADD
                                </button>
                            </div>
                        </div>
                        {selectedItem && quantityInput && (
                           <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                              Conversion: {quantityInput} {selectedUnit} = {(quantityInput * currentConversionRatio).toFixed(2)} {selectedItem.baseUnit}
                           </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft h-full flex flex-col overflow-hidden">
                    <div className="p-6 bg-surface/30 dark:bg-slate-950/30 border-b border-card-border dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-navy dark:text-white">Live Draft</h3>
                        <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">{cartItems.length} RECORD</span>
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[400px] custom-scrollbar">
                        {cartItems.map((it, idx) => (
                            <div key={idx} className="p-4 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-2xl flex justify-between items-center group">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-navy dark:text-white truncate uppercase tracking-tight">{it.itemName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{it.quantity} {it.unit}</span>
                                      <ArrowRight size={10} className="text-slate-300" />
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{it.totalBaseQuantity} {it.baseUnit}</span>
                                    </div>
                                    <p className="text-[9px] text-muted-gray font-medium uppercase mt-1 italic">{it.reason}</p>
                                </div>
                                <button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="p-8 bg-surface/50 dark:bg-slate-950/50 space-y-4 border-t border-card-border dark:border-slate-800">
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="System notes..." className="w-full p-4 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 shadow-inner font-medium" />
                        <button onClick={handleSubmitReject} disabled={cartItems.length === 0} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-soft-lg hover:bg-red-600 active:scale-95 transition-all disabled:opacity-30">Commit To Records</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-end">
                  <button onClick={handleExportFlattened} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 text-navy dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-soft hover:bg-surface transition-all active:scale-95">
                      <FileSpreadsheet size={16} className="text-emerald-500" /> Export BaseUnit Normalized XLSX
                  </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-surface/50 dark:bg-slate-950 border-b border-card-border dark:border-slate-800">
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <th className="px-8 py-5">Date</th>
                                  <th className="px-6 py-5">Volume Breakdown</th>
                                  <th className="px-6 py-5">System Notes</th>
                                  <th className="px-8 py-5 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                              {sortedLogs.map(log => (
                                  <tr key={log.id} className="hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-colors group">
                                      <td className="px-8 py-5 text-xs font-bold text-navy dark:text-white uppercase tracking-tighter">{log.date}</td>
                                      <td className="px-6 py-5">
                                          <div className="text-xs font-black text-navy dark:text-white tracking-tighter">{log.items.length} Unique SKUs</div>
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                            {log.items.slice(0, 3).map((it, i) => (
                                              <span key={i} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 uppercase tracking-tighter">
                                                {it.quantity}{it.unit} {it.itemName}
                                              </span>
                                            ))}
                                            {log.items.length > 3 && <span className="text-[9px] font-bold text-slate-400">+{log.items.length - 3} more</span>}
                                          </div>
                                      </td>
                                      <td className="px-6 py-5 text-[10px] text-muted-gray italic font-bold uppercase tracking-widest opacity-60">
                                          {log.notes || 'No system notes recorded'}
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                              <button onClick={() => handleCopyToClipboard(log)} className="p-2.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" title="Copy Text Summary">
                                                  <Copy size={16} />
                                              </button>
                                              <button onClick={() => { if(confirm('Hapus log permanen?')) deleteRejectLog(log.id); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'master' && (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="relative flex-1 group w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="text" placeholder="Search master catalog..." value={masterSearch} onChange={e => setMasterSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-soft font-medium" />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button onClick={handleDownloadMasterTemplate} className="p-2.5 bg-white dark:bg-slate-800 border border-card-border dark:border-slate-700 rounded-xl shadow-soft hover:bg-surface transition-all group">
                         <FileDown size={18} className="text-primary group-hover:scale-110 transition-transform" />
                      </button>
                      <button onClick={() => masterImportRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-3 bg-navy dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-soft hover:bg-slate-800 transition-all active:scale-95 flex-1 sm:flex-none">
                          <FileUp size={16} /> Bulk Import
                      </button>
                      <input type="file" ref={masterImportRef} onChange={handleBulkImportMaster} accept=".xlsx, .xls, .csv" className="hidden" />
                      <button onClick={() => handleOpenMasterModal()} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-primary transition-all active:scale-95 flex-1 sm:flex-none">
                          <Plus size={16} /> New SKU
                      </button>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
                   <table className="w-full text-left">
                       <thead className="bg-surface/50 dark:bg-slate-950 border-b border-card-border dark:border-slate-800">
                           <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                               <th className="px-8 py-5">Identifier</th>
                               <th className="px-6 py-5">Asset Name</th>
                               <th className="px-6 py-5">Unit Configuration</th>
                               <th className="px-8 py-5 text-right">Management</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                           {rejectMasterData.filter(i => i.name.toLowerCase().includes(masterSearch.toLowerCase()) || i.sku.toLowerCase().includes(masterSearch.toLowerCase())).map(item => (
                               <tr key={item.id} className="hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-colors group">
                                   <td className="px-8 py-5 font-mono text-[10px] font-black text-primary uppercase">{item.sku}</td>
                                   <td className="px-6 py-5 text-sm font-bold text-navy dark:text-white uppercase tracking-tight">{item.name}</td>
                                   <td className="px-6 py-5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.baseUnit}</span>
                                        {item.unit2 && (
                                          <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded">
                                            {item.unit2} ({item.ratio2}x)
                                          </span>
                                        )}
                                        {item.unit3 && (
                                          <span className="text-[10px] font-black text-secondary uppercase bg-secondary/5 px-2 py-0.5 rounded">
                                            {item.unit3} ({item.ratio3}x)
                                          </span>
                                        )}
                                      </div>
                                   </td>
                                   <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleOpenMasterModal(item)} className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit3 size={16} /></button>
                                        <button onClick={() => { if(confirm('Hapus SKU dari Master?')) deleteRejectItem(item.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                      </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
              </div>
          </div>
      )}

      {/* CRUD Master Reject Item Modal */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-soft-lg border border-card-border dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
             <div className="px-8 py-6 border-b border-card-border dark:border-slate-800 flex justify-between items-center bg-surface/30 dark:bg-slate-950/30">
               <div>
                 <h2 className="text-lg font-bold text-navy dark:text-white">{editingMasterId ? 'Edit SKU Reject' : 'Tambah SKU Reject'}</h2>
                 <p className="text-[10px] font-black text-muted-gray uppercase tracking-widest mt-1">Multi-Unit Conversion Setup</p>
               </div>
               <button onClick={() => setIsMasterModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm transition-all"><X size={18} /></button>
             </div>
             
             <form onSubmit={handleManualMasterSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">SKU Identifier</label>
                    <input required type="text" value={masterFormData.sku} onChange={e => setMasterFormData({...masterFormData, sku: e.target.value})} className="w-full px-4 py-3 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="e.g. R-001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Nama Barang</label>
                    <input required type="text" value={masterFormData.name} onChange={e => setMasterFormData({...masterFormData, name: e.target.value})} className="w-full px-4 py-3 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="Asset Name..." />
                  </div>
                </div>

                <div className="p-6 bg-surface/50 dark:bg-slate-950/30 rounded-2xl border border-card-border dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit tiers & Ratios</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Base Unit (1x)</label>
                      <input required type="text" value={masterFormData.baseUnit} onChange={e => setMasterFormData({...masterFormData, baseUnit: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Pcs" />
                    </div>
                    <div className="col-span-2 text-[10px] font-bold text-slate-400 pb-3">The primary measurement for audit.</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Unit 2 (Opt)</label>
                      <input type="text" value={masterFormData.unit2} onChange={e => setMasterFormData({...masterFormData, unit2: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Box" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Ratio (How many base units per Unit 2)</label>
                      <input type="number" step="any" value={masterFormData.ratio2} onChange={e => setMasterFormData({...masterFormData, ratio2: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="e.g. 10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Unit 3 (Opt)</label>
                      <input type="text" value={masterFormData.unit3} onChange={e => setMasterFormData({...masterFormData, unit3: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Pallet" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-black text-muted-gray uppercase tracking-widest ml-1">Ratio (How many base units per Unit 3)</label>
                      <input type="number" step="any" value={masterFormData.ratio3} onChange={e => setMasterFormData({...masterFormData, ratio3: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="e.g. 100" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-card-border dark:border-slate-800">
                  <button type="button" onClick={() => setIsMasterModalOpen(false)} className="px-6 py-2.5 font-black text-[10px] text-muted-gray uppercase tracking-widest">Batal</button>
                  <button type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-primary active:scale-95 flex items-center gap-2">
                    <Save size={14} /> {editingMasterId ? 'UPDATE SKU' : 'SIMPAN SKU'}
                  </button>
                </div>
             </form>
           </div>
        </div>
      )}

      {message && (
        <div className={`fixed bottom-10 right-10 p-5 rounded-2xl shadow-soft-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 border border-white/20 backdrop-blur-md z-[110] ${message.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default RejectManager;
