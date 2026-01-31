
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
  
  // URL Default AppScript User (Harus diupdate di halaman Admin)
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jupiter_api_url') || "");

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
      const res = await fetch(url);
      if (res.ok) return { success: true, message: "Koneksi AppScript Berhasil!" };
      return { success: false, message: "Server merespon, tapi cek izin Web App Anda." };
    } catch (e: any) {
      return { success: false, message: "URL Tidak Valid atau CORS Error." };
    }
  };

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
    } catch (e: any) {
      setBackendOnline(false);
      setLastError(e.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const postAction = async (action: string, data: any) => {
    if (!apiUrl) return;
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors', // Penting untuk Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
      });
      // Karena no-cors tidak bisa baca response, kita refresh data setelah delay kecil
      setTimeout(fetchData, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = (newItem: Omit<Item, 'id'>) => postAction('addItem', newItem);
  const updateItem = (it: Item) => postAction('updateItem', it);
  const deleteItem = (id: string) => postAction('deleteItem', { id });
  
  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    await postAction('processTransaction', { 
      trx: { type, items: cart, ...details }, 
      items_update: cart.map(c => ({ id: c.itemId, quantity: c.quantity, type })) 
    });
    return true;
  };

  const deleteTransaction = (id: string) => postAction('deleteTransaction', { id });
  const addRejectLog = (log: RejectLog) => postAction('addRejectLog', log);

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, addItems: () => {}, updateItem, deleteItem, bulkDeleteItems: async () => {},
      processTransaction, deleteTransaction, updateTransaction: async () => true,
      addRejectLog, updateRejectLog: () => {}, deleteRejectLog: () => {},
      updateRejectMaster: () => {}, isDarkMode, toggleTheme, backendOnline, lastError,
      refreshData: fetchData, apiUrl, updateApiUrl, testConnection, resetDatabase: async () => false
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
