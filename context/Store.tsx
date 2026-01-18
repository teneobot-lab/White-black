
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jupiter_api_url') || "/api");

  const updateApiUrl = (newUrl: string) => {
    localStorage.setItem('jupiter_api_url', newUrl);
    setApiUrl(newUrl);
  };

  const testConnection = async (url: string): Promise<{success: boolean, message: string}> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${url}/sync`, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.status === 200) return { success: true, message: "Koneksi Berhasil!" };
      if (res.status === 502) return { success: false, message: "Error 502: Backend VPS Anda mati atau tidak aktif." };
      if (res.status === 504) return { success: false, message: "Error 504: Koneksi ke VPS Timeout." };
      return { success: false, message: `Error ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { success: false, message: e.name === 'AbortError' ? "Koneksi Timeout (8s)" : `Gagal: ${e.message}` };
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

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${apiUrl}/sync`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 502) throw new Error("Backend VPS Tidak Aktif (Error 502)");
        if (res.status === 504) throw new Error("Gateway Timeout (Error 504)");
        throw new Error(`Server Error: ${res.status}`);
      }
      
      const data = await res.json();
      setItems((data.items || []).map(mapItem));
      setTransactions(data.transactions || []);
      setRejectMasterData(data.rejectMaster || []);
      setRejectLogs(data.rejectLogs || []);
      setBackendOnline(true);
      setLastError(null);
    } catch (e: any) { 
      setBackendOnline(false);
      setLastError(e.name === 'AbortError' ? "Koneksi Timeout" : e.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 45000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const addItem = async (newItem: Omit<Item, 'id'>) => {
    try {
      const res = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, min_level: newItem.minLevel, current_stock: newItem.currentStock })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const addItems = async (newItems: (Omit<Item, 'id'> & { id?: string })[]) => {
    for (const item of newItems) { await addItem(item as Omit<Item, 'id'>); }
  };

  const updateItem = async (updatedItem: Item) => {
    try {
      // Fix: Change updatedItem.current_stock to updatedItem.currentStock
      const res = await fetch(`${apiUrl}/items/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedItem, min_level: updatedItem.minLevel, current_stock: updatedItem.currentStock })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/items/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const bulkDeleteItems = async (ids: string[]) => {
    try {
      const res = await fetch(`${apiUrl}/items/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); return false; }
  };

  const updateTransaction = async (updatedTrx: Transaction): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/transactions/${updatedTrx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTrx)
      });
      if (res.ok) {
        fetchData();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await fetch(`${apiUrl}/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const addRejectLog = async (log: RejectLog) => {
    try {
      await fetch(`${apiUrl}/reject-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateRejectMaster = async (newList: RejectItem[]) => {
    try {
      await fetch(`${apiUrl}/reject-master/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newList })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const resetDatabase = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiUrl}/reset-database`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

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
