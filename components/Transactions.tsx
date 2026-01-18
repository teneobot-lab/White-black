import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Search, ChevronDown, Camera, X, Box, Layers, FileDown, Upload, FileSpreadsheet } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';

const Transactions: React.FC = () => {
  const { items, processTransaction, addItems, updateItem } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Selection State
  const [quantity, setQuantity] = useState<number | string>(''); // Clear by default
  const [selectedUnit, setSelectedUnit] = useState<'base' | 'secondary'>('base');
  
  const [details, setDetails] = useState({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Refs for Focus Management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter items for autocomplete
  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedItem(null);
    setSearchTerm('');
    setQuantity('');
    setSelectedUnit('base');
  }, [activeTab]);

  // Keyboard Navigation for Autocomplete
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
    
    if (activeTab === 'Inbound' && item.secondaryUnit && item.conversionRate && item.conversionRate > 1) {
      setSelectedUnit('secondary');
    } else {
      setSelectedUnit('base');
    }

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
      setMessage({ type: 'error', text: `Cannot add ${displayInputQty} ${displayUnit}. Only ${selectedItem.currentStock} ${selectedItem.unit} available.` });
      return;
    }

    const existing = cart.find(c => c.itemId === selectedItem.id);
    if (existing) {
       if (activeTab === 'Outbound' && (existing.quantity + finalQty) > selectedItem.currentStock) {
         setMessage({ type: 'error', text: 'Total quantity would exceed stock!' });
         return;
       }
       
       let newInputQty = undefined;
       let newInputUnit = undefined;
       if (existing.inputUnit === displayUnit) {
           newInputQty = (existing.inputQuantity || 0) + displayInputQty;
           newInputUnit = displayUnit;
       }

       setCart(cart.map(c => c.itemId === selectedItem.id ? { 
           ...c, 
           quantity: c.quantity + finalQty,
           inputQuantity: newInputQty,
           inputUnit: newInputUnit
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
      { SKU: "ELEC-001", Name: "Wireless Mouse", Quantity: 5, Unit: "pcs" },
      { SKU: "OFF-001", Name: "A4 Paper Ream", Quantity: 2, Unit: "Box" },
      { SKU: "NEW-ITEM-99", Name: "Example Auto-Create Item", Quantity: 10, Unit: "pcs" }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "TransactionTemplate");
    writeFile(wb, `Jupiter_${activeTab}_Template.xlsx`);
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
      
      // Track synchronization actions
      let newItemsCreatedCount = 0;
      let stockAdjustedCount = 0;

      // 1. Calculate required totals from Excel to handle stock seeding
      const requiredBySku: Record<string, { total: number, name: string, unit: string }> = {};
      
      for (const row of jsonData) {
        const sku = String(row.SKU || "").trim();
        const qtyValue = parseFloat(row.Quantity);
        const unitLabel = String(row.Unit || "").trim();
        if (!sku || isNaN(qtyValue)) continue;

        // Base unit calculation for seeding
        const existingItemRef = items.find(i => i.sku === sku);
        let baseQty = qtyValue;
        if (existingItemRef && unitLabel && existingItemRef.secondaryUnit && unitLabel.toLowerCase() === existingItemRef.secondaryUnit.toLowerCase()) {
          baseQty = qtyValue * (existingItemRef.conversionRate || 1);
        }

        if (!requiredBySku[sku]) {
          requiredBySku[sku] = { total: 0, name: String(row.Name || sku), unit: String(row.Unit || "pcs") };
        }
        requiredBySku[sku].total += baseQty;
      }

      // 2. Perform Pass: Synchronize Inventory (Auto-Add and Auto-Adjust Stock)
      const newItemsToStore: (Omit<Item, 'id'> & { id: string })[] = [];

      for (const sku in requiredBySku) {
        const req = requiredBySku[sku];
        const existingItem = items.find(i => i.sku === sku);

        if (!existingItem) {
          // Initialize New Item with stock adjusted to match required import if Outbound
          const newId = Math.random().toString(36).substr(2, 9);
          const initialStock = activeTab === 'Outbound' ? req.total : 0;
          
          const newItem: Item = {
            id: newId,
            sku: sku,
            name: req.name,
            category: "Uncategorized",
            price: 0,
            location: "-",
            minLevel: 0,
            status: "Active",
            currentStock: initialStock,
            unit: req.unit,
          };
          newItemsToStore.push(newItem);
          newItemsCreatedCount++;
        } else if (activeTab === 'Outbound' && existingItem.currentStock < req.total) {
          // Auto-adjust existing item stock so validation passes
          updateItem({ ...existingItem, currentStock: req.total });
          stockAdjustedCount++;
        }
      }

      // Commit new items to store (this triggers state update)
      if (newItemsToStore.length > 0) {
        addItems(newItemsToStore);
      }

      // 3. Final Pass: Build the cart using the updated inventory environment
      // We use a short timeout or rely on local mapping because store update is async
      // For immediate cart building, we simulate the 'next' state of items
      const localInventory = [...items, ...newItemsToStore].map(item => {
        const req = requiredBySku[item.sku];
        if (activeTab === 'Outbound' && req && item.currentStock < req.total) {
          return { ...item, currentStock: req.total };
        }
        return item;
      });

      for (const row of jsonData) {
        const sku = String(row.SKU || "").trim();
        const qtyValue = parseFloat(row.Quantity);
        const unitLabel = String(row.Unit || "").trim();

        if (!sku || isNaN(qtyValue) || qtyValue <= 0) continue;

        const item = localInventory.find(i => i.sku === sku && i.status === 'Active');
        if (!item) continue;

        let finalQty = qtyValue;
        let displayUnit = item.unit;
        let displayInputQty = qtyValue;

        if (unitLabel && item.secondaryUnit && unitLabel.toLowerCase() === item.secondaryUnit.toLowerCase()) {
          finalQty = qtyValue * (item.conversionRate || 1);
          displayUnit = item.secondaryUnit;
        }

        const existingInCart = importedCart.find(c => c.itemId === item.id);
        const currentCartQty = existingInCart ? existingInCart.quantity : 0;

        // Validation - Should always pass now due to synchronization step above
        if (activeTab === 'Outbound' && (currentCartQty + finalQty) > item.currentStock) {
          errors.push(`Stock mismatch for ${sku}. Required: ${currentCartQty + finalQty}, Available: ${item.currentStock}`);
          continue;
        }

        if (existingInCart) {
          importedCart = importedCart.map(c => c.itemId === item.id ? {
            ...c,
            quantity: c.quantity + finalQty,
            inputQuantity: (c.inputUnit === displayUnit) ? (c.inputQuantity || 0) + displayInputQty : undefined,
            inputUnit: (c.inputUnit === displayUnit) ? displayUnit : undefined
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
      
      let successText = `Successfully imported ${addedCount} items to cart.`;
      const extras = [];
      if (newItemsCreatedCount > 0) extras.push(`${newItemsCreatedCount} new SKUs created`);
      if (stockAdjustedCount > 0) extras.push(`${stockAdjustedCount} stock levels auto-adjusted`);
      
      if (extras.length > 0) successText += ` (${extras.join(' and ')})`;

      if (errors.length > 0) {
        setMessage({ type: 'error', text: `${successText} Errors: ${errors.slice(0, 2).join(', ')}` });
      } else {
        setMessage({ type: 'success', text: successText });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to process Excel file.' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setMessage(null), 6000);
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

  const handleProcess = () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty' });
      return;
    }

    if (activeTab === 'Inbound' && !details.supplierName) {
      setMessage({ type: 'error', text: 'Supplier Name is required' });
      return;
    }

    const success = processTransaction(activeTab, cart, { ...details, photos });
    
    if (success) {
      setCart([]);
      setDetails({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
      setPhotos([]);
      setMessage({ type: 'success', text: 'Transaction processed successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'Transaction failed. Check stock levels.' });
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
    if (activeTab === 'Inbound') return item.unit;
    
    if (item.conversionRate && item.conversionRate > 1 && item.secondaryUnit) {
      const big = Math.floor(item.currentStock / item.conversionRate);
      const small = item.currentStock % item.conversionRate;
      let text = `Stock: ${item.currentStock} ${item.unit}`;
      if (big > 0) {
        text += ` (${big} ${item.secondaryUnit}${small > 0 ? ` + ${small} ${item.unit}` : ''})`;
      }
      return text;
    }
    return `Stock: ${item.currentStock} ${item.unit}`;
  };

  const getCartItemBaseUnit = (cartItem: CartItem) => {
      const originalItem = items.find(i => i.id === cartItem.itemId);
      return originalItem ? originalItem.unit : 'units';
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
                  title="Download Excel Template"
                >
                  <FileDown className="w-3.5 h-3.5" /> Template
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Import Excel
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    onChange={handleImport}
                  />
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
                    placeholder="Type name or SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedItem(null);
                      setHighlightedIndex(0);
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
                          index === highlightedIndex 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' 
                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-semibold">{item.sku}</span> - {item.name}
                          </div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
                             {getStockDisplay(item)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Unit 
                  {selectedItem?.secondaryUnit && (
                      <span className="text-[10px] ml-1 text-blue-600 dark:text-blue-400 font-normal">
                          {activeTab === 'Inbound' ? '(Recommended: Large)' : '(Recommended: Small)'}
                      </span>
                  )}
                </label>
                <div className="relative">
                  <select
                    disabled={!selectedItem || !selectedItem.secondaryUnit}
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value as 'base' | 'secondary')}
                    className="w-full pl-3 pr-8 py-2 border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                  >
                     <option value="base">{selectedItem ? selectedItem.unit : 'Unit'}</option>
                     {selectedItem?.secondaryUnit && (
                         <option value="secondary">{selectedItem.secondaryUnit}</option>
                     )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Qty</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  step="any"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleQtyKeyDown}
                />
              </div>
            </div>

            <button 
              onClick={addToCart}
              disabled={!selectedItem}
              className="w-full py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add to Cart <span className="text-xs opacity-70 font-normal ml-1">(Enter)</span>
            </button>

            {message && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                {message.text}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-colors">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Document Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTab === 'Inbound' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Supplier Name *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                      value={details.supplierName}
                      onChange={e => setDetails({...details, supplierName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Delivery Note (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                      value={details.riNumber}
                      onChange={e => setDetails({...details, riNumber: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">PO Number (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                      value={details.poNumber}
                      onChange={e => setDetails({...details, poNumber: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Surat Jalan (SJ) No (Optional)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                    value={details.sjNumber}
                    onChange={e => setDetails({...details, sjNumber: e.target.value})}
                  />
                </div>
              )}
            </div>

            {activeTab === 'Inbound' && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Upload Photos
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      <img src={photo} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-500 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <Plus className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Add Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm h-full flex flex-col sticky top-24 transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Current Cart
              </h3>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{cart.length} items</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-3 pr-2">
              {cart.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{item.itemName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                         {item.inputQuantity && item.inputUnit ? (
                             <div className="flex flex-col items-end">
                                 <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                     {item.inputQuantity} {item.inputUnit}
                                 </span>
                                 {item.inputUnit !== getCartItemBaseUnit(item) && (
                                     <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                         = {item.quantity} {getCartItemBaseUnit(item)}
                                     </span>
                                 )}
                             </div>
                         ) : (
                             <span className="text-sm font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
                                {item.quantity} {getCartItemBaseUnit(item)}
                             </span>
                         )}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.itemId)}
                        className="text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <div className="flex justify-between mb-4 text-sm">
                 <span className="text-zinc-600 dark:text-zinc-400">Total Base Units</span>
                 <span className="font-bold text-zinc-900 dark:text-white">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
               </div>
               <button 
                 onClick={handleProcess}
                 disabled={cart.length === 0}
                 className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
               >
                 Process {activeTab}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;