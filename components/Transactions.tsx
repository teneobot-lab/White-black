import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { CartItem, Item } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, AlertCircle, Search, ChevronDown, Camera, X } from 'lucide-react';

const Transactions: React.FC = () => {
  const { items, processTransaction } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'Inbound' | 'Outbound'>('Outbound');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState({ supplierName: '', poNumber: '', riNumber: '', sjNumber: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Refs for Focus Management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items for autocomplete
  const filteredItems = items.filter(item => 
    item.status === 'Active' && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    // Move focus to quantity
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

    if (activeTab === 'Outbound' && quantity > selectedItem.currentStock) {
      setMessage({ type: 'error', text: `Cannot add ${quantity}. Only ${selectedItem.currentStock} available.` });
      return;
    }

    const existing = cart.find(c => c.itemId === selectedItem.id);
    if (existing) {
       if (activeTab === 'Outbound' && (existing.quantity + quantity) > selectedItem.currentStock) {
         setMessage({ type: 'error', text: 'Total quantity would exceed stock!' });
         return;
       }
       setCart(cart.map(c => c.itemId === selectedItem.id ? { ...c, quantity: c.quantity + quantity } : c));
    } else {
      setCart([...cart, { 
        itemId: selectedItem.id, 
        itemName: selectedItem.name, 
        sku: selectedItem.sku, 
        quantity,
        currentStock: selectedItem.currentStock
      }]);
    }
    
    // Reset inputs and focus back to search for rapid entry
    setQuantity(1);
    setSelectedItem(null);
    setSearchTerm('');
    setMessage(null);
    setTimeout(() => searchInputRef.current?.focus(), 10);
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

    if (activeTab === 'Inbound' && (!details.supplierName || !details.riNumber)) {
      setMessage({ type: 'error', text: 'Supplier Name and RI Number are required' });
      return;
    }

    if (activeTab === 'Outbound' && !details.sjNumber) {
      setMessage({ type: 'error', text: 'Surat Jalan (SJ) Number is required' });
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

  // Close dropdown when clicking outside
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

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-zinc-950/95 backdrop-blur-sm pb-4 pt-2 -mt-2 transition-colors">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Transactions</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Create inbound or outbound stock movements.</p>
        
        {/* Tab Switcher */}
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
        {/* Left Column: Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Selection Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-colors">
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Items to Cart
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Item</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                    placeholder="Type name or SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedItem(null); // Clear selection if typing
                      setHighlightedIndex(0);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
                
                {/* Autocomplete Dropdown */}
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Qty</label>
                <input 
                  ref={qtyInputRef}
                  type="number" 
                  min="1"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
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

          {/* Transaction Details */}
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
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Receive Item (RI) No *</label>
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
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Surat Jalan (SJ) No *</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500"
                    value={details.sjNumber}
                    onChange={e => setDetails({...details, sjNumber: e.target.value})}
                  />
                </div>
              )}
            </div>

            {/* Photo Upload (Inbound Only) */}
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

        {/* Right Column: Cart Summary */}
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
                      <span className="text-sm font-bold bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
                        {item.quantity}
                      </span>
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
                 <span className="text-zinc-600 dark:text-zinc-400">Total Items</span>
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