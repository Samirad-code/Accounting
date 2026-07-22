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

  // Index Maps for High-Performance O(1) Lookups & Queries
  private productMap: Map<string, Product> = new Map();
  private productNameMap: Map<string, Product> = new Map();
  private productCodeMap: Map<string, Product> = new Map();
  private productCategoryIndex: Map<string, Product[]> = new Map();

  private customerMap: Map<string, Customer> = new Map();
  private customerPhoneMap: Map<string, Customer> = new Map();

  private invoiceMap: Map<string, Invoice> = new Map();
  private invoiceNumberMap: Map<string, Invoice> = new Map();
  private invoiceCustomerIndex: Map<string, Invoice[]> = new Map();

  private categoryMap: Map<string, Category> = new Map();
  private categoryNameMap: Map<string, Category> = new Map();

  constructor() {
    this.loadLocal();
    this.rebuildIndexes();
  }

  subscribe(callback: SubscriptionCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private rebuildIndexes() {
    // Clear all index structures
    this.productMap.clear();
    this.productNameMap.clear();
    this.productCodeMap.clear();
    this.productCategoryIndex.clear();

    this.customerMap.clear();
    this.customerPhoneMap.clear();

    this.invoiceMap.clear();
    this.invoiceNumberMap.clear();
    this.invoiceCustomerIndex.clear();

    this.categoryMap.clear();
    this.categoryNameMap.clear();

    // Index Products
    for (let i = 0; i < this.data.products.length; i++) {
      const p = this.data.products[i];
      this.productMap.set(p.id, p);
      if (p.name) this.productNameMap.set(p.name.trim().toLowerCase(), p);
      if (p.internalCode) this.productCodeMap.set(p.internalCode.trim().toLowerCase(), p);

      const cat = p.category || 'ثبت نشده';
      if (!this.productCategoryIndex.has(cat)) {
        this.productCategoryIndex.set(cat, []);
      }
      this.productCategoryIndex.get(cat)!.push(p);
    }

    // Index Customers
    for (let i = 0; i < this.data.customers.length; i++) {
      const c = this.data.customers[i];
      this.customerMap.set(c.id, c);
      if (c.phone) this.customerPhoneMap.set(c.phone.trim(), c);
    }

    // Index Invoices
    for (let i = 0; i < this.data.invoices.length; i++) {
      const inv = this.data.invoices[i];
      this.invoiceMap.set(inv.id, inv);
      if (inv.invoiceNumber) {
        this.invoiceNumberMap.set(inv.invoiceNumber.trim().toLowerCase(), inv);
      }
      if (inv.customerId) {
        if (!this.invoiceCustomerIndex.has(inv.customerId)) {
          this.invoiceCustomerIndex.set(inv.customerId, []);
        }
        this.invoiceCustomerIndex.get(inv.customerId)!.push(inv);
      }
    }

    // Index Categories
    for (let i = 0; i < this.data.categories.length; i++) {
      const cat = this.data.categories[i];
      this.categoryMap.set(cat.id, cat);
      if (cat.name) this.categoryNameMap.set(cat.name.trim().toLowerCase(), cat);
    }
  }

  private notify(isMutation: boolean = true) {
    this.rebuildIndexes();
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
      const saved = localStorage.getItem('plasticban_cloud_cache') || 
                    localStorage.getItem('plasticban_db_v2') || 
                    localStorage.getItem('plasticban_db');
      if (saved) {
        const parsed = JSON.parse(saved);
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
    try {
      this.seedData();
      let configStr = null;
      try {
        configStr = localStorage.getItem('firebase_config');
      } catch (storageErr) {
        console.warn("Storage access warning:", storageErr);
      }

      if (configStr) {
        try {
          this.connectFirebase(JSON.parse(configStr));
        } catch (fbErr) {
          console.error("Failed to parse firebase_config:", fbErr);
          this.notify(false);
        }
      } else {
        this.notify(false);
      }
    } catch (err) {
      console.error("Database initialization error:", err);
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

  // --- Collection Getters ---
  getProducts() { return this.data.products; }
  getPurchases() { return this.data.purchases; }
  getCustomers() { return this.data.customers; }
  getInvoices() { return this.data.invoices; }
  getPayments() { return this.data.payments; }
  getReminders() { return this.data.reminders; }
  getTodos() { return this.data.todos; }
  getCategories() { return this.data.categories; }

  // --- Fast Indexed O(1) Lookups ---
  getProductById(id: string): Product | undefined {
    return this.productMap.get(id);
  }

  getProductByName(name: string): Product | undefined {
    return this.productNameMap.get(name.trim().toLowerCase());
  }

  getProductByCode(code: string): Product | undefined {
    return this.productCodeMap.get(code.trim().toLowerCase());
  }

  getProductsByCategory(category: string): Product[] {
    if (category === 'ALL') return this.data.products;
    return this.productCategoryIndex.get(category) || [];
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customerMap.get(id);
  }

  getCustomerByPhone(phone: string): Customer | undefined {
    return this.customerPhoneMap.get(phone.trim());
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoiceMap.get(id);
  }

  getInvoiceByNumber(invoiceNumber: string): Invoice | undefined {
    return this.invoiceNumberMap.get(invoiceNumber.trim().toLowerCase());
  }

  getInvoicesByCustomer(customerId: string): Invoice[] {
    if (customerId === 'ALL') return this.data.invoices;
    return this.invoiceCustomerIndex.get(customerId) || [];
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoryMap.get(id);
  }

  getCategoryByName(name: string): Category | undefined {
    return this.categoryNameMap.get(name.trim().toLowerCase());
  }

  // --- High-Performance Indexed Query Engine ---
  queryInvoices(params: {
    searchTerm?: string;
    type?: InvoiceType | 'ALL';
    customerId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    paymentStatus?: 'ALL' | 'PAID' | 'DEBT';
    category?: string;
    sortBy?: 'date' | 'totalAmount' | 'customerName';
    sortOrder?: 'asc' | 'desc';
  }): Invoice[] {
    let source = this.data.invoices;

    // Index acceleration: filter by Customer Index if provided
    if (params.customerId && params.customerId !== 'ALL') {
      source = this.invoiceCustomerIndex.get(params.customerId) || [];
    }

    // Index acceleration: if searching exact invoice number
    if (params.searchTerm) {
      const trimmedTerm = params.searchTerm.trim().toLowerCase();
      const exactInvoice = this.invoiceNumberMap.get(trimmedTerm);
      if (exactInvoice && (!params.customerId || params.customerId === 'ALL' || exactInvoice.customerId === params.customerId)) {
        source = [exactInvoice];
      }
    }

    const startMs = params.startDate ? new Date(params.startDate).setHours(0, 0, 0, 0) : null;
    const endMs = params.endDate ? new Date(params.endDate).setHours(23, 59, 59, 999) : null;

    const filtered = source.filter(inv => {
      if (params.type && params.type !== 'ALL' && inv.type !== params.type) return false;
      if (params.customerId && params.customerId !== 'ALL' && inv.customerId !== params.customerId) return false;

      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(term);
        const matchCust = (inv.customerName || 'مشتری گذری').toLowerCase().includes(term);
        if (!matchNum && !matchCust) return false;
      }

      if (startMs !== null || endMs !== null) {
        const invTime = new Date(inv.date).getTime();
        if (startMs !== null && invTime < startMs) return false;
        if (endMs !== null && invTime > endMs) return false;
      }

      if (params.minAmount !== undefined && inv.totalAmount < params.minAmount) return false;
      if (params.maxAmount !== undefined && inv.totalAmount > params.maxAmount) return false;

      if (params.paymentStatus === 'PAID' && inv.remainingAmount > 0) return false;
      if (params.paymentStatus === 'DEBT' && inv.remainingAmount <= 0) return false;

      if (params.category && params.category !== 'ALL') {
        const matchCat = inv.items.some(item => {
          const prod = item.productId ? this.productMap.get(item.productId) : null;
          return prod?.category === params.category;
        });
        if (!matchCat) return false;
      }

      return true;
    });

    const sortBy = params.sortBy || 'date';
    const sortOrder = params.sortOrder || 'desc';

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'totalAmount') {
        cmp = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'customerName') {
        const nameA = a.customerName || 'مشتری گذری';
        const nameB = b.customerName || 'مشتری گذری';
        cmp = nameA.localeCompare(nameB, 'fa');
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  queryProducts(params: {
    searchTerm?: string;
    category?: string;
    stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    minPrice?: number;
    maxPrice?: number;
    minQty?: number;
    maxQty?: number;
    sortBy?: string;
  }): Product[] {
    let source = this.data.products;

    if (params.category && params.category !== 'ALL') {
      source = this.productCategoryIndex.get(params.category) || [];
    }

    const filtered = source.filter(p => {
      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchId = p.id.toLowerCase().includes(term);
        const matchCode = p.internalCode ? p.internalCode.toLowerCase().includes(term) : false;
        if (!matchName && !matchId && !matchCode) return false;
      }

      if (params.stockStatus === 'IN_STOCK' && p.quantity <= 0) return false;
      if (params.stockStatus === 'LOW_STOCK' && p.quantity > p.lowStockThreshold) return false;
      if (params.stockStatus === 'OUT_OF_STOCK' && p.quantity !== 0) return false;

      if (params.minQty !== undefined && p.quantity < params.minQty) return false;
      if (params.maxQty !== undefined && p.quantity > params.maxQty) return false;

      if (params.minPrice !== undefined && p.retailPrice < params.minPrice) return false;
      if (params.maxPrice !== undefined && p.retailPrice > params.maxPrice) return false;

      return true;
    });

    if (params.sortBy) {
      filtered.sort((a, b) => {
        switch (params.sortBy) {
          case 'name_asc': return a.name.localeCompare(b.name, 'fa');
          case 'name_desc': return b.name.localeCompare(a.name, 'fa');
          case 'category_asc': return a.category.localeCompare(b.category, 'fa');
          case 'qty_desc': return b.quantity - a.quantity;
          case 'qty_asc': return a.quantity - b.quantity;
          default: return 0;
        }
      });
    }

    return filtered;
  }

  // --- Category Operations ---
  addCategory(name: string, retailMargin?: number, wholesaleMargin?: number) {
    const category: Category = { 
      id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 10000), 
      name,
      retailMargin,
      wholesaleMargin
    };
    this.data.categories.push(category);
    this.pushDoc('categories', category.id, category);
    this.notify();
    return category;
  }

  updateCategory(id: string, updates: Partial<Category>) {
    const category = this.categoryMap.get(id) || this.data.categories.find(c => c.id === id);
    if (category) {
      const oldName = category.name;
      Object.assign(category, updates);
      this.pushDoc('categories', id, category);
      
      if (updates.name && updates.name !== oldName) {
        this.data.products.forEach(p => {
          if (p.category === oldName) {
            p.category = updates.name!;
            this.pushDoc('products', p.id, p);
          }
        });
      }
      this.notify();
    }
  }

  applyCategoryMargins(categoryId: string) {
    const category = this.categoryMap.get(categoryId) || this.data.categories.find(c => c.id === categoryId);
    if (!category || (category.retailMargin === undefined && category.wholesaleMargin === undefined)) return;

    this.data.products.forEach(p => {
      if (p.category === category.name) {
        if (category.retailMargin !== undefined) {
          p.retailPrice = Math.round(p.avgCost * (1 + category.retailMargin / 100));
        }
        if (category.wholesaleMargin !== undefined) {
          p.wholesalePrice = Math.round(p.avgCost * (1 + category.wholesaleMargin / 100));
        }
        this.pushDoc('products', p.id, p);
      }
    });
    this.notify();
  }

  deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.deleteDocCloud('categories', id);
    this.notify();
  }

  // --- Product Operations ---
  addProduct(product: Product) {
    this.data.products.push(product);
    this.pushDoc('products', product.id, product);
    this.notify();
  }

  addProducts(products: Product[]) {
    products.forEach((product) => {
      const existing = this.productMap.get(product.id);
      if (existing) {
        Object.assign(existing, product);
      } else {
        this.data.products.push(product);
      }
      this.pushDoc('products', product.id, product);
    });
    this.notify();
  }

  updateProduct(id: string, updates: Partial<Product>) {
    const product = this.productMap.get(id) || this.data.products.find(p => p.id === id);
    if (product) {
      Object.assign(product, updates);
      this.pushDoc('products', id, product);
      this.notify();
    }
  }

  deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.deleteDocCloud('products', id);
    this.notify();
  }

  bulkUpdateProducts(ids: string[], updates: { retailPercent?: number, wholesalePercent?: number, costPercent?: number, quantity?: number, category?: string }) {
    const targetSet = new Set(ids);
    this.data.products.forEach(p => {
      if (targetSet.has(p.id)) {
        if (updates.retailPercent !== undefined) p.retailPrice = Math.round(p.retailPrice * (1 + updates.retailPercent / 100));
        if (updates.wholesalePercent !== undefined) p.wholesalePrice = Math.round(p.wholesalePrice * (1 + updates.wholesalePercent / 100));
        if (updates.costPercent !== undefined) p.avgCost = Math.round(p.avgCost * (1 + updates.costPercent / 100));
        if (updates.quantity !== undefined) p.quantity = updates.quantity;
        if (updates.category !== undefined) p.category = updates.category;
        this.pushDoc('products', p.id, p);
      }
    });
    this.notify();
  }

  // --- Purchase Operations ---
  addPurchase(purchase: Purchase) {
    this.data.purchases.push(purchase);
    this.pushDoc('purchases', purchase.id, purchase);
    purchase.items.forEach(item => {
      const product = this.productMap.get(item.productId);
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
      const product = this.productMap.get(oldItem.productId);
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
      const product = this.productMap.get(newItem.productId);
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

  // --- Invoice Operations ---
  createInvoice(invoice: Invoice) {
    if (!this.categoryNameMap.has('ثبت نشده')) {
      this.addCategory('ثبت نشده', 30, 15);
    }

    invoice.items.forEach(item => {
      if (!item.productId && item.productName) {
        let product = this.getProductByName(item.productName);
        if (!product) {
          product = {
            id: 'p-man-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            name: item.productName,
            category: 'ثبت نشده',
            quantity: 0,
            avgCost: item.costBasisAtSale || 0,
            retailPrice: item.unitPrice,
            wholesalePrice: Math.round((item.costBasisAtSale || 0) * 1.15) || item.unitPrice,
            lowStockThreshold: 5,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          this.data.products.push(product);
          this.pushDoc('products', product.id, product);
        }
        item.productId = product.id;
      }

      if (item.productId) {
        const product = this.productMap.get(item.productId);
        if (product) {
          product.quantity -= item.qty;
          if (!item.costBasisAtSale) {
            item.costBasisAtSale = product.avgCost;
          }
          this.pushDoc('products', product.id, product);
        }
      }
    });

    if (invoice.customerId && invoice.remainingAmount > 0) {
      const customer = this.customerMap.get(invoice.customerId);
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
          invoiceId: invoice.id,
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
    
    if (!this.categoryNameMap.has('ثبت نشده')) {
      this.addCategory('ثبت نشده', 30, 15);
    }

    oldInvoice.items.forEach(oldItem => {
      if (oldItem.productId) {
        const product = this.productMap.get(oldItem.productId);
        if (product) product.quantity += oldItem.qty;
      }
    });

    if (oldInvoice.customerId && oldInvoice.remainingAmount > 0) {
      const customer = this.customerMap.get(oldInvoice.customerId);
      if (customer) customer.balance += oldInvoice.remainingAmount;
    }

    updatedInvoice.items.forEach(newItem => {
      if (!newItem.productId && newItem.productName) {
        let product = this.getProductByName(newItem.productName);
        if (!product) {
          product = {
            id: 'p-man-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            name: newItem.productName,
            category: 'ثبت نشده',
            quantity: 0,
            avgCost: newItem.costBasisAtSale || 0,
            retailPrice: newItem.unitPrice,
            wholesalePrice: Math.round((newItem.costBasisAtSale || 0) * 1.15) || newItem.unitPrice,
            lowStockThreshold: 5,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          this.data.products.push(product);
          this.pushDoc('products', product.id, product);
        }
        newItem.productId = product.id;
      }

      if (newItem.productId) {
        const product = this.productMap.get(newItem.productId);
        if (product) {
          product.quantity -= newItem.qty;
          if (!newItem.costBasisAtSale) {
            newItem.costBasisAtSale = product.avgCost;
          }
          this.pushDoc('products', product.id, product);
        }
      }
    });

    if (updatedInvoice.customerId && updatedInvoice.remainingAmount > 0) {
      const customer = this.customerMap.get(updatedInvoice.customerId);
      if (customer) {
        customer.balance -= updatedInvoice.remainingAmount;
        this.pushDoc('customers', customer.id, customer);
      }
    }

    this.data.invoices[index] = updatedInvoice;
    this.pushDoc('invoices', updatedInvoice.id, updatedInvoice);
    this.notify();
  }

  deleteInvoice(id: string) {
    const index = this.data.invoices.findIndex(inv => inv.id === id);
    if (index === -1) return;
    const inv = this.data.invoices[index];

    // 1. Restore product quantities
    inv.items.forEach(item => {
      if (item.productId) {
        const product = this.productMap.get(item.productId);
        if (product) {
          product.quantity += item.qty;
          this.pushDoc('products', product.id, product);
        }
      }
    });

    // 2. Adjust customer balance
    if (inv.customerId && inv.remainingAmount > 0) {
      const customer = this.customerMap.get(inv.customerId);
      if (customer) {
        customer.balance += inv.remainingAmount;
        this.pushDoc('customers', customer.id, customer);
      }
    }

    // 3. Remove associated reminders
    const relatedReminders = this.data.reminders.filter(r => r.invoiceId === id);
    relatedReminders.forEach(r => this.deleteDocCloud('reminders', r.id));
    this.data.reminders = this.data.reminders.filter(r => r.invoiceId !== id);

    // 4. Delete invoice record
    this.data.invoices.splice(index, 1);
    this.deleteDocCloud('invoices', id);
    this.notify();
  }

  // --- Customer & Payment Operations ---
  addPayment(payment: Payment) {
    const customer = this.customerMap.get(payment.customerId);
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
    const customer = this.customerMap.get(id) || this.data.customers.find(c => c.id === id);
    if (customer) {
      Object.assign(customer, updates);
      this.pushDoc('customers', id, customer);
      this.notify();
    }
  }

  // --- Todos Operations ---
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

  // --- Reminder Operations ---
  addReminder(reminder: Reminder) {
    this.data.reminders.push(reminder);
    this.pushDoc('reminders', reminder.id, reminder);
    this.notify();
  }

  updateReminderStatus(id: string, status: ReminderStatus) {
    const reminder = this.data.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.status = status;
      this.pushDoc('reminders', id, reminder);
      this.notify();
    }
  }

  deleteReminder(id: string) {
    this.data.reminders = this.data.reminders.filter(r => r.id !== id);
    this.deleteDocCloud('reminders', id);
    this.notify();
  }

  seedData() {
    if (this.data.products.length > 0) return;

    const cats: Category[] = [
      { id: 'cat-1', name: 'نایلون و نایلکس', retailMargin: 50, wholesaleMargin: 20 },
      { id: 'cat-2', name: 'ظروف یکبار مصرف', retailMargin: 40, wholesaleMargin: 15 },
      { id: 'cat-3', name: 'شوینده و بهداشتی', retailMargin: 30, wholesaleMargin: 10 }
    ];
    this.data.categories = cats;

    const prods: Product[] = [
      { id: 'p1', name: 'نایلون دسته‌دار سایز ۴۰', category: 'نایلون و نایلکس', retailPrice: 75000, wholesalePrice: 60000, avgCost: 50000, quantity: 100, lowStockThreshold: 20, isActive: true, createdAt: new Date().toISOString() },
      { id: 'p2', name: 'لیوان یکبار مصرف ۵۰۰ عددی', category: 'ظروف یکبار مصرف', retailPrice: 140000, wholesalePrice: 115000, avgCost: 100000, quantity: 50, lowStockThreshold: 10, isActive: true, createdAt: new Date().toISOString() },
      { id: 'p3', name: 'مایع ظرفشویی ۴ لیتری', category: 'شوینده و بهداشتی', retailPrice: 130000, wholesalePrice: 110000, avgCost: 100000, quantity: 5, lowStockThreshold: 10, isActive: true, createdAt: new Date().toISOString() }
    ];
    this.data.products = prods;

    const custs: Customer[] = [
      { id: 'c1', name: 'فروشگاه مرکزی', phone: '۰۹۱۲۳۴۵۶۷۸۹', balance: -500000 },
      { id: 'c2', name: 'رستوران البرز', phone: '۰۹۸۷۶۵۴۳۲۱۰', balance: 0 }
    ];
    this.data.customers = custs;

    const todos: Todo[] = [
      { id: 't1', text: 'بررسی موجودی انبار نایلون', completed: false, createdAt: new Date().toISOString() },
      { id: 't2', text: 'تماس با تامین‌کننده ظروف', completed: true, createdAt: new Date().toISOString() }
    ];
    this.data.todos = todos;

    this.saveLocal();
    this.rebuildIndexes();
  }
}

export const db = new Database();
