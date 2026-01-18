
export type ItemStatus = 'Active' | 'Inactive';

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  location: string;
  minLevel: number;
  status: ItemStatus;
  currentStock: number;
  unit: string; // Base unit (e.g., pcs)
  conversionRate?: number; // How many base units in one secondary unit (e.g., 12)
  secondaryUnit?: string; // Name of secondary unit (e.g., Box)
}

export interface CartItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  currentStock: number; // for validation
  inputQuantity?: number; // Quantity entered by user (e.g., 2)
  inputUnit?: string; // Unit selected by user (e.g., Box)
}

export type TransactionType = 'Inbound' | 'Outbound';

export interface Transaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  date: string;
  items: CartItem[];
  supplierName?: string;
  poNumber?: string;
  riNumber?: string; // Receive Item number
  sjNumber?: string; // Surat Jalan number
  totalItems: number;
  photos?: string[]; // Array of base64 strings or URLs
}

export interface KpiData {
  totalValue: number;
  totalUnits: number;
  totalSku: number;
  lowStockCount: number;
}

// --- REJECT MODULE TYPES ---

export interface RejectItem {
  id: string;
  sku: string;
  name: string;
  baseUnit: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
  lastUpdated?: string;
}

export interface RejectItemDetail {
  itemId: string;
  itemName: string;
  sku: string;
  baseUnit: string;
  quantity: number; // Qty input by user
  unit: string; // Unit selected by user
  ratio: number; // Conversion ratio used
  totalBaseQuantity: number; // Calculated base qty
  reason: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
}

export interface RejectLog {
  id: string;
  date: string;
  items: RejectItemDetail[];
  notes: string;
  timestamp: string;
}
