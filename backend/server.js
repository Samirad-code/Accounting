const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به دیتابیس SQLite (ساخت خودکار فایل در صورت نبودن)
const db = new sqlite3.Database('./shop.sqlite');

// توابع کمکی برای استفاده از Async/Await در SQLite
const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); }));
const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }));

// اجرای فایل schema.sql برای ساخت جداول دیتابیس
const initDb = () => {
    try {
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        db.exec(schema, (err) => {
            if (err) console.error("Error applying schema:", err);
            else console.log("Database schema successfully verified/applied.");
        });
    } catch (e) {
        console.error("Schema file not found or couldn't be read.");
    }
};
initDb();

// Endpoint برای دریافت کل دیتابیس جهت استقرار در حافظه (Initial Sync)
app.get('/api/all', async (req, res) => {
    try {
        const data = {
            categories: await all('SELECT * FROM categories'),
            products: await all('SELECT * FROM products'),
            customers: await all('SELECT * FROM customers'),
            invoices: await all('SELECT * FROM invoices'),
            invoice_items: await all('SELECT * FROM invoice_items'),
            purchases: await all('SELECT * FROM purchases'),
            purchase_items: await all('SELECT * FROM purchase_items'),
            payments: await all('SELECT * FROM payments'),
            reminders: await all('SELECT * FROM reminders'),
            todos: await all('SELECT * FROM todos'),
        };

        // جاسازی آیتم‌های هر فاکتور/خرید در داخل رکورد مربوطه
        data.invoices.forEach(inv => {
            inv.items = data.invoice_items.filter(i => i.invoiceId === inv.id);
        });
        data.purchases.forEach(pur => {
            pur.items = data.purchase_items.filter(i => i.purchaseId === pur.id);
        });

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint اجرای کوئری (صرفا جهت همگام‌سازی ساختار از راه دور)
app.post('/api/sql', async (req, res) => {
    const { sql, params } = req.body;
    try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const rows = await all(sql, params);
            res.json({ rows });
        } else {
            const result = await run(sql, params);
            res.json({ changes: result.changes, lastID: result.lastID });
        }
    } catch (e) {
        console.error(`[SQL Error]: ${sql}`, e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend Database Server is running on http://localhost:${PORT}`));
