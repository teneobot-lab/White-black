
import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useCallback, useRef } from 'react';
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
  updateRejectItem: (item: RejectItem) => void;
  deleteRejectItem: (id: string) => void;
  bulkAddRejectItems: (items: Omit<RejectItem, 'id'>[]) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  backendOnline: boolean;
  isSyncing: boolean;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jupiter_api_url') || "");

  const apiUrlRef = useRef<string>(apiUrl);
  const syncLockRef = useRef<boolean>(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    apiUrlRef.current = apiUrl;
  }, [apiUrl]);

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
    let formattedUrl = newUrl.trim();
    if (formattedUrl && !formattedUrl.endsWith('/exec')) {
      if (!formattedUrl.includes('/exec?')) {
        formattedUrl = formattedUrl.replace(/\/$/, '') + '/exec';
      }
    }
    localStorage.setItem('jupiter_api_url', formattedUrl);
    apiUrlRef.current = formattedUrl;
    setApiUrl(formattedUrl);
  };

  const testConnection = async (url: string): Promise<{success: boolean, message: string}> => {
    try {
      const res = await fetch(url);
      if (res.ok) return { success: true, message: "Koneksi Aktif! Spreadsheet terbaca." };
      return { success: false, message: "HTTP Error: " + res.status };
    } catch (e) {
      return { success: false, message: "Koneksi Gagal: Cek URL Apps Script." };
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

  const fetchData = useCallback(async (force = false) => {
    const currentUrl = apiUrlRef.current;
    if (!currentUrl || (!force && syncLockRef.current)) return;
    
    try {
      const res = await fetch(currentUrl);
      if (!res.ok) throw new Error("Server Error: " + res.status);
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Re-check lock after network request to prevent state overriding
      if (!force && syncLockRef.current) return;

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
        photos: safeJsonParse(t.photos),
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
      console.error("Fetch Data Error:", e);
      setBackendOnline(false);
      setLastError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const pushAction = async (action: string, data: any) => {
    const currentUrl = apiUrlRef.current;
    if (!currentUrl) return false;
    
    syncLockRef.current = true;
    setIsSyncing(true);
    
    try {
      const response = await fetch(currentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Beri waktu 4 detik agar Google Sheets selesai memproses flush
        setTimeout(() => {
          syncLockRef.current = false;
          setIsSyncing(false);
          fetchData(true);
        }, 4000);
        return true;
      } else {
        throw new Error(result.error || "Gagal menyimpan ke server");
      }
    } catch (err: any) {
      console.error("Push Action Error:", err.message);
      setLastError(err.message);
      setIsSyncing(false);
      syncLockRef.current = false;
      return false;
    }
  };

  const addItem = (newItem: Omit<Item, 'id'>) => {
    const fullItem = { ...newItem, id: generateId() } as Item;
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
      return {
        id: cartItem.itemId,
        sku: cartItem.sku,
        name: cartItem.itemName,
        quantity: cartItem.quantity,
        type: type,
        currentStock: (originalItem?.currentStock || 0) + adjustment,
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

    return await pushAction('processTransaction', { trx: newTrx, items_update: itemsUpdateWithMetadata });
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

  const updateRejectItem = (item: RejectItem) => {
    setRejectMasterData(prev => prev.map(i => i.id === item.id ? item : i));
    pushAction('updateRejectItem', item);
  };

  const deleteRejectItem = (id: string) => {
    setRejectMasterData(prev => prev.filter(i => i.id !== id));
    pushAction('deleteRejectItem', { id });
  };

  const bulkAddRejectItems = (newItems: Omit<RejectItem, 'id'>[]) => {
    const itemsWithIds = newItems.map(item => ({ ...item, id: generateId(), lastUpdated: new Date().toISOString() }));
    setRejectMasterData(prev => [...prev, ...itemsWithIds]);
    pushAction('bulkAddRejectItems', { items: itemsWithIds });
  };

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, bulkAddItems, updateItem, deleteItem, bulkDeleteItems,
      processTransaction, deleteTransaction, 
      addRejectLog, deleteRejectLog, addRejectItem, updateRejectItem, deleteRejectItem, bulkAddRejectItems,
      isDarkMode, toggleTheme, backendOnline, isSyncing, lastError, lastSync,
      refreshData: () => fetchData(true), apiUrl, updateApiUrl, testConnection
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
