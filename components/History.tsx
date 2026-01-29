
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
// Added History as HistoryIcon to avoid naming conflict with the local History component
import { Download, Search, Trash2, Calendar, ArrowDownLeft, ArrowUpRight, Filter, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const History: React.FC = () => {
  const { transactions, deleteTransaction } = useAppStore();
  const [filterText, setFilterText] = useState(''); 
  const [filterType, setFilterType] = useState<'All' | 'Inbound' | 'Outbound'>('All');

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(trx => {
      const search = filterText.toLowerCase();
      const matchesText = !filterText || (trx.transactionId?.toLowerCase().includes(search) || trx.supplierName?.toLowerCase().includes(search));
      const matchesType = filterType === 'All' || trx.type === filterType;
      return matchesText && matchesType;
    });
  }, [transactions, filterText, filterType]);

  const handleExport = () => {
    const ws = utils.json_to_sheet(filteredTransactions);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "History");
    writeFile(wb, `Jupiter_Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Audit History</h1>
          <p className="text-sm text-muted-gray font-medium">Detailed log of all historical stock movements.</p>
        </div>
        <button 
          onClick={handleExport} 
          className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 text-navy dark:text-white rounded-xl text-xs font-bold shadow-soft hover:bg-surface transition-all flex items-center gap-2 active:scale-95"
        >
          <Download className="w-4 h-4 text-primary" /> Export Data
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-card-border dark:border-slate-800 shadow-soft">
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by Transaction ID or Client..." 
                className="w-full bg-surface dark:bg-slate-950 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none transition-all"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
           </div>
           <div className="flex gap-2">
             <div className="relative">
               <select 
                  className="pl-5 pr-10 py-3 bg-surface dark:bg-slate-950 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-2xl text-xs font-bold outline-none cursor-pointer appearance-none" 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value as any)}
               >
                  <option value="All">All Movements</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
               </select>
               <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
             </div>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface/50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-card-border dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">TXN Identifier</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Timestamp</th>
                <th className="px-6 py-5">Client Ref</th>
                <th className="px-6 py-5 text-right">Items</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="font-mono text-xs font-black text-primary uppercase">{trx.transactionId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      trx.type === 'Inbound' 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' 
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
                    }`}>
                      {trx.type === 'Inbound' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                      {trx.type}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy dark:text-slate-200">{new Date(trx.date).toLocaleDateString()}</span>
                      <span className="text-[10px] text-muted-gray font-medium uppercase">{new Date(trx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-navy dark:text-slate-300 truncate max-w-[150px] inline-block uppercase tracking-tight">
                      {trx.supplierName || trx.sjNumber || 'Internal Ref'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-navy dark:text-white">
                    {trx.totalItems}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => { if(confirm('Delete record?')) deleteTransaction(trx.id); }} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-gray flex flex-col items-center opacity-30">
                    {/* Changed from History to HistoryIcon to fix recursive reference and missing props error */}
                    <HistoryIcon size={48} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No matching history</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;
