
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Invoice, InvoiceItem, InvoiceType, Product, Customer, PaymentMethod } from '../types';
import { formatCurrency, formatJalali, exportToPDF } from '../utils';
import JalaliDatePicker from '../components/JalaliDatePicker';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import SearchableProductSelect from '../components/SearchableProductSelect';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(db.getInvoices());
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'ALL'>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const products = db.getProducts();
  const customers = db.getCustomers();

  const [newInv, setNewInv] = useState<{
    date: string;
    type: InvoiceType;
    customerId: string;
    items: { productId: string; manualName?: string; qty: number; unitPrice: number }[];
    paidAmount: number;
    discountTotal: number;
    paymentMethod: PaymentMethod;
    dueDate: string;
  }>({
    date: new Date().toISOString(),
    type: InvoiceType.RETAIL,
    customerId: '',
    items: [{ productId: '', qty: 1, unitPrice: 0 }],
    paidAmount: 0,
    discountTotal: 0,
    paymentMethod: PaymentMethod.CASH,
    dueDate: ''
  });

  const subTotal = useMemo(() => {
    return newInv.items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  }, [newInv.items]);

  const finalTotal = subTotal - newInv.discountTotal;
  const remaining = finalTotal - newInv.paidAmount;

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (inv.customerName || 'مشتری گذری').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || inv.type === typeFilter;
      const matchCustomer = customerFilter === 'ALL' || inv.customerId === customerFilter;
      
      const invDate = new Date(inv.date);
      
      let matchStart = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStart = invDate >= start;
      }

      let matchEnd = true;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchEnd = invDate <= end;
      }

      return matchSearch && matchType && matchCustomer && matchStart && matchEnd;
    });
  }, [invoices, searchTerm, typeFilter, customerFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleOpenAddMode = () => {
    setNewInv({
      date: new Date().toISOString(),
      type: InvoiceType.RETAIL,
      customerId: '',
      items: [{ productId: '', qty: 1, unitPrice: 0 }],
      paidAmount: 0,
      discountTotal: 0,
      paymentMethod: PaymentMethod.CASH,
      dueDate: ''
    });
    setEditingInvoiceId(null);
    setIsAddMode(true);
  };

  const handleAddItem = () => {
    setNewInv({ ...newInv, items: [...newInv.items, { productId: '', qty: 1, unitPrice: 0 }] });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...newInv.items];
    const item = updatedItems[index];

    if (field === 'productId') {
      if (value.startsWith('MANUAL:')) {
        item.productId = '';
        item.manualName = value.replace('MANUAL:', '');
      } else {
        const prod = products.find(p => p.id === value);
        item.productId = value;
        item.manualName = undefined;
        item.unitPrice = newInv.type === InvoiceType.RETAIL ? (prod?.retailPrice || 0) : (prod?.wholesalePrice || 0);
      }
    } else {
      (item as any)[field] = value;
    }

    setNewInv({ ...newInv, items: updatedItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInv.items.some(i => !i.productId && !i.manualName)) {
        alert('لطفا کالاها را مشخص کنید');
        return;
    }

    try {
      const invoiceItems: InvoiceItem[] = newInv.items.map(item => {
        if (item.productId) {
          const prod = products.find(p => p.id === item.productId)!;
          return {
            productId: item.productId,
            productName: prod.name,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: 0,
            costBasisAtSale: prod.avgCost 
          };
        } else {
          // Manual Item
          return {
            productName: item.manualName || 'کالای دستی',
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: 0,
            costBasisAtSale: 0
          };
        }
      });

      const invoice: Invoice = {
        id: editingInvoiceId || Date.now().toString(),
        invoiceNumber: editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)!.invoiceNumber : `INV-${Date.now().toString().slice(-6)}`,
        date: newInv.date,
        type: newInv.type,
        customerId: newInv.customerId || undefined,
        customerName: customers.find(c => c.id === newInv.customerId)?.name,
        items: invoiceItems,
        totalAmount: finalTotal,
        discountTotal: newInv.discountTotal,
        paidAmount: newInv.paidAmount,
        remainingAmount: remaining,
        dueDate: newInv.dueDate || undefined,
        status: 'ACTIVE'
      };

      if (editingInvoiceId) db.updateInvoice(editingInvoiceId, invoice);
      else db.createInvoice(invoice);
      
      setInvoices(db.getInvoices());
      setIsAddMode(false);
      setEditingInvoiceId(null);
    } catch (err: any) { alert(err.message); }
  };

  if (isAddMode) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
            {editingInvoiceId ? 'ویرایش فاکتور' : 'صدور فاکتور جدید'}
          </h3>
          <button onClick={() => { setIsAddMode(false); setEditingInvoiceId(null); }} className="text-red-500 font-bold">لغو</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-2xl border dark:border-blue-900/30">
            <JalaliDatePicker label="تاریخ" value={newInv.date} onChange={val => setNewInv({ ...newInv, date: val })} />
            <div>
              <label className="block text-xs font-bold mb-1">نوع</label>
              <select className="w-full p-2.5 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={newInv.type} onChange={e => setNewInv({ ...newInv, type: e.target.value as InvoiceType })}>
                <option value={InvoiceType.RETAIL}>خرده‌فروشی</option>
                <option value={InvoiceType.WHOLESALE}>عمده‌فروشی</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">مشتری</label>
              <select className="w-full p-2.5 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={newInv.customerId} onChange={e => setNewInv({ ...newInv, customerId: e.target.value })}>
                <option value="">مشتری گذری</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">روش تسویه</label>
              <select 
                className="w-full p-2.5 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" 
                value={newInv.paymentMethod} 
                onChange={e => {
                  const method = e.target.value as PaymentMethod;
                  const updates: any = { paymentMethod: method };
                  if (method === PaymentMethod.CARD) {
                    updates.paidAmount = finalTotal;
                  }
                  setNewInv({ ...newInv, ...updates });
                }}
              >
                <option value={PaymentMethod.CASH}>نقدی</option>
                <option value={PaymentMethod.CARD}>کارت</option>
                <option value={PaymentMethod.DEBT}>نسیه</option>
                <option value={PaymentMethod.MIXED}>ترکیبی</option>
              </select>
            </div>
          </div>

          <div className="border dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 overflow-visible">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-right">
                <thead className="bg-slate-800 text-white text-xs">
                  <tr>
                    <th className="p-3">انتخاب کالا / ثبت دستی</th>
                    <th className="p-3 w-24 text-center">تعداد</th>
                    <th className="p-3 text-center">قیمت واحد</th>
                    <th className="p-3 text-center">جمع</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {newInv.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3">
                        <SearchableProductSelect 
                          value={item.productId || `MANUAL:${item.manualName || ''}`}
                          onChange={val => handleItemChange(idx, 'productId', val)}
                          products={products}
                        />
                        {item.manualName !== undefined && <div className="text-[10px] text-orange-500 mt-1 font-bold">⚠️ کالای دستی (خارج از انبار)</div>}
                      </td>
                      <td className="p-3">
                        <input type="number" min="1" className="w-full p-2 border dark:border-slate-700 rounded-lg text-center bg-white dark:bg-slate-800 dark:text-white outline-none" value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-3">
                        <input type="number" className="w-full p-2 border dark:border-slate-700 rounded-lg text-center font-mono bg-white dark:bg-slate-800 dark:text-white outline-none" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-3 text-center font-bold text-xs">{formatCurrency(item.qty * item.unitPrice)}</td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => setNewInv({...newInv, items: newInv.items.filter((_, i) => i !== idx)})} className="text-red-500 font-bold">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 rounded-b-2xl">
              <button type="button" onClick={handleAddItem} className="text-blue-600 font-bold text-xs flex items-center gap-1">➕ افزودن ردیف</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>جمع کالاها:</span>
                <span>{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-xs font-bold w-20">تخفیف:</label>
                <input type="number" className="flex-1 p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={newInv.discountTotal} onChange={e => setNewInv({ ...newInv, discountTotal: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-xs font-bold w-20">دریافتی:</label>
                <input type="number" className="flex-1 p-2 border border-green-200 rounded-xl bg-green-50 dark:bg-green-900/10 dark:text-white outline-none" value={newInv.paidAmount} onChange={e => setNewInv({ ...newInv, paidAmount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-xl font-black">
                <span>نهایی:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>باقیمانده:</span>
                <span className={remaining > 0 ? 'text-orange-400 font-bold' : 'text-green-400 font-bold'}>{formatCurrency(remaining)}</span>
              </div>
              <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg active:scale-95 transition-all">ثبت و تایید فاکتور</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    try {
      db.deleteInvoice(id);
      setInvoices(db.getInvoices());
      setViewingInvoice(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    
    setNewInv({
      date: inv.date,
      type: inv.type,
      customerId: inv.customerId || '',
      items: inv.items.map(i => ({
        productId: i.productId || '',
        manualName: i.productId ? undefined : i.productName,
        qty: i.qty,
        unitPrice: i.unitPrice
      })),
      paidAmount: inv.paidAmount,
      discountTotal: inv.discountTotal,
      paymentMethod: PaymentMethod.CASH,
      dueDate: inv.dueDate || ''
    });
    setEditingInvoiceId(id);
    setIsAddMode(true);
    setViewingInvoice(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          🧾 فاکتورهای فروش
        </h3>
        <button onClick={handleOpenAddMode} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-sm flex items-center gap-2">
          ➕ صدور فاکتور جدید
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">جستجو</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="شماره فاکتور یا نام مشتری..." 
                className="w-full p-2.5 pr-10 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">نوع فاکتور</label>
            <select 
              className="w-full p-2.5 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none text-sm"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
            >
              <option value="ALL">همه موارد</option>
              <option value={InvoiceType.RETAIL}>خرده‌فروشی</option>
              <option value={InvoiceType.WHOLESALE}>عمده‌فروشی</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">مشتری</label>
            <select 
              className="w-full p-2.5 border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white outline-none text-sm"
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
            >
              <option value="ALL">همه مشتریان</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={clearFilters}
              className="w-full p-2.5 text-slate-500 hover:text-red-500 font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              🔄 پاکسازی فیلترها
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t dark:border-slate-800">
          <JalaliDatePicker label="از تاریخ" value={startDate} onChange={setStartDate} />
          <JalaliDatePicker label="تا تاریخ" value={endDate} onChange={setEndDate} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-4 font-bold">شماره فاکتور</th>
                <th className="p-4 font-bold">تاریخ</th>
                <th className="p-4 font-bold">مشتری</th>
                <th className="p-4 font-bold">نوع</th>
                <th className="p-4 font-bold">مبلغ کل</th>
                <th className="p-4 font-bold">وضعیت</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    هیچ فاکتوری یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">{inv.invoiceNumber}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{formatJalali(inv.date)}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{inv.customerName || 'مشتری گذری'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${inv.type === InvoiceType.RETAIL ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                        {inv.type === InvoiceType.RETAIL ? 'خرده‌فروشی' : 'عمده‌فروشی'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(inv.totalAmount)}</td>
                    <td className="p-4">
                      {inv.remainingAmount === 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-bold text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">تسویه شده</span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">بدهکار: {formatCurrency(inv.remainingAmount)}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setViewingInvoice(inv)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        مشاهده / چاپ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingInvoice && (
        <InvoiceDetailModal 
          invoice={viewingInvoice} 
          onClose={() => setViewingInvoice(null)} 
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
};

export default Invoices;
