
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { Item, ItemStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, Upload, FileDown, CheckCircle, AlertCircle, X, Package } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

const Inventory: React.FC = () => {
  const { items, addItem, addItems, updateItem, deleteItem, bulkDeleteItems } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setSelectedIds(new Set());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [formData, setFormData] = useState<Partial<Item>>({
    sku: '', name: '', category: '', price: 0, location: '', minLevel: 0, currentStock: 0, unit: 'pcs', status: 'Active', conversionRate: 1, secondaryUnit: ''
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        sku: '', name: '', category: '', price: 0, location: '', minLevel: 0, currentStock: 0, unit: 'pcs', status: 'Active', conversionRate: 1, secondaryUnit: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem({ ...formData, id: editingItem.id } as Item);
    } else {
      addItem(formData as Omit<Item, 'id'>);
    }
    setIsModalOpen(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Catalog</h1>
          <p className="text-sm text-muted-gray font-medium">Manage and track your warehouse SKUs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={() => { if(confirm(`Delete ${selectedIds.size} items?`)) bulkDeleteItems(Array.from(selectedIds)); setSelectedIds(new Set()); }}
              className="bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2 shadow-soft animate-in zoom-in"
            >
              <Trash2 className="w-4 h-4" /> Delete {selectedIds.size}
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-glow-primary active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-card-border dark:border-slate-800 shadow-soft flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search SKU or name..." 
            className="w-full pl-11 pr-4 py-2.5 bg-surface dark:bg-slate-950 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-2xl text-sm outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-5 py-2.5 border border-card-border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-xs font-bold text-navy dark:text-white hover:bg-surface transition-all shadow-soft">
              <Filter className="w-4 h-4 text-primary" /> Filter
           </button>
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 border border-card-border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-xs font-bold text-navy dark:text-white hover:bg-surface transition-all shadow-soft">
              <Upload className="w-4 h-4 text-secondary" /> Import
              <input ref={fileInputRef} type="file" className="hidden" />
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-card-border text-primary focus:ring-primary/30 w-4 h-4"
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th className="px-4 py-5">Product Identity</th>
                <th className="px-4 py-5">Category</th>
                <th className="px-4 py-5 text-right">Price</th>
                <th className="px-4 py-5 text-center">Stock Level</th>
                <th className="px-4 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="group hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-all duration-200">
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      className="rounded border-card-border text-primary focus:ring-primary/30 w-4 h-4"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleToggleSelectItem(item.id)}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-navy dark:text-white leading-none">{item.name}</span>
                      <span className="text-[10px] font-bold text-muted-gray uppercase tracking-wider mt-1.5">{item.sku}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">{item.category}</span>
                  </td>
                  <td className="px-4 py-5 text-right font-bold text-sm text-navy dark:text-white">
                    Rp {item.price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black ${item.currentStock <= item.minLevel ? 'text-red-500' : 'text-navy dark:text-white'}`}>
                        {item.currentStock}
                      </span>
                      <span className="text-[10px] font-bold text-muted-gray uppercase">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <div className={`w-2.5 h-2.5 rounded-full mx-auto ${item.status === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-primary/10 rounded-xl text-primary"><Edit2 size={16} /></button>
                      <button onClick={() => { if(confirm('Delete SKU?')) deleteItem(item.id); }} className="p-2 hover:bg-red-50 rounded-xl text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center opacity-30">
               <Package size={48} className="text-muted-gray mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">No matching records</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-soft-lg overflow-hidden border border-white/40 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-card-border dark:border-slate-800 flex justify-between items-center">
              <div>
                 <h2 className="text-2xl font-bold text-navy dark:text-white">{editingItem ? 'Edit Product' : 'Create New SKU'}</h2>
                 <p className="text-xs font-medium text-muted-gray mt-1">Fill in the identity details for this item.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-surface dark:hover:bg-slate-800 rounded-2xl transition-all">
                <X size={20} className="text-muted-gray" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">SKU Identity</label>
                  <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Unit Price (Rp)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-gray uppercase tracking-widest ml-1">Current Stock</label>
                  <input required type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})} className="w-full px-5 py-3 bg-surface dark:bg-slate-950 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                 <input type="checkbox" id="status" className="w-5 h-5 rounded border-card-border text-primary focus:ring-primary/30" checked={formData.status === 'Active'} onChange={e => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} />
                 <label htmlFor="status" className="text-sm font-bold text-navy dark:text-white">Active Product</label>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-muted-gray hover:text-navy transition-all">Discard</button>
                <button type="submit" className="px-10 py-3 bg-primary text-white rounded-2xl font-bold shadow-glow-primary hover:bg-blue-600 transition-all active:scale-95">
                  {editingItem ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
