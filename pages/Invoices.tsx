
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
  const [sortBy, setSortBy] = useState<'date' | 'totalAmount' | 'customerName'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
    const filtered = invoices.filter(inv => {
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

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'totalAmount') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'customerName') {
        const nameA = a.customerName || 'مشتری گذری';
        const nameB = b.customerName || 'مشتری گذری';
        comparison = nameA.localeCompare(nameB, 'fa');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [invoices, searchTerm, typeFilter, customerFilter, startDate, endDate, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('date');
    setSortOrder('desc');
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
            <div className="overflow-visible min-h-[350px]">
              <table className="w-full text-right overflow-visible">
                <thead className="bg-slate-800 text-white text-xs">
                  <tr>
                    <th className="p-3">انتخاب کالا / ثبت دستی</th>
                    <th className="p-3 w-24 text-center">تعداد</th>
                    <th className="p-3 text-center">قیمت واحد</th>
                    <th className="p-3 text-center">جمع</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800 overflow-visible">
                  {newInv.items.map((item, idx) => (
                    <tr key={idx} className="relative hover:z-50 focus-within:z-50 transition-all">
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

  const renderSortableHeader = (label: string, field: 'date' | 'totalAmount' | 'customerName', className = "") => {
    const isSorted = sortBy === field;
    return (
      <th 
        className={`p-6 cursor-pointer select-none transition-colors hover:bg-slate-100/10 dark:hover:bg-slate-800/10 ${className}`}
        onClick={() => {
          if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortBy(field);
            setSortOrder('desc');
          }
        }}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-center') ? 'justify-center font-black' : 'font-black'}`}>
          <span>{label}</span>
          <span className={`text-[11px] font-sans ${isSorted ? 'opacity-100 text-blue-500 font-extrabold' : 'opacity-30'}`}>
            {isSorted ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
          <input 
            type="text" 
            placeholder="جستجو فاکتور یا مشتری..." 
            className="w-full pr-12 pl-4 py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={handleOpenAddMode} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 font-black flex items-center justify-center gap-3 active:scale-95">
          + ثبت فاکتور جدید
        </button>
      </div>

      <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">نوع فاکتور:</span>
            <select className="text-sm font-bold p-3 px-5 border-2 border-transparent focus:border-blue-500 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm transition-all" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
              <option value="ALL">همه انواع</option>
              <option value={InvoiceType.RETAIL}>خرده‌فروشی</option>
              <option value={InvoiceType.WHOLESALE}>عمده‌فروشی</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">مشتری:</span>
            <select className="text-sm font-bold p-3 px-5 border-2 border-transparent focus:border-blue-500 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm transition-all max-w-[200px]" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="ALL">همه مشتریان</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">از تاریخ:</span>
            <JalaliDatePicker value={startDate} onChange={setStartDate} placeholder="شروع..." />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">تا تاریخ:</span>
            <JalaliDatePicker value={endDate} onChange={setEndDate} placeholder="پایان..." />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">مرتب‌سازی:</span>
            <div className="flex items-center -space-x-2 rtl:space-x-reverse">
              <select className="text-sm font-bold p-3 pl-8 pr-5 border focus:border-blue-500 rounded-r-xl bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm transition-all border-slate-200 dark:border-slate-700" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="date">تاریخ فاکتور</option>
                <option value="totalAmount">مبلغ کل فاکتور</option>
                <option value="customerName">نام مشتری</option>
              </select>
              <button 
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="text-sm font-bold p-3 px-4 border shadow-sm rounded-l-xl bg-white dark:bg-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 border-slate-200 dark:border-slate-700 hover:border-blue-500"
                title="تغییر جهت مرتب‌سازی"
              >
                <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{sortOrder === 'asc' ? 'صعودی' : 'نزولی'}</span>
              </button>
            </div>
          </div>
          <button onClick={clearFilters} className="mr-auto text-xs font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest">پاکسازی فیلترها</button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-right min-w-[900px]">
          <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">
            <tr>
              <th className="p-6">شماره فاکتور</th>
              {renderSortableHeader('تاریخ', 'date')}
              {renderSortableHeader('مشتری', 'customerName')}
              <th className="p-6 text-center">نوع</th>
              {renderSortableHeader('مبلغ کل', 'totalAmount', 'text-center')}
              <th className="p-6 text-center">وضعیت پرداخت</th>
              <th className="p-6 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                  هیچ فاکتوری یافت نشد.
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                  <td className="p-6 font-black text-slate-800 dark:text-slate-200">#{inv.invoiceNumber}</td>
                  <td className="p-6 text-slate-500 dark:text-slate-400 font-bold text-sm">{formatJalali(inv.date)}</td>
                  <td className="p-6">
                    <div className="font-bold text-slate-700 dark:text-slate-300">{inv.customerName || 'مشتری گذری'}</div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${inv.type === InvoiceType.RETAIL ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                      {inv.type === InvoiceType.RETAIL ? 'خرده' : 'عمده'}
                    </span>
                  </td>
                  <td className="p-6 text-center font-black text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(inv.totalAmount)}</td>
                  <td className="p-6 text-center">
                    {inv.remainingAmount <= 0 ? (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl uppercase tracking-widest">تسویه شده</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl uppercase tracking-widest">مانده بدهی</span>
                        <span className="text-[10px] font-mono font-bold text-rose-500">{formatCurrency(inv.remainingAmount)}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setViewingInvoice(inv)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-90" title="مشاهده">👁️</button>
                      <button onClick={() => window.print()} className="p-2.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all active:scale-90" title="چاپ">🖨️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
