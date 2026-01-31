
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { Item, ItemStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, Upload, FileDown, CheckCircle, AlertCircle, X, Package, Layers, Scale, Info } from 'lucide-react';
import { utils, read, writeFile } from 'xlsx';

const Inventory: React.FC = () => {
  const { items, addItem, bulkAddItems, updateItem, deleteItem, bulkDeleteItems } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // State Form dengan nilai awal undefined agar kolom terlihat kosong (Clean UI)
  const [formData, setFormData] = useState<any>({
    sku: '',
    name: '',
    category: '',
    price: undefined,
    location: '',
    minLevel: undefined,
    currentStock: undefined,
    unit: 'Pcs',
    status: 'Active',
    conversionRate: undefined,
    secondaryUnit: ''
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        ...item,
        price: item.price || undefined,
        minLevel: item.minLevel === 0 ? 0 : (item.minLevel || undefined),
        currentStock: item.currentStock === 0 ? 0 : (item.currentStock || undefined),
        conversionRate: item.conversionRate || undefined,
        secondaryUnit: item.secondaryUnit || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        sku: '',
        name: '',
        category: '',
        price: undefined,
        location: '',
        minLevel: undefined,
        currentStock: undefined,
        unit: 'Pcs',
        status: 'Active',
        conversionRate: undefined,
        secondaryUnit: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      minLevel: Number(formData.minLevel) || 0,
      currentStock: Number(formData.currentStock) || 0,
      conversionRate: Number(formData.conversionRate) || 1,
    };

    if (editingItem) {
      updateItem({ ...payload, id: editingItem.id });
    } else {
      addItem(payload);
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

  const handleDownloadTemplate = () => {
    const headers = [
      ["SKU", "Name", "Category", "Price", "Location", "Min Level", "Current Stock", "Unit", "Secondary Unit", "Conversion Rate"],
      ["SKU001", "Contoh Barang A", "Elektronik", 50000, "Rak A1", 10, 100, "Pcs", "Box", 12]
    ];
    const ws = utils.aoa_to_sheet(headers);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Master Template");
    writeFile(wb, "Jupiter_Inventory_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = utils.sheet_to_json(ws);

        if (data.length === 0) {
          setImportStatus({ message: "File kosong atau format salah.", type: 'error' });
          return;
        }

        const newItems: Omit<Item, 'id'>[] = data.map((row: any) => ({
          sku: String(row.SKU || `SKU-${Math.floor(Math.random()*10000)}`),
          name: String(row.Name || 'Tanpa Nama'),
          category: String(row.Category || 'General'),
          price: Number(row.Price) || 0,
          location: String(row.Location || '-'),
          minLevel: Number(row["Min Level"]) || 0,
          currentStock: Number(row["Current Stock"]) || 0,
          unit: String(row.Unit || 'Pcs'),
          status: 'Active' as ItemStatus,
          conversionRate: Number(row["Conversion Rate"]) || 1,
          secondaryUnit: String(row["Secondary Unit"] || '')
        }));

        bulkAddItems(newItems);
        setImportStatus({ message: `Berhasil mengimpor ${newItems.length} item.`, type: 'success' });
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err) {
        setImportStatus({ message: "Gagal memproses file. Pastikan format benar.", type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderStockInfo = (item: Item) => {
    if (item.secondaryUnit && item.conversionRate && item.conversionRate > 1) {
      const secondaryQty = (item.currentStock / item.conversionRate).toFixed(2).replace(/\.00$/, '');
      return (
        <div className="flex flex-col items-center">
          <span className={`text-sm font-black ${item.currentStock <= item.minLevel ? 'text-red-500' : 'text-navy dark:text-white'}`}>
            {item.currentStock} <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
          </span>
          <span className="text-[9px] font-bold text-primary uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded mt-0.5">
            ≈ {secondaryQty} {item.secondaryUnit}
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center">
        <span className={`text-sm font-black ${item.currentStock <= item.minLevel ? 'text-red-500' : 'text-navy dark:text-white'}`}>
          {item.currentStock}
        </span>
        <span className="text-[10px] font-bold text-muted-gray uppercase">{item.unit}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Katalog Barang</h1>
          <p className="text-sm text-muted-gray font-medium">Manajemen SKU dan Konversi Satuan Enterprise.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={() => { if(confirm(`Hapus ${selectedIds.size} item?`)) bulkDeleteItems(Array.from(selectedIds)); setSelectedIds(new Set()); }}
              className="bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2 shadow-soft animate-in zoom-in"
            >
              <Trash2 className="w-4 h-4" /> Hapus {selectedIds.size}
            </button>
          )}
          
          <button onClick={handleDownloadTemplate} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 text-navy dark:text-white rounded-xl text-xs font-bold shadow-soft hover:bg-surface transition-all flex items-center gap-2 active:scale-95">
            <FileDown size={16} className="text-primary" /> Template
          </button>

          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 text-navy dark:text-white rounded-xl text-xs font-bold shadow-soft hover:bg-surface transition-all flex items-center gap-2 active:scale-95">
            <Upload size={16} className="text-secondary" /> Import Data
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />

          <button onClick={() => handleOpenModal()} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-glow-primary active:scale-95">
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-card-border dark:border-slate-800 shadow-soft flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input type="text" placeholder="Cari SKU atau nama barang..." className="w-full pl-11 pr-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 focus:border-primary/50 rounded-xl text-sm outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 border border-card-border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-navy dark:text-white hover:bg-surface transition-all shadow-soft">
           <Filter className="w-4 h-4 text-primary" /> Filter
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-surface/30 dark:bg-slate-950/30">
                <th className="px-8 py-5 w-10">
                  <input type="checkbox" className="rounded border-card-border text-primary focus:ring-primary/30 w-4 h-4" checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length} onChange={handleToggleSelectAll} />
                </th>
                <th className="px-4 py-5">Informasi Produk</th>
                <th className="px-4 py-5">Kategori</th>
                <th className="px-4 py-5 text-right">Harga Beli</th>
                <th className="px-4 py-5 text-center">Stok Saat Ini</th>
                <th className="px-4 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="group hover:bg-surface/50 dark:hover:bg-slate-800/30 transition-all duration-200">
                  <td className="px-8 py-5">
                    <input type="checkbox" className="rounded border-card-border text-primary focus:ring-primary/30 w-4 h-4" checked={selectedIds.has(item.id)} onChange={() => handleToggleSelectItem(item.id)} />
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-navy dark:text-white leading-none">{item.name}</span>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1.5">{item.sku}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">{item.category || 'UMUM'}</span>
                  </td>
                  <td className="px-4 py-5 text-right font-bold text-sm text-navy dark:text-white">Rp {item.price.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-5 text-center">{renderStockInfo(item)}</td>
                  <td className="px-4 py-5 text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto ${item.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-primary/10 rounded-xl text-primary"><Edit2 size={16} /></button>
                      <button onClick={() => { if(confirm('Hapus SKU?')) deleteItem(item.id); }} className="p-2 hover:bg-red-50 rounded-xl text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-soft-lg overflow-hidden border border-card-border dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-card-border dark:border-slate-800 flex justify-between items-center bg-surface/30 dark:bg-slate-950/30">
              <div>
                 <h2 className="text-xl font-bold text-navy dark:text-white">{editingItem ? 'Edit Produk' : 'Baru (SKU)'}</h2>
                 <p className="text-[10px] font-black text-muted-gray uppercase tracking-widest mt-1">Informasi Detail Inventaris</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm">
                <X size={20} className="text-muted-gray" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Package size={14} /> Informasi Dasar</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Kode SKU</label>
                    <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="SKU001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Nama Barang</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Masukkan nama barang..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Kategori</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Umum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Harga Beli (Rp)</label>
                    <input type="number" value={formData.price ?? ''} onChange={e => setFormData({...formData, price: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-card-border dark:border-slate-800">
                <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2"><Scale size={14} /> Satuan & Konversi</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Satuan Dasar</label>
                    <input required type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Pcs" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Satuan Sekunder (Opsional)</label>
                    <input type="text" value={formData.secondaryUnit} onChange={e => setFormData({...formData, secondaryUnit: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Box" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Rasio (Per Satuan Sekunder)</label>
                    <input type="number" value={formData.conversionRate ?? ''} onChange={e => setFormData({...formData, conversionRate: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-bold" placeholder="1" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-card-border dark:border-slate-800">
                <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> Kontrol Stok</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Stok Dasar Saat Ini</label>
                    <input type="number" value={formData.currentStock ?? ''} onChange={e => setFormData({...formData, currentStock: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30 font-black text-navy dark:text-white" placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Min. Stok (Alert)</label>
                    <input type="number" value={formData.minLevel ?? ''} onChange={e => setFormData({...formData, minLevel: e.target.value === '' ? undefined : Number(e.target.value)})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-gray uppercase tracking-wider ml-1">Lokasi Rak</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 bg-surface dark:bg-slate-950 border border-card-border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/30" placeholder="Rak A1" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                 <input type="checkbox" id="status" className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary/30" checked={formData.status === 'Active'} onChange={e => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} />
                 <label htmlFor="status" className="text-xs font-bold text-navy dark:text-white uppercase tracking-tight">Barang Aktif (Dapat digunakan dalam transaksi)</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-card-border dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-black text-[10px] text-muted-gray hover:text-navy uppercase tracking-widest transition-all">Batal</button>
                <button type="submit" className="px-10 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-glow-primary hover:bg-blue-600 transition-all active:scale-95">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
