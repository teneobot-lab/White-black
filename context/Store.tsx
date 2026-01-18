import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Item, Transaction, TransactionType, CartItem, RejectItem, RejectLog } from '../types';

const API_BASE = '/api';

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
    secondaryUnit: dbItem.secondary_unit,
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setItems((data.items || []).map(mapItem));
      setTransactions(data.transactions || []);
      setRejectMasterData(data.rejectMaster || []);
      setRejectLogs(data.rejectLogs || []);
    } catch (err) {
      console.error(err);
      setItems([]);
      setTransactions([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = async (newItem: Omit<Item, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const itemWithId = { ...newItem, id } as Item;
    setItems(prev => [...prev, itemWithId]);

    await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemWithId),
    });

    fetchData();
  };

  const addItems = async (items: (Omit<Item, 'id'> & { id?: string })[]) => {
    for (const i of items) {
      await addItem(i as Omit<Item, 'id'>);
    }
  };

  const updateItem = async (item: Item) => {
    await fetch(`${API_BASE}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    fetchData();
  };

  const deleteItem = async (id: string) => {
    await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const processTransaction = async (
    type: TransactionType,
    cart: CartItem[],
    details: any
  ): Promise<boolean> => {
    const updatedItems = items.map(item => {
      const c = cart.find(ci => ci.itemId === item.id);
      if (!c) return item;
      const adj = type === 'Inbound' ? c.quantity : -c.quantity;
      return { ...item, currentStock: item.currentStock + adj };
    });

    const trx = {
      id: Math.random().toString(36).slice(2),
      transactionId: `TRX-${Date.now().toString().slice(-6)}`,
      type,
      date: new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((a, b) => a + b.quantity, 0),
      ...details,
    };

    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trx,
        items_update: updatedItems.map(i => ({
          id: i.id,
          currentStock: i.currentStock,
        })),
      }),
    });

    if (res.ok) {
      fetchData();
      return true;
    }
    return false;
  };

  const toggleTheme = () => setIsDarkMode(v => !v);

  return (
    <AppContext.Provider
      value={{
        items,
        transactions,
        rejectMasterData,
        rejectLogs,
        addItem,
        addItems,
        updateItem,
        deleteItem,
        processTransaction,
        updateTransaction: () => true,
        deleteTransaction: async () => {},
        addRejectLog: async () => {},
        updateRejectLog: () => {},
        deleteRejectLog: () => {},
        updateRejectMaster: async () => {},
        isDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
};
