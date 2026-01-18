
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { Transaction, CartItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, FileText, Calendar, Filter, Download, Image, X, Edit2, Plus, Trash2, FileSpreadsheet, Search, CheckCircle, Package, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const History: React.FC = () => {
  const { transactions, items, updateTransaction, deleteTransaction } = useAppStore();

  // Search & Filter State
  const [filterText, setFilterText] = useState(''); 
  const [filterItemText, setFilterItemText] = useState(''); 
  const [filterType, setFilterType] = useState<'All' | 'Inbound' | 'Outbound'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // UI State for Expanded Rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Autocomplete State
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<{
    supplierName?: string;
    riNumber?: string;
    poNumber?: string;
    sjNumber?: string;
    photos: string[];
    items: CartItem[];
  }>({ photos: [], items: [] });

  // Add Item to Edit State
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [isAddItemDropdownOpen, setIsAddItemDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filterSuggestions = useMemo(() => {
    const query = filterItemText.trim().toLowerCase();
    if (!query) return [];
    return items
      .filter(item => 
        (item.name || "").toLowerCase().includes(query) || 
        (item.sku || "").toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [items, filterItemText]);

  const handleSelectFilterItem = (name: string) => {
    setFilterItemText(name);
    setIsFilterDropdownOpen(false);
  };

  // Advanced Filtering Logic - Ditingkatkan dengan Null Safety yang Sangat Ketat
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(trx => {
      const trxId = (trx.transactionId || "").toLowerCase();
      const supplier = (trx.supplierName || "").toLowerCase();
      const ri = (trx.riNumber || "").toLowerCase();
      const sj = (trx.sjNumber || "").toLowerCase();
      const search = filterText.toLowerCase();

      const matchesGeneralText = 
        trxId.includes(search) ||
        supplier.includes(search) ||
        ri.includes(search) ||
        sj.includes(search);
      
      const trxItems = Array.isArray(trx.items) ? trx.items : [];
      const itemSearch = filterItemText.toLowerCase();
      const matchesItem = !filterItemText || trxItems.some(i => 
        (i.itemName || "").toLowerCase().includes(itemSearch) ||
        (i.sku || "").toLowerCase().includes(itemSearch)
      );

      const matchesType = filterType === 'All' || trx.type === filterType;
      
      let matchesDate = true;
      if (startDate && endDate) {
        try {
          const trxDate = new Date(trx.date).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime() + 86400000;
          if (!isNaN(trxDate)) {
            matchesDate = trxDate >= start && trxDate < end;
          }
        } catch (e) {
          matchesDate = true; // Abaikan filter tanggal jika error agar data tidak hilang
        }
      }

      return matchesGeneralText && matchesItem && matchesType && matchesDate;
    });
  }, [transactions, filterText, filterItemText, filterType, startDate, endDate]);

  const handleResetFilters = () => {
    setFilterText('');
    setFilterItemText('');
    setFilterType('All');
    setStartDate('');
    setEndDate('');
  };

  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditForm({
      supplierName: trx.supplierName || '',
      riNumber: trx.riNumber || '',
      poNumber: trx.poNumber || '',
      sjNumber: trx.sjNumber || '',
      photos: Array.isArray(trx.photos) ? trx.photos : [],
      items: Array.isArray(trx.items) ? trx.items.map(i => ({...i})) : []
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrx) return;
    const success = await updateTransaction({ ...editingTrx, ...editForm } as Transaction);
    if (success) setEditingTrx(null);
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;
    const wb = utils.book_new();
    const exportData = filteredTransactions.flatMap(trx => 
      (Array.isArray(trx.items) ? trx.items : []).map(item => ({
        "ID": trx.transactionId,
        "Type": trx.type,
        "Date": new Date(trx.date).toLocaleString(),
        "Ref": trx.supplierName || trx.sjNumber || '-',
        "SKU": item.sku,
        "Item": item.itemName,
        "Qty": item.quantity
      }))
    );
    const ws = utils.json_to_sheet(exportData);
    utils.book_append_sheet(wb, ws, "History");
    writeFile(wb, `Jupiter_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">History</h1>
          <button 
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="text" 
                  placeholder="Search ID, Supplier..."
                  className="w-full pl-9 pr-3 py-2 border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
             </div>

             <div className="relative" ref={filterDropdownRef}>
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="text" 
                  placeholder="Filter Item..."
                  className="w-full pl-9 pr-3 py-2 border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterItemText}
                  onChange={(e) => { setFilterItemText(e.target.value); setIsFilterDropdownOpen(true); }}
                  onFocus={() => setIsFilterDropdownOpen(true)}
                />
                {isFilterDropdownOpen && filterSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg">
                    {filterSuggestions.map(item => (
                      <div key={item.id} className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-sm" onClick={() => handleSelectFilterItem(item.name)}>
                         <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                         <p className="text-[10px] text-zinc-400 font-mono">{item.sku}</p>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <select 
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="All">All Types</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
              
             <div className="flex items-center gap-2">
               <input type="date" className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
               <span className="text-zinc-400">-</span>
               <input type="date" className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-250px)] transition-colors">
        <div className="overflow-auto scroll-smooth">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Transaction ID</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3 text-center">Photos</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredTransactions.map((trx) => {
                const isExpanded = expandedRows.has(trx.id);
                const trxItems = Array.isArray(trx.items) ? trx.items : [];
                const visibleItems = isExpanded ? trxItems : trxItems.slice(0, 3);

                return (
                  <tr key={trx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors align-top">
                    <td className="px-6 py-4 font-mono text-zinc-900 dark:text-zinc-100 font-medium">{trx.transactionId}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        trx.type === 'Inbound' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {trx.type === 'Inbound' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {trx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <div>
                          <div className="whitespace-nowrap">{new Date(trx.date).toLocaleDateString()}</div>
                          <div className="text-xs opacity-50">{new Date(trx.date).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      <div className="flex flex-col">
                         <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate max-w-[150px]">{trx.supplierName || trx.sjNumber || '-'}</span>
                         <span className="text-[10px] text-zinc-500 mt-0.5">{trx.riNumber || trx.poNumber || ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 min-w-[200px]">
                       <div className="flex flex-col gap-1">
                         {visibleItems.map((item, idx) => (
                           <div key={idx} className="text-[11px] flex items-center gap-1">
                             <span className="shrink-0 font-bold text-zinc-400">{item.quantity}x</span>
                             <span className="truncate">{item.itemName}</span>
                           </div>
                         ))}
                         {trxItems.length > 3 && (
                           <button onClick={() => toggleRow(trx.id)} className="text-[10px] font-bold text-blue-500 mt-1 flex items-center gap-1">
                             {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show Less</> : <><ChevronDown className="w-3 h-3" /> +{trxItems.length - 3} More</>}
                           </button>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(trx.photos && trx.photos.length > 0) ? (
                        <div className="flex justify-center -space-x-2">
                           {trx.photos.slice(0, 2).map((photo, i) => (
                             <div key={i} onClick={() => setPreviewImage(photo)} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 overflow-hidden cursor-pointer bg-zinc-100">
                               <img src={photo} className="w-full h-full object-cover" />
                             </div>
                           ))}
                           {trx.photos.length > 2 && <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">+{trx.photos.length - 2}</div>}
                        </div>
                      ) : <span className="text-xs text-zinc-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenEdit(trx)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteTransaction(trx.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-600 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
              <FileText className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-medium">No transactions found matching your criteria.</p>
              {(filterText || filterItemText || startDate) && (
                <button onClick={handleResetFilters} className="mt-4 flex items-center gap-2 text-blue-500 font-bold text-xs uppercase">
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
           <img src={previewImage} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
           <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  );
};

export default History;
