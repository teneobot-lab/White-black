
import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useCallback } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

interface AppContextType {
  items: Item[];
  transactions: Transaction[];
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  addItem: (item: Omit<Item, 'id'>) => void;
  bulkAddItems: (items: Omit<Item, 'id'>[]) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  processTransaction: (type: TransactionType, cart: CartItem[], details: any) => Promise<boolean>;
  deleteTransaction: (id: string) => void;
  addRejectLog: (log: RejectLog) => void;
  deleteRejectLog: (id: string) => void;
  addRejectItem: (item: Omit<RejectItem, 'id'>) => void;
  bulkAddRejectItems: (items: Omit<RejectItem, 'id'>[]) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  backendOnline: boolean;
  lastError: string | null;
  lastSync: Date | null;
  refreshData: () => Promise<void>;
  apiUrl: string;
  updateApiUrl: (url: string) => void;
  testConnection: (url: string) => Promise<{success: boolean, message: string}>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectMasterData, setRejectMasterData] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('jupiter_theme') === 'dark');
  const [backendOnline, setBackendOnline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jupiter_api_url') || "");

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jupiter_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jupiter_theme', 'light');
    }
  }, [isDarkMode]);

  const updateApiUrl = (newUrl: string) => {
    localStorage.setItem('jupiter_api_url', newUrl);
    setApiUrl(newUrl);
  };

  const testConnection = async (url: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(url);
      if (res.ok) return { success: true, message: "Koneksi Google Sheets Aktif!" };
      return { success: false, message: "URL valid tapi Sheet tidak merespon." };
    } catch (e) {
      return { success: false, message: "Cek kembali URL (Pastikan deployed sebagai Web App)." };
    }
  };

  const safeJsonParse = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return [];
  };

  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(apiUrl); // Apps Script GET returns everything
      const data = await res.json();

      setItems((data.items || []).map((item: any) => ({
        ...item,
        price: parseFloat(item.price) || 0,
        currentStock: parseFloat(item.currentStock) || 0,
        minLevel: parseInt(item.minLevel) || 0,
        conversionRate: parseFloat(item.conversionRate) || 1
      })));
      
      setTransactions((data.transactions || []).map((t: any) => ({
        ...t,
        items: safeJsonParse(t.items),
        photos: t.photos, // Now returns a Drive string link if using the new script
      })));
      
      setRejectMasterData(data.rejectMaster || []);
      setRejectLogs((data.rejectLogs || []).map((l: any) => ({ 
        ...l, 
        items: safeJsonParse(l.items) 
      })));
      
      setBackendOnline(true);
      setLastError(null);
      setLastSync(new Date());
    } catch (e: any) {
      setBackendOnline(false);
      setLastError(e.message);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 minute sync for sheets
    return () => clearInterval(interval);
  }, [fetchData]);

  const pushAction = async (action: string, data: any) => {
    if (!apiUrl) return;
    try {
      // Apps Script uses a single endpoint with POST
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Avoid CORS preflight on Apps Script
        body: JSON.stringify({ action, data })
      });
      
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error("Apps Script Sync Error:", err);
    }
  };

  const addItem = (newItem: Omit<Item, 'id'>) => {
    const id = generateId();
    const fullItem = { ...newItem, id } as Item;
    setItems(prev => [...prev, fullItem]);
    pushAction('addItem', fullItem);
  };

  const bulkAddItems = (newItems: Omit<Item, 'id'>[]) => {
    const itemsWithIds = newItems.map(item => ({ ...item, id: generateId() } as Item));
    setItems(prev => [...prev, ...itemsWithIds]);
    pushAction('bulkAddItem', { items: itemsWithIds });
  };

  const updateItem = (updatedItem: Item) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    pushAction('updateItem', updatedItem);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    pushAction('deleteItem', { id });
  };

  const bulkDeleteItems = async (ids: string[]) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    await pushAction('bulkDeleteItem', { ids });
  };

  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    const trxId = `TRX-${Date.now()}`;
    
    const itemsUpdateWithMetadata = cart.map(cartItem => {
      const originalItem = items.find(i => i.id === cartItem.itemId);
      const adjustment = type === 'Inbound' ? cartItem.quantity : -cartItem.quantity;
      const newStock = (originalItem?.currentStock || 0) + adjustment;

      return {
        id: cartItem.itemId,
        sku: cartItem.sku,
        name: cartItem.itemName,
        quantity: cartItem.quantity,
        type: type,
        currentStock: newStock,
        unit: cartItem.inputUnit
      };
    });

    const newTrx: Transaction = {
      id: generateId(),
      transactionId: trxId,
      type,
      date: details.date || new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((a, b) => a + (b.quantity || 0), 0),
      ...details
    };

    setTransactions(prev => [newTrx, ...prev]);

    setItems(prev => prev.map(item => {
      const update = itemsUpdateWithMetadata.find(u => u.id === item.id);
      if (update) return { ...item, currentStock: update.currentStock };
      return item;
    }));

    await pushAction('processTransaction', { trx: newTrx, items_update: itemsUpdateWithMetadata });
    return true;
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    pushAction('deleteTransaction', { id });
  };

  const addRejectLog = (log: RejectLog) => {
    setRejectLogs(prev => [log, ...prev]);
    pushAction('addRejectLog', log);
  };

  const deleteRejectLog = (id: string) => {
    setRejectLogs(prev => prev.filter(l => l.id !== id));
    pushAction('deleteRejectLog', { id });
  };

  const addRejectItem = (item: Omit<RejectItem, 'id'>) => {
    const fullItem = { ...item, id: generateId(), lastUpdated: new Date().toISOString() };
    setRejectMasterData(prev => [...prev, fullItem]);
    pushAction('addRejectItem', fullItem);
  };

  const bulkAddRejectItems = (newItems: Omit<RejectItem, 'id'>[]) => {
    const itemsWithIds = newItems.map(item => ({ 
      ...item, 
      id: generateId(), 
      lastUpdated: new Date().toISOString() 
    }));
    setRejectMasterData(prev => [...prev, ...itemsWithIds]);
    pushAction('bulkAddRejectItems', { items: itemsWithIds });
  };

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, bulkAddItems, updateItem, deleteItem, bulkDeleteItems,
      processTransaction, deleteTransaction, 
      addRejectLog, deleteRejectLog, addRejectItem, bulkAddRejectItems,
      isDarkMode, toggleTheme, backendOnline, lastError, lastSync,
      refreshData: fetchData, apiUrl, updateApiUrl, testConnection
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
