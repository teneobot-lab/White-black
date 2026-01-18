import React, { useState } from 'react';
import { useAppStore } from '../context/Store';
import { Transaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, FileText, Calendar, Filter, Download, Image, X, Edit2, Plus, Trash2 } from 'lucide-react';

const History: React.FC = () => {
  const { transactions, updateTransaction } = useAppStore();

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
  }>({ photos: [] });

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

  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setEditForm({
      supplierName: trx.supplierName || '',
      riNumber: trx.riNumber || '',
      poNumber: trx.poNumber || '',
      sjNumber: trx.sjNumber || '',
      photos: trx.photos || []
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrx) return;

    const updated: Transaction = {
      ...editingTrx,
      supplierName: editForm.supplierName,
      riNumber: editForm.riNumber,
      poNumber: editForm.poNumber,
      sjNumber: editForm.sjNumber,
      photos: editForm.photos
    };

    updateTransaction(updated);
    setEditingTrx(null);
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

  return (
    <div className="space-y-6">
      {/* Sticky Header and Filters */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">History</h1>
        
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
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="All">All Types</option>
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </select>
            <input 
              type="date"
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="self-center text-zinc-400 dark:text-zinc-500">-</span>
            <input 
              type="date"
              className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
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
                    <button 
                      onClick={() => handleOpenEdit(trx)}
                      className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                      title="Edit Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
           <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl transition-colors">
             <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
               <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Edit Transaction {editingTrx.transactionId}</h3>
               <button onClick={() => setEditingTrx(null)}><X className="w-5 h-5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200" /></button>
             </div>
             <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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

                {/* Photo Management */}
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

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingTrx(null)} className="px-4 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200">Save Changes</button>
                </div>
             </form>
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