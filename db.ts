
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { Product, Purchase, Customer, Invoice, Payment, Reminder, Todo, Category, InvoiceType, ReminderStatus } from './types';

interface DBStructure {
  products: Product[];
  purchases: Purchase[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  reminders: Reminder[];
  todos: Todo[];
  categories: Category[];
}

type SyncStatus = 'offline' | 'connecting' | 'connected' | 'error';
type SubscriptionCallback = () => void;

class Database {
  private data: DBStructure = {
    products: [], purchases: [], customers: [], invoices: [], payments: [], reminders: [], todos: [], categories: []
  };
  
  private dbInstance: any = null;
  private syncStatus: SyncStatus = 'offline';
  private subscribers: SubscriptionCallback[] = [];

  constructor() {
    this.loadLocal();
  }

  subscribe(callback: SubscriptionCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify(isMutation: boolean = true) {
    this.saveLocal();
    if (isMutation) {
      try { localStorage.setItem('plasticban_needs_backup', 'true'); } catch(e) {}
    }
    this.subscribers.forEach(cb => cb());
  }

  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  private loadLocal() {
    try {
      const saved = localStorage.getItem('plasticban_cloud_cache');
      if (saved) {
        this.data = JSON.parse(saved);
      } else {
        const oldSaved = localStorage.getItem('plasticban_db_v2') || localStorage.getItem('plasticban_db');
        if (oldSaved) this.data = JSON.parse(oldSaved);
      }
    } catch (e) {
      console.error("Cache load error", e);
    }
  }

  private saveLocal() {
    try {
      localStorage.setItem('plasticban_cloud_cache', JSON.stringify(this.data));
    } catch (e) {
      console.error("Cache save error", e);
    }
  }

  async init(): Promise<void> {
    const configStr = localStorage.getItem('firebase_config');
    if (configStr) {
      this.connectFirebase(JSON.parse(configStr));
    } else {
      this.notify(false);
    }
  }

  connectFirebase(config: any) {
    try {
      this.syncStatus = 'connecting';
      this.notify(false);
      
      const app = initializeApp(config);
      this.dbInstance = getFirestore(app);
      this.setupCloudListeners();
      
      this.syncStatus = 'connected';
      localStorage.setItem('firebase_config', JSON.stringify(config));
      this.notify(false);
    } catch (error) {
      console.error("Firebase Connection Error:", error);
      this.syncStatus = 'error';
      this.notify(false);
    }
  }

  disconnectFirebase() {
    this.dbInstance = null;
    this.syncStatus = 'offline';
    localStorage.removeItem('firebase_config');
    this.notify(false);
  }

  private setupCloudListeners() {
    if (!this.dbInstance) return;
    
    const collections = ['products', 'purchases', 'customers', 'invoices', 'payments', 'reminders', 'todos', 'categories'];
    
    collections.forEach(colName => {
      onSnapshot(collection(this.dbInstance, colName), (snapshot) => {
        const items: any[] = [];
        snapshot.forEach(doc => items.push(doc.data()));
        (this.data as any)[colName] = items;
        this.notify(true);
      }, (error) => {
        console.error(`Error syncing ${colName}:`, error);
        this.syncStatus = 'error';
        this.notify(false);
      });
    });
  }

  private async pushDoc(colName: string, id: string, docData: any) {
    if (this.dbInstance) {
      try { await setDoc(doc(this.dbInstance, colName, id), docData); } 
      catch (e) { console.error("Cloud push failed:", e); }
    }
  }

  private async deleteDocCloud(colName: string, id: string) {
    if (this.dbInstance) {
      try { await deleteDoc(doc(this.dbInstance, colName, id)); } 
      catch (e) { console.error("Cloud delete failed:", e); }
    }
  }

  exportBackup(): string {
    return JSON.stringify(this.data);
  }

  importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.products)) {
        this.data = {
          products: parsed.products || [],
          purchases: parsed.purchases || [],
          customers: parsed.customers || [],
          invoices: parsed.invoices || [],
          payments: parsed.payments || [],
          reminders: parsed.reminders || [],
          todos: parsed.todos || [],
          categories: parsed.categories || []
        };
        this.saveLocal();
        this.notify(false);
        return true;
      }
      return false;
    } catch(e) {
      console.error("Restore failed", e);
      return false;
    }
  }

  downloadBackupFile(filename = 'plasticban_backup.json') {
    const blob = new Blob([this.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchorNode = document.createElement('a');
    anchorNode.href = url;
    anchorNode.download = filename;
    document.body.appendChild(anchorNode);
    anchorNode.click();
    document.body.removeChild(anchorNode);
    URL.revokeObjectURL(url);
    try { localStorage.setItem('plasticban_needs_backup', 'false'); } catch(e) {}
  }

  triggerAutoBackup() {
    const lastBackup = localStorage.getItem('plasticban_last_autobackup');
    const now = Date.now();
    if (!lastBackup || now - parseInt(lastBackup) > 86400000) {
      setTimeout(() => {
        this.downloadBackupFile(`plasticban_autobackup_${new Date().toISOString().split('T')[0]}.json`);
        localStorage.setItem('plasticban_last_autobackup', now.toString());
      }, 5000);
    }
  }

  getProducts() { return this.data.products; }
  getPurchases() { return this.data.purchases; }
  getCustomers() { return this.data.customers; }
  getInvoices() { return this.data.invoices; }
  getPayments() { return this.data.payments; }
  getReminders() { return this.data.reminders; }
  getTodos() { return this.data.todos; }
  getCategories() { return this.data.categories; }

  addCategory(name: string) {
    const category: Category = { id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 10000), name };
    this.data.categories.push(category);
    this.pushDoc('categories', category.id, category);
    this.notify();
    return category;
  }

  updateCategory(id: string, name: string) {
    const category = this.data.categories.find(c => c.id === id);
    if (category) {
      const oldName = category.name;
      category.name = name;
      this.pushDoc('categories', id, category);
      this.data.products.forEach(p => {
        if (p.category === oldName) {
          p.category = name;
          this.pushDoc('products', p.id, p);
        }
      });
      this.notify();
    }
  }

  deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.deleteDocCloud('categories', id);
    this.notify();
  }

  addProduct(product: Product) {
    this.data.products.push(product);
    this.pushDoc('products', product.id, product);
    this.notify();
  }

  addProducts(products: Product[]) {
    products.forEach((product) => {
      this.data.products.push(product);
      this.pushDoc('products', product.id, product);
    });
    this.notify();
  }

  updateProduct(id: string, updates: Partial<Product>) {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.products[index] = { ...this.data.products[index], ...updates };
      this.pushDoc('products', id, this.data.products[index]);
      this.notify();
    }
  }

  deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.deleteDocCloud('products', id);
    this.notify();
  }

  bulkUpdateProducts(ids: string[], updates: { retailPercent?: number, wholesalePercent?: number, costPercent?: number, quantity?: number, category?: string }) {
    this.data.products = this.data.products.map(p => {
      if (ids.includes(p.id)) {
        let updated = { ...p };
        if (updates.retailPercent !== undefined) updated.retailPrice = Math.round(updated.retailPrice * (1 + updates.retailPercent / 100));
        if (updates.wholesalePercent !== undefined) updated.wholesalePrice = Math.round(updated.wholesalePrice * (1 + updates.wholesalePercent / 100));
        if (updates.costPercent !== undefined) updated.avgCost = Math.round(updated.avgCost * (1 + updates.costPercent / 100));
        if (updates.quantity !== undefined) updated.quantity = updates.quantity;
        if (updates.category !== undefined) updated.category = updates.category;
        
        this.pushDoc('products', updated.id, updated);
        return updated;
      }
      return p;
    });
    this.notify();
  }

  addPurchase(purchase: Purchase) {
    this.data.purchases.push(purchase);
    this.pushDoc('purchases', purchase.id, purchase);
    purchase.items.forEach(item => {
      const product = this.data.products.find(p => p.id === item.productId);
      if (product) {
        const oldQty = product.quantity;
        const oldAvg = product.avgCost;
        const totalCost = (oldQty * oldAvg) + (item.qty * item.unitCost);
        product.quantity += item.qty;
        product.avgCost = product.quantity > 0 ? totalCost / product.quantity : item.unitCost;
        this.pushDoc('products', product.id, product);
      }
    });
    this.notify();
  }

  updatePurchase(id: string, updatedPurchase: Purchase) {
    const index = this.data.purchases.findIndex(p => p.id === id);
    if (index === -1) throw new Error("سند خرید یافت نشد");
    const oldPurchase = this.data.purchases[index];
    oldPurchase.items.forEach(oldItem => {
      const product = this.data.products.find(p => p.id === oldItem.productId);
      if (product) {
        const currentTotalCost = product.quantity * product.avgCost;
        const oldItemTotalCost = oldItem.qty * oldItem.unitCost;
        product.quantity -= oldItem.qty;
        if (product.quantity > 0) {
           product.avgCost = Math.max(0, (currentTotalCost - oldItemTotalCost) / product.quantity);
        } else {
           product.quantity = 0;
           product.avgCost = 0;
        }
      }
    });
    updatedPurchase.items.forEach(newItem => {
      const product = this.data.products.find(p => p.id === newItem.productId);
      if (product) {
        const currentTotalCost = product.quantity * product.avgCost;
        const newItemTotalCost = newItem.qty * newItem.unitCost;
        product.quantity += newItem.qty;
        product.avgCost = product.quantity > 0 ? (currentTotalCost + newItemTotalCost) / product.quantity : newItem.unitCost;
        this.pushDoc('products', product.id, product);
      }
    });
    this.data.purchases[index] = updatedPurchase;
    this.pushDoc('purchases', updatedPurchase.id, updatedPurchase);
    this.notify();
  }

  createInvoice(invoice: Invoice) {
    invoice.items.forEach(item => {
      if (item.productId) {
        const product = this.data.products.find(p => p.id === item.productId);
        if (product) {
          product.quantity -= item.qty;
          item.costBasisAtSale = product.avgCost;
          this.pushDoc('products', product.id, product);
        }
      } else {
        item.costBasisAtSale = 0;
      }
    });

    if (invoice.customerId && invoice.remainingAmount > 0) {
      const customer = this.data.customers.find(c => c.id === invoice.customerId);
      if (customer) {
        customer.balance -= invoice.remainingAmount;
        this.pushDoc('customers', customer.id, customer);
      }
      if (invoice.dueDate) {
        const rem: Reminder = {
          id: 'rem-' + Date.now(),
          customerId: invoice.customerId,
          customerName: customer?.name || 'نامشخص',
          dueDate: invoice.dueDate,
          message: `سررسید بدهی فاکتور ${invoice.invoiceNumber}`,
          status: ReminderStatus.PENDING
        };
        this.data.reminders.push(rem);
        this.pushDoc('reminders', rem.id, rem);
      }
    }

    this.data.invoices.push(invoice);
    this.pushDoc('invoices', invoice.id, invoice);
    this.notify();
  }

  updateInvoice(id: string, updatedInvoice: Invoice) {
    const index = this.data.invoices.findIndex(inv => inv.id === id);
    if (index === -1) throw new Error("فاکتور یافت نشد");
    const oldInvoice = this.data.invoices[index];
    
    oldInvoice.items.forEach(oldItem => {
      if (oldItem.productId) {
        const product = this.data.products.find(p => p.id === oldItem.productId);
        if (product) product.quantity += oldItem.qty;
      }
    });

    if (oldInvoice.customerId && oldInvoice.remainingAmount > 0) {
      const customer = this.data.customers.find(c => c.id === oldInvoice.customerId);
      if (customer) customer.balance += oldInvoice.remainingAmount;
    }

    updatedInvoice.items.forEach(newItem => {
      if (newItem.productId) {
        const product = this.data.products.find(p => p.id === newItem.productId);
        if (product) {
          product.quantity -= newItem.qty;
          newItem.costBasisAtSale = product.avgCost;
          this.pushDoc('products', product.id, product);
        }
      } else {
        newItem.costBasisAtSale = 0;
      }
    });

    if (updatedInvoice.customerId && updatedInvoice.remainingAmount > 0) {
      const customer = this.data.customers.find(c => c.id === updatedInvoice.customerId);
      if (customer) {
        customer.balance -= updatedInvoice.remainingAmount;
        this.pushDoc('customers', customer.id, customer);
      }
    }

    this.data.invoices[index] = updatedInvoice;
    this.pushDoc('invoices', updatedInvoice.id, updatedInvoice);
    this.notify();
  }

  addPayment(payment: Payment) {
    const customer = this.data.customers.find(c => c.id === payment.customerId);
    if (customer) {
      customer.balance += payment.amount;
      this.pushDoc('customers', customer.id, customer);
    }
    this.data.payments.push(payment);
    this.pushDoc('payments', payment.id, payment);
    this.notify();
  }

  addCustomer(customer: Customer) {
    this.data.customers.push(customer);
    this.pushDoc('customers', customer.id, customer);
    this.notify();
  }

  updateCustomer(id: string, updates: Partial<Customer>) {
    const index = this.data.customers.findIndex(c => c.id === id);
    if (index !== -1) {
      this.data.customers[index] = { ...this.data.customers[index], ...updates };
      this.pushDoc('customers', id, this.data.customers[index]);
      this.notify();
    }
  }

  addTodo(text: string) {
    const todo: Todo = { id: 'todo-' + Date.now(), text, completed: false, createdAt: new Date().toISOString() };
    this.data.todos.push(todo);
    this.pushDoc('todos', todo.id, todo);
    this.notify();
    return todo;
  }

  toggleTodo(id: string) {
    const todo = this.data.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.pushDoc('todos', id, todo);
      this.notify();
    }
  }

  deleteTodo(id: string) {
    this.data.todos = this.data.todos.filter(t => t.id !== id);
    this.deleteDocCloud('todos', id);
    this.notify();
  }
}

export const db = new Database();
