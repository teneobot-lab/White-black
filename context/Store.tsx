
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

interface AppContextType {
  items: Item[];
  transactions: Transaction[];
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  addItem: (item: Omit<Item, 'id'>) => void;
  addItems: (items: (Omit<Item, 'id'> & { id?: string })[]) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  processTransaction: (type: TransactionType, cart: CartItem[], details: any) => Promise<boolean>;
  updateTransaction: (transaction: Transaction) => Promise<boolean>;
  deleteTransaction: (id: string) => void;
  addRejectLog: (log: RejectLog) => void;
  updateRejectLog: (log: RejectLog) => void;
  deleteRejectLog: (id: string) => void;
  updateRejectMaster: (newList: RejectItem[]) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  backendOnline: boolean;
  lastError: string | null;
  refreshData: () => Promise<void>;
  apiUrl: string;
  updateApiUrl: (url: string) => void;
  testConnection: (url: string) => Promise<{success: boolean, message: string}>;
  resetDatabase: () => Promise<boolean>;
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
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jupiter_api_url') || "/api");

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

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
      const res = await fetch(`${url}/sync`, { method: 'GET' });
      if (res.ok) return { success: true, message: "Koneksi Berhasil!" };
      return { success: false, message: `Server merespon error: ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Gagal: ${e.message}` };
    }
  };

  const mapItem = (dbItem: any): Item => ({
    id: dbItem.id,
    sku: dbItem.sku,
    name: dbItem.name,
    category: dbItem.category,
    price: parseFloat(dbItem.price) || 0,
    location: dbItem.location || '-',
    minLevel: dbItem.min_level || 0,
    status: dbItem.status || 'Active',
    currentStock: parseFloat(dbItem.current_stock) || 0,
    unit: dbItem.unit || 'pcs',
    conversionRate: dbItem.conversion_rate || 1,
    secondaryUnit: dbItem.secondary_unit || ''
  });

  const safeJsonParse = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const p = JSON.parse(val);
        return Array.isArray(p) ? p : [p];
      } catch (e) { return []; }
    }
    return [];
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${apiUrl}/sync`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();

      // Sanitasi Mendalam: Pastikan tidak ada field yang null/undefined yang bisa merusak komponen
      const cleanedTransactions = (data.transactions || []).map((t: any) => ({
        ...t,
        id: t.id || Math.random().toString(36).substr(2, 9),
        transactionId: t.transactionId || 'TRX-UNK',
        items: safeJsonParse(t.items),
        photos: safeJsonParse(t.photos),
        date: t.date || new Date().toISOString()
      }));

      setItems((data.items || []).map(mapItem));
      setTransactions(cleanedTransactions);
      setRejectMasterData(data.rejectMaster || []);
      setRejectLogs((data.rejectLogs || []).map((l: any) => ({ 
        ...l, 
        items: safeJsonParse(l.items) 
      })));
      setBackendOnline(true);
      setLastError(null);
    } catch (e: any) {
      console.error("Fetch Data Error:", e.message);
      setBackendOnline(false);
      setLastError(e.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const addItem = async (newItem: Omit<Item, 'id'>) => {
    await fetch(`${apiUrl}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    fetchData();
  };

  const addItems = async (itemsList: any[]) => {
    for (const item of itemsList) {
      await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    }
    fetchData();
  };

  const updateItem = async (it: Item) => {
    await fetch(`${apiUrl}/items/${it.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(it)
    });
    fetchData();
  };

  const deleteItem = async (id: string) => {
    await fetch(`${apiUrl}/items/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const bulkDeleteItems = async (ids: string[]) => {
    await fetch(`${apiUrl}/items/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    fetchData();
  };

  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trx: { type, items: cart, ...details }, items_update: cart.map(c => ({ id: c.itemId, quantity: c.quantity, type })) })
      });
      if (res.ok) { fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const updateTransaction = async (trx: Transaction): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/transactions/${trx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trx)
      });
      if (res.ok) { fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const deleteTransaction = async (id: string) => {
    await fetch(`${apiUrl}/transactions/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const addRejectLog = async (log: RejectLog) => {
    await fetch(`${apiUrl}/reject-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    fetchData();
  };

  const updateRejectMaster = async (newList: RejectItem[]) => {
    await fetch(`${apiUrl}/reject-master/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newList })
    });
    fetchData();
  };

  const resetDatabase = async () => {
    const res = await fetch(`${apiUrl}/reset-database`, { method: 'DELETE' });
    if (res.ok) { fetchData(); return true; }
    return false;
  };

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, addItems, updateItem, deleteItem, bulkDeleteItems,
      processTransaction, deleteTransaction, updateTransaction,
      addRejectLog, updateRejectLog: () => {}, deleteRejectLog: () => {},
      updateRejectMaster, isDarkMode, toggleTheme, backendOnline, lastError,
      refreshData: fetchData, apiUrl, updateApiUrl, testConnection, resetDatabase
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
