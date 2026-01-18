
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

// GANTI DENGAN IP VPS ANDA
const API_BASE = "http://IP_VPS_ANDA:5000/api";

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rejectMasterData, setRejectMasterData] = useState<RejectItem[]>([]);
  const [rejectLogs, setRejectLogs] = useState<RejectLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // FETCH DATA AWAL DARI BACKEND
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync`);
      const data = await res.json();
      setItems(data.items);
      setTransactions(data.transactions);
      setRejectMasterData(data.rejectMaster);
      setRejectLogs(data.rejectLogs);
    } catch (e) { console.error("Database offline, using cached data", e); }
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = async (newItem: Omit<Item, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const itemWithId = { ...newItem, id } as Item;
    setItems([...items, itemWithId]);
    await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemWithId)
    });
  };

  const processTransaction = async (type: TransactionType, cart: CartItem[], details: any): Promise<boolean> => {
    // Tetap gunakan logika validasi stok yang sudah ada
    if (type === 'Outbound') {
      for (const cartItem of cart) {
        const item = items.find(i => i.id === cartItem.itemId);
        if (!item || item.currentStock < cartItem.quantity) return false;
      }
    }

    // Hitung stok baru secara lokal dulu (Optimistic UI)
    const updatedItems = items.map(item => {
      const cartItem = cart.find(c => c.itemId === item.id);
      if (cartItem) {
        const adj = type === 'Inbound' ? cartItem.quantity : -cartItem.quantity;
        return { ...item, current_stock: Number(item.currentStock) + adj };
      }
      return item;
    });

    const newTrx = {
      id: Math.random().toString(36).substr(2, 9),
      transactionId: `TRX-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      type,
      date: new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((a, b) => a + b.quantity, 0),
      ...details
    };

    // Kirim ke Backend
    try {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trx: newTrx, items_update: updatedItems })
      });
      fetchData(); // Refresh data dari DB
      return true;
    } catch (e) {
      return false;
    }
  };

  // ... Implementasi fungsi lainnya (updateItem, delete, dll) mengikuti pola yang sama:
  // 1. Update State Lokal (biar cepat di UI)
  // 2. Kirim fetch/POST ke Backend API
  
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <AppContext.Provider value={{ 
      items, transactions, rejectMasterData, rejectLogs, 
      addItem, processTransaction, isDarkMode, toggleTheme,
      // Pass empty placeholders for remaining to satisfy type until implemented
      addItems: () => {}, updateItem: () => {}, deleteItem: () => {},
      updateTransaction: () => true, deleteTransaction: () => {},
      addRejectLog: () => {}, updateRejectLog: () => {}, deleteRejectLog: () => {},
      updateRejectMaster: () => {}
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
