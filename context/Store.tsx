import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Item, Transaction, TransactionType, CartItem } from '../types';

// Mock Data
const INITIAL_ITEMS: Item[] = [
  { id: '1', sku: 'ELEC-001', name: 'Wireless Mouse', category: 'Electronics', price: 150000, location: 'A-01', minLevel: 10, status: 'Active', currentStock: 45, unit: 'pcs', conversionRate: 10, secondaryUnit: 'Box' },
  { id: '2', sku: 'ELEC-002', name: 'Mechanical Keyboard', category: 'Electronics', price: 850000, location: 'A-02', minLevel: 5, status: 'Active', currentStock: 12, unit: 'pcs', conversionRate: 5, secondaryUnit: 'Crt' },
  { id: '3', sku: 'OFF-001', name: 'A4 Paper Ream', category: 'Office Supplies', price: 45000, location: 'B-01', minLevel: 50, status: 'Active', currentStock: 22, unit: 'ream', conversionRate: 5, secondaryUnit: 'Box' },
  { id: '4', sku: 'FUR-001', name: 'Ergonomic Chair', category: 'Furniture', price: 2500000, location: 'C-05', minLevel: 2, status: 'Active', currentStock: 0, unit: 'unit' },
  { id: '5', sku: 'ELEC-003', name: 'USB-C Cable', category: 'Electronics', price: 35000, location: 'A-03', minLevel: 20, status: 'Active', currentStock: 15, unit: 'pcs', conversionRate: 100, secondaryUnit: 'MasterBox' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
    id: '1', transactionId: 'TRX-2023-001', type: 'Inbound', date: new Date(Date.now() - 86400000 * 2).toISOString(), 
    items: [{ itemId: '1', itemName: 'Wireless Mouse', sku: 'ELEC-001', quantity: 50, currentStock: 0 }],
    supplierName: 'Tech Distro Jaya', riNumber: 'RI-001', totalItems: 50, photos: []
  },
  { 
    id: '2', transactionId: 'TRX-2023-002', type: 'Outbound', date: new Date(Date.now() - 86400000).toISOString(), 
    items: [{ itemId: '1', itemName: 'Wireless Mouse', sku: 'ELEC-001', quantity: 5, currentStock: 50 }],
    sjNumber: 'SJ-001', totalItems: 5, photos: []
  }
];

interface AppContextType {
  items: Item[];
  transactions: Transaction[];
  addItem: (item: Omit<Item, 'id'>) => void;
  addItems: (items: Omit<Item, 'id'>[]) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  processTransaction: (
    type: TransactionType, 
    cart: CartItem[], 
    details: { supplierName?: string; poNumber?: string; riNumber?: string; sjNumber?: string; photos?: string[] }
  ) => boolean;
  updateTransaction: (transaction: Transaction) => boolean;
  deleteTransaction: (id: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Load from local storage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('jupiter_items');
    if (savedItems) setItems(JSON.parse(savedItems));
    
    const savedTrx = localStorage.getItem('jupiter_trx');
    if (savedTrx) setTransactions(JSON.parse(savedTrx));
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem('jupiter_items', JSON.stringify(items));
    localStorage.setItem('jupiter_trx', JSON.stringify(transactions));
  }, [items, transactions]);

  // Theme Effects
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const addItem = (newItem: Omit<Item, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setItems([...items, { ...newItem, id }]);
  };

  const addItems = (newItems: Omit<Item, 'id'>[]) => {
    const itemsWithIds = newItems.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setItems(prev => [...prev, ...itemsWithIds]);
  };

  const updateItem = (updatedItem: Item) => {
    setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateTransaction = (updatedTrx: Transaction): boolean => {
    const originalTrx = transactions.find(t => t.id === updatedTrx.id);
    if (!originalTrx) return false;

    // Create a deep copy of items to simulate and apply changes safely
    let tempItems = items.map(i => ({...i}));

    // 1. Revert Original Transaction Effects
    // If Inbound: Subtract original qty. If Outbound: Add back original qty.
    for (const oldItem of originalTrx.items) {
      const itemIndex = tempItems.findIndex(i => i.id === oldItem.itemId);
      if (itemIndex > -1) {
        if (originalTrx.type === 'Inbound') {
           tempItems[itemIndex].currentStock -= oldItem.quantity;
        } else {
           tempItems[itemIndex].currentStock += oldItem.quantity;
        }
      }
    }

    // 2. Apply New Transaction Effects & Validate
    for (const newItem of updatedTrx.items) {
      const itemIndex = tempItems.findIndex(i => i.id === newItem.itemId);
      if (itemIndex > -1) {
         if (updatedTrx.type === 'Inbound') {
            tempItems[itemIndex].currentStock += newItem.quantity;
         } else {
            // Outbound check
            if (tempItems[itemIndex].currentStock < newItem.quantity) {
               // Stock insufficient (likely because we increased outbound qty beyond limits)
               alert(`Insufficient stock for ${newItem.itemName}. Available after revert: ${tempItems[itemIndex].currentStock}`);
               return false;
            }
            tempItems[itemIndex].currentStock -= newItem.quantity;
         }
      }
    }

    // 3. Commit Changes
    setItems(tempItems);
    
    // Recalculate total items count
    const finalTrx = {
      ...updatedTrx,
      totalItems: updatedTrx.items.reduce((acc, curr) => acc + curr.quantity, 0)
    };
    
    setTransactions(transactions.map(t => t.id === updatedTrx.id ? finalTrx : t));
    return true;
  };

  const deleteTransaction = (id: string) => {
    const trx = transactions.find(t => t.id === id);
    if (!trx) return;

    // Revert stock changes
    const newItems = items.map(item => {
      const trxItem = trx.items.find(ti => ti.itemId === item.id);
      if (trxItem) {
        const adjustment = trx.type === 'Inbound' ? -trxItem.quantity : trxItem.quantity;
        return { ...item, currentStock: item.currentStock + adjustment };
      }
      return item;
    });

    setItems(newItems);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const processTransaction = (
    type: TransactionType, 
    cart: CartItem[], 
    details: { supplierName?: string; poNumber?: string; riNumber?: string; sjNumber?: string; photos?: string[] }
  ): boolean => {
    
    // 1. Validate Stock for Outbound
    if (type === 'Outbound') {
      for (const cartItem of cart) {
        const item = items.find(i => i.id === cartItem.itemId);
        if (!item || item.currentStock < cartItem.quantity) {
          return false; // Fail validation
        }
      }
    }

    // 2. Update Items Stock
    const newItems = items.map(item => {
      const cartItem = cart.find(c => c.itemId === item.id);
      if (cartItem) {
        const adjustment = type === 'Inbound' ? cartItem.quantity : -cartItem.quantity;
        return { ...item, currentStock: item.currentStock + adjustment };
      }
      return item;
    });

    setItems(newItems);

    // 3. Record Transaction
    const newTrx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      transactionId: `TRX-${new Date().getFullYear()}-${String(transactions.length + 1).padStart(3, '0')}`,
      type,
      date: new Date().toISOString(),
      items: cart,
      totalItems: cart.reduce((acc, curr) => acc + curr.quantity, 0),
      ...details
    };

    setTransactions([newTrx, ...transactions]);
    return true;
  };

  return (
    <AppContext.Provider value={{ 
      items, 
      transactions, 
      addItem, 
      addItems,
      updateItem, 
      deleteItem, 
      processTransaction, 
      updateTransaction,
      deleteTransaction,
      isDarkMode,
      toggleTheme
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