
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

const API_BASE = "http://178.128.106.33:5000/api";

interface AppContextType {
  items: Item[];
  transactions: Transaction[];
  rejectMasterData: RejectItem[];
  rejectLogs: RejectLog[];
  addItem: (item: Omit<Item, 'id'>) => void;
  addItems: (items: (Omit<Item, 'id'> & { id?: string })[]) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  processTransaction: (type: TransactionType, cart: CartItem[], details: any) => Promise<boolean>;
  updateTransaction: (transaction: Transaction) => boolean;
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

  const mapItem = (dbItem: any): Item => ({
    id: dbItem.id,
    sku: dbItem.sku,
    name: dbItem.name,
    category: dbItem.category,
    price: parseFloat(dbItem.price),
    location: dbItem.location,
    minLevel: dbItem.min_level,
    status: dbItem.status,
    currentStock: parseFloat(dbItem.current_stock),
    unit: dbItem.unit,
    conversionRate: dbItem.conversion_rate,
    secondaryUnit: dbItem.secondary_unit
  });

  const fetchData = async () => {
    try {
      setLastError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout

      const res = await fetch(`${API_BASE}/sync`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Server merespon dengan status: ${res.status}`);
      
      const data = await res.json();
      
      setItems((data.items || []).map(mapItem));
      setTransactions(data.transactions || []);
      setRejectMasterData(data.rejectMaster || []);
      setRejectLogs(data.rejectLogs || []);
      setBackendOnline(true);
      setLastError(null);
    } catch (e: any) { 
      setBackendOnline(false);
      if (e.name === 'AbortError') {
        setLastError("Request Timeout: VPS tidak merespon dalam 8 detik.");
      } else if (window.location.protocol === 'https:' && API_BASE.startsWith('http:')) {
        setLastError("Blokir Keamanan: Browser memblokir koneksi HTTP di situs HTTPS. Klik ikon gembok di URL bar > Site Settings > Allow Insecure Content.");
      } else {
        setLastError(`Koneksi Gagal: ${e.message || "Cek apakah VPS menyalakan API di port 5000"}`);
      }
      console.error("Database Error:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Sync setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const addItem = async (newItem: Omit<Item, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const itemWithId = { ...newItem, id } as Item;
    setItems(prev => [...prev, itemWithId]);
    try {
      await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemWithId, min_level: itemWithId.minLevel, current_stock: itemWithId.currentStock })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const addItems = async (newItems: (Omit<Item, 'id'> & { id?: string })[]) => {
    for (const item of newItems) { await addItem(item as Omit<Item, 'id'>); }
  };

  const updateItem = async (updatedItem: Item) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    try {
      await fetch(`${API_BASE}/items/${updatedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedItem, min_level: updatedItem.minLevel, current_stock: updatedItem.currentStock })
      });
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  };

  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    const updatedItems = items.map(item => {
      const cartItem = cart.find(c => c.itemId === item.id);
      if (cartItem) {
        const adj = type === 'Inbound' ? cartItem.quantity : -cartItem.quantity;
        return { ...item, currentStock: item.currentStock + adj };
      }
      return item;
    });

    const newTrx = {
      id: Math.random().toString(36).substr(2, 9),
      transactionId: `TRX-${Date.now().toString().slice(-6)}`,
      type,
      date: new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((a, b) => a + b.quantity, 0),
      ...details
    };

    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trx: newTrx, items_update: updatedItems.map(i => ({ id: i.id, currentStock: i.currentStock })) })
      });
      if (res.ok) { fetchData(); return true; }
      return false;
    } catch (e) { console.error(e); return false; }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const addRejectLog = async (log: RejectLog) => {
    try {
      await fetch(`${API_BASE}/reject-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateRejectMaster = async (newList: RejectItem[]) => {
    try {
      await fetch(`${API_BASE}/reject-master/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newList })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, addItems, updateItem, deleteItem,
      processTransaction, deleteTransaction, updateTransaction: () => true,
      addRejectLog, updateRejectLog: () => {}, deleteRejectLog: () => {},
      updateRejectMaster, isDarkMode, toggleTheme, backendOnline, lastError,
      refreshData: fetchData
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
