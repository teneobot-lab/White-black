import React, { useState } from 'react';
import { useAppStore } from '../context/Store';
import { Transaction, CartItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, FileText, Calendar, Filter, Download, Image, X, Edit2, Plus, Trash2, FileSpreadsheet, Search, CheckCircle } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const History: React.FC = () => {
  const { transactions, items, updateTransaction, deleteTransaction } = useAppStore();

  // Search & Filter State
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Inbound' | 'Outbound'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const filteredTransactions = transactions.filter(trx => {
    const matchesText = 
      trx.transactionId.toLowerCase().includes(filterText.toLowerCase()) ||
      trx.supplierName?.toLowerCase().includes(filterText.toLowerCase()) ||
      trx.riNumber?.toLowerCase().includes(filterText.toLowerCase()) ||
      trx.sjNumber?.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesType = filterType === 'All' || trx.type === filterType;
    
    let matchesDate = true;
    if (startDate && endDate) {
      const trxDate = new Date(trx.date).getTime();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000; // Add 1 day to include end date
      matchesDate = trxDate >= start && trxDate < end;
    }

    return matchesText && matchesType && matchesDate;
  });

  // Filter items for the "Add Item" dropdown in modal
  const modalFilteredItems = items.filter(i => 
    i.status === 'Active' && 
    (i.name.toLowerCase().includes(addItemSearch.toLowerCase()) || 
     i.sku.toLowerCase().includes(addItemSearch.toLowerCase()))
  );

  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditForm({
      supplierName: trx.supplierName || '',
      riNumber: trx.riNumber || '',
      poNumber: trx.poNumber || '',
      sjNumber: trx.sjNumber || '',
      photos: trx.photos || [],
      items: trx.items.map(i => ({...i})) // Deep copy items
    });
    // Reset Add Item state
    setAddItemSearch('');
    setAddItemQty(1);
    setIsAddItemDropdownOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrx) return;

    if (editForm.items.length === 0) {
      alert("Transaction must have at least one item.");
      return;
    }

    const updated: Transaction = {
      ...editingTrx,
      supplierName: editForm.supplierName,
      riNumber: editForm.riNumber,
      poNumber: editForm.poNumber,
      sjNumber: editForm.sjNumber,
      photos: editForm.photos,
      items: editForm.items
    };

    const success = updateTransaction(updated);
    if (success) {
      setEditingTrx(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction? This will revert stock changes.")) {
      deleteTransaction(id);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditForm(prev => ({...prev, photos: [...prev.photos, reader.result as string]}));
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) return;

    const dataToExport = filteredTransactions.map(trx => ({
      "Transaction ID": trx.transactionId,
      "Type": trx.type,
      "Date": new Date(trx.date).toLocaleDateString() + ' ' + new Date(trx.date).toLocaleTimeString(),
      "Supplier / Recipient": trx.type === 'Inbound' ? trx.supplierName : 'N/A',
      "Reference No": trx.type === 'Inbound' ? trx.riNumber : trx.sjNumber,
      "PO Number": trx.poNumber || '-',
      "Total Items": trx.totalItems,
      "Items Detail": trx.items.map(i => `${i.quantity}x ${i.itemName} (${i.sku})`).join(', ')
    }));

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Transactions");
    writeFile(wb, `Transaction_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Modal Item Handlers ---

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const newItems = [...editForm.items];
    newItems[index].quantity = newQty;
    setEditForm({...editForm, items: newItems});
  };

  const handleRemoveItem = (index: number) => {
    if (window.confirm("Remove this item from the transaction?")) {
      const newItems = editForm.items.filter((_, i) => i !== index);
      setEditForm({...editForm, items: newItems});
    }
  };

  const handleAddItemToForm = (item: any) => {
    // Check if exists
    const existingIndex = editForm.items.findIndex(i => i.itemId === item.id);
    if (existingIndex > -1) {
       const newItems = [...editForm.items];
       newItems[existingIndex].quantity += addItemQty;
       setEditForm({...editForm, items: newItems});
    } else {
       const newItem: CartItem = {
         itemId: item.id,
         itemName: item.name,
         sku: item.sku,
         quantity: addItemQty,
         currentStock: item.currentStock // Snapshot
       };
       setEditForm({...editForm, items: [...editForm.items, newItem]});
    }
    
    // Reset inputs
    setAddItemSearch('');
    setAddItemQty(1);
    setIsAddItemDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header and Filters */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">History</h1>
          <button 
            onClick={handleExport}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row gap-4 transition-colors">
          <div className="flex-1">
             <input 
              type="text" 
              placeholder="Search ID, Supplier, Ref..."
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
             />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="All">All Types</option>
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </select>
            
            <div className="flex items-center gap-2">
               <input 
                type="text"
                placeholder="Start Date"
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => { if(!e.target.value) e.target.type = 'text'; }}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 placeholder-zinc-400 dark:placeholder-zinc-600"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-zinc-400 dark:text-zinc-500">-</span>
              <input 
                type="text"
                placeholder="End Date"
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => { if(!e.target.value) e.target.type = 'text'; }}
                className="w-full sm:w-auto px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 placeholder-zinc-400 dark:placeholder-zinc-600"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
              {filteredTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">{trx.transactionId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      trx.type === 'Inbound' 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      {trx.type === 'Inbound' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {trx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <div>
                        <div>{new Date(trx.date).toLocaleDateString()}</div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">{new Date(trx.date).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    <div className="flex flex-col">
                      {trx.type === 'Inbound' ? (
                        <>
                           <span className="text-zinc-900 dark:text-zinc-200">{trx.supplierName}</span>
                           <span className="text-xs text-zinc-400 dark:text-zinc-500">RI: {trx.riNumber}</span>
                           {trx.poNumber && <span className="text-xs text-zinc-400 dark:text-zinc-500">PO: {trx.poNumber}</span>}
                        </>
                      ) : (
                        <span className="text-zinc-900 dark:text-zinc-200">SJ: {trx.sjNumber}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                     <div className="flex flex-col gap-1">
                       {trx.items.slice(0, 2).map((item, idx) => (
                         <div key={idx} className="text-xs">
                           {item.quantity}x {item.itemName}
                         </div>
                       ))}
                       {trx.items.length > 2 && (
                         <div className="text-xs text-zinc-400 dark:text-zinc-500">
                           + {trx.items.length - 2} more items
                         </div>
                       )}
                       <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100 mt-1">Total: {trx.totalItems}</div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {trx.photos && trx.photos.length > 0 ? (
                      <div className="flex justify-center -space-x-2">
                         {trx.photos.slice(0, 3).map((photo, i) => (
                           <div 
                              key={i} 
                              onClick={() => setPreviewImage(photo)}
                              className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 overflow-hidden cursor-pointer hover:scale-110 transition-transform shadow-sm"
                            >
                             <img src={photo} alt="mini-preview" className="w-full h-full object-cover" />
                           </div>
                         ))}
                         {trx.photos.length > 3 && (
                           <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 dark:text-zinc-400">
                             +{trx.photos.length - 3}
                           </div>
                         )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleOpenEdit(trx)}
                        className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(trx.id)}
                        className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center">
              <FileText className="w-12 h-12 mb-2 opacity-20" />
              No transactions found.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTrx && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors flex flex-col">
             <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
               <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Edit Transaction</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{editingTrx.transactionId} • {editingTrx.type}</p>
               </div>
               <button onClick={() => setEditingTrx(null)}><X className="w-5 h-5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200" /></button>
             </div>
             
             <form onSubmit={handleSaveEdit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* 1. Details Section */}
                <div className="grid grid-cols-2 gap-4">
                  {editingTrx.type === 'Inbound' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Supplier</label>
                        <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" value={editForm.supplierName} onChange={e => setEditForm({...editForm, supplierName: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">RI Number</label>
                        <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" value={editForm.riNumber} onChange={e => setEditForm({...editForm, riNumber: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">PO Number</label>
                        <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" value={editForm.poNumber} onChange={e => setEditForm({...editForm, poNumber: e.target.value})} />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">SJ Number</label>
                      <input className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" value={editForm.sjNumber} onChange={e => setEditForm({...editForm, sjNumber: e.target.value})} />
                    </div>
                  )}
                </div>

                {/* 2. Items Management Section */}
                <div className="space-y-3">
                   <h4 className="font-semibold text-sm text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-zinc-800">Transaction Items</h4>
                   
                   {/* Item List */}
                   <div className="space-y-2">
                      {editForm.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg group">
                           <div>
                             <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{item.itemName}</p>
                             <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{item.sku}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                min="1"
                                className="w-16 px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-950 text-center text-sm"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                              />
                              <button 
                                type="button" 
                                onClick={() => handleRemoveItem(idx)}
                                className="text-zinc-400 hover:text-red-500 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                      ))}
                      {editForm.items.length === 0 && <p className="text-xs text-red-500">At least one item is required.</p>}
                   </div>

                   {/* Add New Item */}
                   <div className="pt-2">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Add Another Item</p>
                      <div className="flex gap-2">
                         <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input 
                               type="text" 
                               placeholder="Search item to add..." 
                               className="w-full pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-950"
                               value={addItemSearch}
                               onChange={(e) => {
                                 setAddItemSearch(e.target.value);
                                 setIsAddItemDropdownOpen(true);
                               }}
                               onFocus={() => setIsAddItemDropdownOpen(true)}
                            />
                            {isAddItemDropdownOpen && addItemSearch && modalFilteredItems.length > 0 && (
                               <div className="absolute bottom-full mb-1 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20">
                                  {modalFilteredItems.map(item => (
                                     <div 
                                        key={item.id} 
                                        className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-sm"
                                        onClick={() => handleAddItemToForm(item)}
                                     >
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</div>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.sku}</div>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                         <input 
                            type="number" 
                            min="1"
                            value={addItemQty}
                            onChange={(e) => setAddItemQty(parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-950"
                         />
                      </div>
                   </div>
                </div>

                {/* 3. Photo Management */}
                <div>
                   <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Manage Photos</label>
                   <div className="grid grid-cols-4 gap-4">
                      {editForm.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded overflow-hidden group">
                           <img src={photo} className="w-full h-full object-cover" alt="" />
                           <button type="button" onClick={() => setEditForm(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                      ))}
                      <label className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <Plus className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                   </div>
                </div>
             </form>

             <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 z-10">
                <button type="button" onClick={() => setEditingTrx(null)} className="px-4 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm">Cancel</button>
                <button 
                  type="button" 
                  onClick={handleSaveEdit} 
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Save Changes
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
           <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
             <img src={previewImage} alt="Full preview" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
             <div className="absolute -top-12 right-0 flex gap-2">
                <a 
                  href={previewImage} 
                  download={`photo-${Date.now()}.png`}
                  className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 backdrop-blur-sm transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Download className="w-6 h-6" />
                </a>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20 backdrop-blur-sm transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default History;