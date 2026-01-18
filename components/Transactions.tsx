
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Search, ChevronDown, Camera, X, Box, Layers, FileDown, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

const Transactions: React.FC = () => {
  const { items, processTransaction } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Selection State
  const [quantity, setQuantity] = useState<number | string>(''); 
  const [selectedUnit, setSelectedUnit] = useState<'base' | 'secondary'>('base');
  
  const [details, setDetails] = useState({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    setSelectedItem(null);
    setSearchTerm('');
    setQuantity('');
    setSelectedUnit('base');
  }, [activeTab]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        selectItem(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm(`${item.sku} - ${item.name}`);
    setIsDropdownOpen(false);
    
    // FIX: Always default to 'base' unit to prevent "x2" or multiplier confusion 
    // unless the user explicitly changes it.
    setSelectedUnit('base');

    setTimeout(() => qtyInputRef.current?.focus(), 10);
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addToCart();
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;

    const qtyValue = parseFloat(quantity.toString());
    if (isNaN(qtyValue) || qtyValue <= 0) {
      return;
    }

    let finalQty = qtyValue;
    let displayUnit = selectedItem.unit;
    let displayInputQty = qtyValue;

    if (selectedUnit === 'secondary' && selectedItem.secondaryUnit && selectedItem.conversionRate) {
      finalQty = qtyValue * selectedItem.conversionRate;
      displayUnit = selectedItem.secondaryUnit;
    }

    if (activeTab === 'Outbound' && finalQty > selectedItem.currentStock) {
      setMessage({ type: 'error', text: `Insufficient stock! Only ${selectedItem.currentStock} ${selectedItem.unit} available.` });
      return;
    }

    const existing = cart.find(c => c.itemId === selectedItem.id);
    if (existing) {
       if (activeTab === 'Outbound' && (existing.quantity + finalQty) > selectedItem.currentStock) {
         setMessage({ type: 'error', text: 'Total quantity in cart would exceed stock!' });
         return;
       }
       
       setCart(cart.map(c => c.itemId === selectedItem.id ? { 
           ...c, 
           quantity: c.quantity + finalQty,
           inputQuantity: (c.inputUnit === displayUnit) ? (c.inputQuantity || 0) + displayInputQty : c.inputQuantity,
           inputUnit: c.inputUnit || displayUnit
       } : c));
    } else {
      setCart([...cart, { 
        itemId: selectedItem.id, 
        itemName: selectedItem.name, 
        sku: selectedItem.sku, 
        quantity: finalQty,
        currentStock: selectedItem.currentStock,
        inputQuantity: displayInputQty,
        inputUnit: displayUnit
      }]);
    }
    
    setQuantity('');
    setSelectedItem(null);
    setSearchTerm('');
    setMessage(null);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const downloadTemplate = () => {
    const templateData = [
      { SKU: "SKU-001", Name: "Product Name", Quantity: 10, Unit: "pcs" }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");
    writeFile(wb, `Inventory_Transaction_Template.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      let importedCart: CartItem[] = [...cart];
      let errors: string[] = [];
      let addedCount = 0;
      
      for (const row of jsonData) {
        const sku = String(row.SKU || "").trim();
        const qtyValue = parseFloat(row.Quantity);
        const unitLabel = String(row.Unit || "").trim();

        if (!sku || isNaN(qtyValue) || qtyValue <= 0) continue;

        // Find existing item only. We do not auto-create items during transaction import
        // to prevent stock calculation errors or data corruption.
        const item = items.find(i => i.sku === sku && i.status === 'Active');
        if (!item) {
          errors.push(`SKU ${sku} not found in Inventory.`);
          continue;
        }

        let finalQty = qtyValue;
        let displayUnit = item.unit;
        let displayInputQty = qtyValue;

        // Only convert if the unit in Excel explicitly matches the secondary unit name
        if (unitLabel && item.secondaryUnit && unitLabel.toLowerCase() === item.secondaryUnit.toLowerCase()) {
          finalQty = qtyValue * (item.conversionRate || 1);
          displayUnit = item.secondaryUnit;
        }

        const existingInCart = importedCart.find(c => c.itemId === item.id);
        const currentCartQty = existingInCart ? existingInCart.quantity : 0;

        if (activeTab === 'Outbound' && (currentCartQty + finalQty) > item.currentStock) {
          errors.push(`Insufficient stock for ${sku}.`);
          continue;
        }

        if (existingInCart) {
          importedCart = importedCart.map(c => c.itemId === item.id ? {
            ...c,
            quantity: c.quantity + finalQty,
            inputQuantity: (c.inputUnit === displayUnit) ? (c.inputQuantity || 0) + displayInputQty : c.inputQuantity
          } : c);
        } else {
          importedCart.push({
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            quantity: finalQty,
            currentStock: item.currentStock,
            inputQuantity: displayInputQty,
            inputUnit: displayUnit
          });
        }
        addedCount++;
      }

      setCart(importedCart);
      
      if (errors.length > 0) {
        setMessage({ type: 'error', text: `Imported ${addedCount} items. Errors: ${errors.length} items skipped.` });
      } else {
        setMessage({ type: 'success', text: `Successfully imported ${addedCount} items to cart.` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process Excel file.' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setMessage(null), 5000);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.itemId !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (cart.length === 0 || isProcessing) return;

    if (activeTab === 'Inbound' && !details.supplierName) {
      setMessage({ type: 'error', text: 'Supplier Name is required for Inbound' });
      return;
    }

    setIsProcessing(true);
    try {
      const success = await processTransaction(activeTab, cart, { ...details, photos });
      
      if (success) {
        setCart([]);
        setDetails({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
        setPhotos([]);
        setMessage({ type: 'success', text: 'Transaction processed successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to process transaction.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network or Server Error.' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !searchInputRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStockDisplay = (item: Item) => {
    if (activeTab === 'Inbound') return `Current: ${item.currentStock} ${item.unit}`;
    return `Available: ${item.currentStock} ${item.unit}`;
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transactions</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Create inbound or outbound stock movements.</p>
        
        <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg inline-flex w-full md:w-auto border border-zinc-200 dark:border-zinc-800 transition-colors">
          <button
            onClick={() => { setActiveTab('Outbound'); setCart([]); setMessage(null); }}
            className={`flex-1 md:w-32 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'Outbound' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Outbound
          </button>
          <button
            onClick={() => { setActiveTab('Inbound'); setCart([]); setMessage(null); }}
            className={`flex-1 md:w-32 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'Inbound' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Inbound
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Items to Cart
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" /> Template
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Import
                  <input ref={fileInputRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Item</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    placeholder="Search name or SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedItem(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
                
                {isDropdownOpen && filteredItems.length > 0 && (
                  <div ref={dropdownRef} className="absolute z-30 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`px-4 py-2 cursor-pointer text-sm ${
                          index === highlightedIndex ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50'
                        }`}
                        onClick={() => selectItem(item)}
                      >
                        <div className="flex justify-between items-center">
                          <span>{item.name} <span className="text-xs text-zinc-400">({item.sku})</span></span>
                          <span className="text-[10px] text-zinc-400">{getStockDisplay(item)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unit</label>
                <select
                  disabled={!selectedItem}
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm outline-none"
                >
                   <option value="base">{selectedItem?.unit || 'Unit'}</option>
                   {selectedItem?.secondaryUnit && <option value="secondary">{selectedItem.secondaryUnit}</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Qty</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-sm"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleQtyKeyDown}
                  placeholder="0"
                />
              </div>
            </div>

            <button 
              onClick={addToCart}
              disabled={!selectedItem}
              className="w-full py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Add to Cart
            </button>

            {message && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                {message.text}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Document Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTab === 'Inbound' ? (
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Supplier Name *</label>
                    <input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white dark:bg-zinc-950" value={details.supplierName} onChange={e => setDetails({...details, supplierName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Delivery Note / RI</label>
                    <input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white dark:bg-zinc-950" value={details.riNumber} onChange={e => setDetails({...details, riNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">PO Number</label>
                    <input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white dark:bg-zinc-950" value={details.poNumber} onChange={e => setDetails({...details, poNumber: e.target.value})} />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Surat Jalan (SJ) No</label>
                  <input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white dark:bg-zinc-950" value={details.sjNumber} onChange={e => setDetails({...details, sjNumber: e.target.value})} />
                </div>
              )}
            </div>
            {activeTab === 'Inbound' && (
              <div className="pt-4 border-t border-zinc-100">
                <label className="block text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4" /> Photos</label>
                <div className="grid grid-cols-4 gap-4">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded overflow-hidden group">
                      <img src={photo} className="w-full h-full object-cover" alt=""/>
                      <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-zinc-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50">
                    <Plus className="w-6 h-6 text-zinc-400" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sticky top-24 transition-colors">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Cart ({cart.length})
            </h3>
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3 mb-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.itemName}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{item.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{item.inputQuantity} {item.inputUnit}</span>
                    <button onClick={() => removeFromCart(item.itemId)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center py-8 text-zinc-400 italic text-sm">Cart is empty</p>}
            </div>
            <button 
              onClick={handleProcess}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isProcessing ? 'Processing...' : `Finalize ${activeTab}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
