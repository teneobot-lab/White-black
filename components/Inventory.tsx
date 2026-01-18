import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { Item, ItemStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, Upload, FileDown, CheckCircle, AlertCircle } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

const Inventory: React.FC = () => {
  const { items, addItem, addItems, updateItem, deleteItem } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Form State
  const [formData, setFormData] = useState<Partial<Item>>({
    sku: '', name: '', category: '', price: 0, location: '', minLevel: 0, currentStock: 0, unit: 'pcs', status: 'Active'
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
        sku: '', name: '', category: '', price: 0, location: '', minLevel: 0, currentStock: 0, unit: 'pcs', status: 'Active'
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

  const downloadTemplate = () => {
    const headers = [
      { SKU: "ELEC-009", Name: "Example Item", Category: "Electronics", Price: 100000, Location: "A-01", "Min Level": 10, Stock: 50, Unit: "pcs", Status: "Active" }
    ];
    const ws = utils.json_to_sheet(headers);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");
    writeFile(wb, "Jupiter_Inventory_Template.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      const parsedItems: Omit<Item, 'id'>[] = [];
      let errorCount = 0;

      jsonData.forEach((row: any) => {
        // Basic mapping validation
        if (!row.SKU || !row.Name) {
          errorCount++;
          return;
        }

        parsedItems.push({
          sku: String(row.SKU),
          name: String(row.Name),
          category: row.Category || 'Uncategorized',
          price: Number(row.Price) || 0,
          location: String(row.Location || ''),
          minLevel: Number(row['Min Level']) || 0,
          currentStock: Number(row.Stock) || 0,
          unit: String(row.Unit || 'pcs'),
          status: (row.Status === 'Inactive' ? 'Inactive' : 'Active') as ItemStatus,
        });
      });

      if (parsedItems.length > 0) {
        addItems(parsedItems);
        setNotification({ type: 'success', message: `Successfully imported ${parsedItems.length} items.${errorCount > 0 ? ` Skipped ${errorCount} invalid rows.` : ''}` });
      } else {
        setNotification({ type: 'error', message: 'No valid items found in the file. Please use the template.' });
      }
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'Failed to parse Excel file.' });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Clear notification after 3s
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Inventory</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Manage your products and stock levels.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={downloadTemplate}
              className="px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              title="Download Excel Template"
            >
              <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Template</span>
            </button>
            <label className="cursor-pointer px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleImport}
              />
            </label>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 transition-colors">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
        
        {/* Notification Toast */}
        {notification && (
          <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in ${
            notification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.message}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-250px)] transition-colors">
        <div className="overflow-auto scroll-smooth">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Item Details</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3 text-center">Stock</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{item.sku}</p>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{item.category}</td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{item.location}</td>
                  <td className="px-6 py-4 text-zinc-900 dark:text-zinc-100 text-right font-medium">
                    Rp {item.price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${
                        item.currentStock <= item.minLevel ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'
                      }`}>
                        {item.currentStock}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'Active' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this item?')) {
                            deleteItem(item.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
              No items found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <Filter className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">SKU</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                  <select 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select...</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Raw Materials">Raw Materials</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Location</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Price</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current Stock</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.currentStock}
                    onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})}
                  />
                </div>
                 <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Unit (e.g., pcs, box)</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Min Stock Level</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none"
                    value={formData.minLevel}
                    onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="status"
                  className="rounded text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                  checked={formData.status === 'Active'}
                  onChange={e => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})}
                />
                <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active Item</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
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