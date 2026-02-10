CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    internalCode TEXT,
    barcode TEXT,
    retailPrice REAL,
    wholesalePrice REAL,
    avgCost REAL,
    quantity INTEGER,
    lowStockThreshold INTEGER,
    isActive INTEGER,
    createdAt TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    note TEXT,
    balance REAL
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    date TEXT,
    supplierName TEXT,
    extraCost REAL,
    totalAmount REAL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchaseId TEXT,
    productId TEXT,
    productName TEXT,
    qty INTEGER,
    unitCost REAL,
    FOREIGN KEY(purchaseId) REFERENCES purchases(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT,
    date TEXT,
    type TEXT,
    customerId TEXT,
    customerName TEXT,
    totalAmount REAL,
    discountTotal REAL,
    paidAmount REAL,
    remainingAmount REAL,
    dueDate TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoiceId TEXT,
    productId TEXT,
    productName TEXT,
    qty INTEGER,
    unitPrice REAL,
    discount REAL,
    costBasisAtSale REAL,
    FOREIGN KEY(invoiceId) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    date TEXT,
    amount REAL,
    method TEXT,
    note TEXT,
    relatedInvoiceId TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    customerName TEXT,
    invoiceId TEXT,
    dueDate TEXT,
    message TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT,
    completed INTEGER,
    createdAt TEXT
);
