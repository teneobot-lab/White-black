
import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useCallback } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

interface AppContextType {
  items: Item[];
  transactions: Transaction[];
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  addItem: (item: Omit<Item, 'id'>) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  processTransaction: (type: TransactionType, cart: CartItem[], details: any) => Promise<boolean>;
  deleteTransaction: (id: string) => void;
  addRejectLog: (log: RejectLog) => void;
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
      return { success: false, message: "URL Salah atau CORS Blocked." };
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

  // --- LOGIKA SYNC UTAMA (GET) ---
  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const res = await fetch(apiUrl);
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
      setBackendOnline(false);
      setLastError(e.message);
    }
  }, [apiUrl]);

  // Initial load & Polling (Sync Otomatis setiap 30 detik)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- LOGIKA AUTOMATIC PUSH (POST) ---
  const pushAction = async (action: string, data: any) => {
    if (!apiUrl) return;
    try {
      // Background push
      fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
      });
      
      // Re-validate state after push (delay for GS processing)
      setTimeout(fetchData, 2500);
    } catch (err) {
      console.error("Sync Push Error:", err);
    }
  };

  // --- MUTATION WRAPPERS (Optimistic UI) ---

  const addItem = (newItem: Omit<Item, 'id'>) => {
    const id = generateId();
    const fullItem = { ...newItem, id } as Item;
    // Update Lokal Instan
    setItems(prev => [...prev, fullItem]);
    // Push ke Server
    pushAction('addItem', fullItem);
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
    for (const id of ids) {
      await pushAction('deleteItem', { id });
    }
  };

  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    const trxId = `TRX-${Date.now()}`;
    const newTrx: Transaction = {
      id: generateId(),
      transactionId: trxId,
      type,
      date: details.date || new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((a, b) => a + (b.quantity || 0), 0),
      ...details
    };

    // 1. Update Transaksi Lokal
    setTransactions(prev => [newTrx, ...prev]);

    // 2. Update Stok Lokal (Optimistic)
    setItems(prev => prev.map(item => {
      const cartMatch = cart.find(c => c.itemId === item.id);
      if (cartMatch) {
        const adjustment = type === 'Inbound' ? cartMatch.quantity : -cartMatch.quantity;
        return { ...item, currentStock: item.currentStock + adjustment };
      }
      return item;
    }));

    // 3. Push ke Google Sheets
    pushAction('processTransaction', { 
      trx: newTrx, 
      items_update: cart.map(c => ({ id: c.itemId, quantity: c.quantity, type })) 
    });

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

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, updateItem, deleteItem, bulkDeleteItems,
      processTransaction, deleteTransaction, 
      addRejectLog, isDarkMode, toggleTheme, backendOnline, lastError, lastSync,
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
