
import { Product, Purchase, Customer, Invoice, Payment, Reminder, Todo, Category, InvoiceType, ReminderStatus } from './types';

const STORAGE_KEY = 'plastic_ban_db_v1';

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

const INITIAL_CATEGORIES = [
  "سطل زباله پدالی", "جعبه صنعتی", "صندوق چرخدار", "نظم دهنده و فایل کشو کریستالی",
  "زمین شوی", "یدک محصولات", "دسته های زمین شوی", "جاروب و برس ها",
  "سطل و توالت شوی ها", "آب جمع کن", "شیشه شوی", "دستمال ها و گردگیر ها",
  "نظافت صنعتی", "سطل پلاستیکی درب دار", "پارچ", "سبد و جانانی",
  "صندلی و چهارپایه", "تخته کار و تخته گوشت", "سبد پلاستیکی لبنیات",
  "مخزن آب پلی اتیلن", "وان پلاستیکی صنعتی", "ادویه پاش پلاستیکی",
  "پالت ابزار پلاستیکی", "پالت ابزار پلاستیکی پایه دار", "پالت ابزار پلاستیکی کشویی",
  "سبد پلاستیکی", "پادری اسفنجی", "دستمال ناژه", "جارو و خاک انداز"
].map((name, index) => ({ id: `cat-${index}`, name }));

const INITIAL_DB: DBStructure = {
  products: [
    { id: '1', name: 'سطل زباله ۵۰ لیتری پدالی', category: 'سطل زباله پدالی', retailPrice: 450000, wholesalePrice: 420000, avgCost: 380000, quantity: 15, lowStockThreshold: 5, isActive: true, createdAt: new Date().toISOString() },
    { id: '2', name: 'جعبه ابزار صنعتی بزرگ', category: 'جعبه صنعتی', retailPrice: 890000, wholesalePrice: 850000, avgCost: 750000, quantity: 8, lowStockThreshold: 3, isActive: true, createdAt: new Date().toISOString() },
    { id: '3', name: 'صندوق چرخدار ۱۲۰ لیتری', category: 'صندوق چرخدار', retailPrice: 1200000, wholesalePrice: 1150000, avgCost: 1000000, quantity: 5, lowStockThreshold: 2, isActive: true, createdAt: new Date().toISOString() },
    { id: '4', name: 'نظم دهنده کشو ۳ طبقه', category: 'نظم دهنده و فایل کشو کریستالی', retailPrice: 250000, wholesalePrice: 220000, avgCost: 180000, quantity: 20, lowStockThreshold: 10, isActive: true, createdAt: new Date().toISOString() },
    { id: '5', name: 'زمین شوی چرخشی مدل سبد فلزی', category: 'زمین شوی', retailPrice: 1450000, wholesalePrice: 1400000, avgCost: 1250000, quantity: 4, lowStockThreshold: 2, isActive: true, createdAt: new Date().toISOString() },
    { id: '6', name: 'جارو و خاک انداز لولایی', category: 'جارو و خاک انداز', retailPrice: 185000, wholesalePrice: 165000, avgCost: 140000, quantity: 30, lowStockThreshold: 5, isActive: true, createdAt: new Date().toISOString() }
  ],
  purchases: [],
  customers: [
    { id: 'c1', name: 'محمدی (ابزار فروشی)', phone: '09123456789', balance: -500000 },
    { id: 'c2', name: 'رضایی', phone: '09351112233', balance: 0 },
    { id: 'c3', name: 'فروشگاه ناصر', phone: '09194445566', balance: -1250000 }
  ],
  invoices: [],
  payments: [],
  reminders: [],
  todos: [],
  categories: INITIAL_CATEGORIES
};

class Database {
  private data: DBStructure;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.data = saved ? JSON.parse(saved) : INITIAL_DB;
    // Data migrations
    if (!this.data.todos) this.data.todos = [];
    if (!this.data.categories) this.data.categories = INITIAL_CATEGORIES;
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
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
    const category: Category = { id: 'cat-' + Date.now(), name };
    this.data.categories.push(category);
    this.save();
    return category;
  }

  updateCategory(id: string, name: string) {
    const category = this.data.categories.find(c => c.id === id);
    if (category) {
      const oldName = category.name;
      category.name = name;
      // Update existing products with this category name to the new name
      this.data.products.forEach(p => {
        if (p.category === oldName) p.category = name;
      });
      this.save();
    }
  }

  deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.save();
  }

  addPurchase(purchase: Purchase) {
    this.data.purchases.push(purchase);
    purchase.items.forEach(item => {
      const product = this.data.products.find(p => p.id === item.productId);
      if (product) {
        const oldQty = product.quantity;
        const oldAvg = product.avgCost;
        const totalCost = (oldQty * oldAvg) + (item.qty * item.unitCost);
        product.quantity += item.qty;
        product.avgCost = product.quantity > 0 ? totalCost / product.quantity : item.unitCost;
      }
    });
    this.save();
  }

  createInvoice(invoice: Invoice) {
    for (const item of invoice.items) {
      const product = this.data.products.find(p => p.id === item.productId);
      if (!product || product.quantity < item.qty) throw new Error(`موجودی کالا (${product?.name}) کافی نیست.`);
    }

    invoice.items.forEach(item => {
      const product = this.data.products.find(p => p.id === item.productId)!;
      product.quantity -= item.qty;
      item.costBasisAtSale = product.avgCost;
    });

    if (invoice.customerId && invoice.remainingAmount > 0) {
      const customer = this.data.customers.find(c => c.id === invoice.customerId);
      if (customer) customer.balance -= invoice.remainingAmount;

      if (invoice.dueDate) {
        this.data.reminders.push({
          id: 'rem-' + Date.now(),
          customerId: invoice.customerId,
          customerName: customer?.name || 'نامشخص',
          dueDate: invoice.dueDate,
          message: `سررسید بدهی فاکتور ${invoice.invoiceNumber}`,
          status: ReminderStatus.PENDING
        });
      }
    }

    this.data.invoices.push(invoice);
    this.save();
  }

  addPayment(payment: Payment) {
    const customer = this.data.customers.find(c => c.id === payment.customerId);
    if (customer) customer.balance += payment.amount;
    this.data.payments.push(payment);
    this.save();
  }

  addCustomer(customer: Customer) {
    this.data.customers.push(customer);
    this.save();
  }

  addProduct(product: Product) {
    this.data.products.push(product);
    this.save();
  }

  addTodo(text: string) {
    const todo: Todo = {
      id: 'todo-' + Date.now(),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    this.data.todos.push(todo);
    this.save();
    return todo;
  }

  toggleTodo(id: string) {
    const todo = this.data.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
    }
  }

  deleteTodo(id: string) {
    this.data.todos = this.data.todos.filter(t => t.id !== id);
    this.save();
  }
}

export const db = new Database();
