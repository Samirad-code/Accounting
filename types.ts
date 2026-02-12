
export enum InvoiceType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  DEBT = 'DEBT',
  MIXED = 'MIXED'
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  DISMISSED = 'DISMISSED',
  OVERDUE = 'OVERDUE'
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  internalCode?: string;
  barcode?: string;
  retailPrice: number;
  wholesalePrice: number;
  avgCost: number; // Weighted Average Cost
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierName?: string;
  items: PurchaseItem[];
  extraCost: number;
  totalAmount: number;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  note?: string;
  balance: number; // Negative means they owe us
}

export interface InvoiceItem {
  productId?: string; // Optional for manual items
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  costBasisAtSale: number; // avgCost at the time of sale for profit calculation
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  type: InvoiceType;
  customerId?: string;
  customerName?: string;
  items: InvoiceItem[];
  totalAmount: number;
  discountTotal: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: 'ACTIVE' | 'CANCELLED';
}

export interface Payment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  relatedInvoiceId?: string;
}

export interface Reminder {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  dueDate: string;
  message: string;
  status: ReminderStatus;
}
