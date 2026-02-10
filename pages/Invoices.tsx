
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Invoice, InvoiceItem, InvoiceType, Product, Customer, PaymentMethod } from '../types';
import { formatCurrency, formatJalali, exportToPDF } from '../utils';
import JalaliDatePicker from '../components/JalaliDatePicker';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(db.getInvoices());
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'ALL'>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const products = db.getProducts();
  const customers = db.getCustomers();

  // New Invoice State
  const [newInv, setNewInv] = useState<{
    date: string;
    type: InvoiceType;
    customerId: string;
    items: { productId: string; qty: number; unitPrice: number }[];
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
  
  // Auto-adjust paidAmount based on paymentMethod, only if not mixed
  useMemo(() => {
     if (newInv.paymentMethod === PaymentMethod.CASH || newInv.paymentMethod === PaymentMethod.CARD) {
        setNewInv(prev => ({ ...prev, paidAmount: finalTotal }));
     } else if (newInv.paymentMethod === PaymentMethod.DEBT) {
        setNewInv(prev => ({ ...prev, paidAmount: 0 }));
     }
  }, [newInv.paymentMethod, finalTotal]);

  const remaining = finalTotal - newInv.paidAmount;

  // Filtered Invoices Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (inv.customerName || 'مشتری گذری').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || inv.type === typeFilter;
      const matchCustomer = customerFilter === 'ALL' || inv.customerId === customerFilter;
      
      const invDate = new Date(inv.date);
      const matchStart = !startDate || invDate >= new Date(startDate);
      const endDateTime = endDate ? new Date(endDate) : null;
      if (endDateTime) endDateTime.setHours(23, 59, 59, 999);
      const matchEnd = !endDate || invDate <= endDateTime!;

      return matchSearch && matchType && matchCustomer && matchStart && matchEnd;
    });
  }, [invoices, searchTerm, typeFilter, customerFilter, startDate, endDate]);

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
      const prod = products.find(p => p.id === value);
      item.productId = value;
      item.unitPrice = newInv.type === InvoiceType.RETAIL ? (prod?.retailPrice || 0) : (prod?.wholesalePrice || 0);
    } else {
      (item as any)[field] = value;
    }

    setNewInv({ ...newInv, items: updatedItems });
  };

  const handleEditInvoiceClick = (inv: Invoice) => {
    let method = PaymentMethod.MIXED;
    if (inv.paidAmount === inv.totalAmount) method = PaymentMethod.CASH; // guess
    if (inv.paidAmount === 0) method = PaymentMethod.DEBT;

    setNewInv({
      date: inv.date,
      type: inv.type,
      customerId: inv.customerId || '',
      items: inv.items.map(i => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })),
      paidAmount: inv.paidAmount,
      discountTotal: inv.discountTotal,
      paymentMethod: method,
      dueDate: inv.dueDate || ''
    });
    setEditingInvoiceId(inv.id);
    setIsAddMode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInv.items.some(i => !i.productId)) {
        alert('لطفا کالاها را انتخاب کنید');
        return;
    }

    try {
      const invoiceItems: InvoiceItem[] = newInv.items.map(item => {
        const prod = products.find(p => p.id === item.productId)!;
        return {
          productId: item.productId,
          productName: prod.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: 0,
          costBasisAtSale: prod.avgCost 
        };
      });

      const invoice: Invoice = {
        id: editingInvoiceId || Date.now().toString(),
        invoiceNumber: editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)!.invoiceNumber : `INV-${Date.now().toString().slice(-6)}`,
        date: newInv.date, // Use the selected date
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

      if (editingInvoiceId) {
        db.updateInvoice(editingInvoiceId, invoice);
        alert('فاکتور با موفقیت ویرایش شد');
      } else {
        db.createInvoice(invoice);
        alert('فاکتور با موفقیت ثبت شد');
      }
      
      setInvoices(db.getInvoices());
      setIsAddMode(false);
      setEditingInvoiceId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isAddMode) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
            {editingInvoiceId ? 'ویرایش فاکتور' : 'صدور فاکتور جدید'}
          </h3>
          <button onClick={() => { setIsAddMode(false); setEditingInvoiceId(null); }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-colors font-bold text-sm">لغو</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-blue-50/30 dark:bg-blue-900/10 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div>
              <JalaliDatePicker 
                label="تاریخ فاکتور"
                className="w-full [&>div]:p-2.5 [&>div]:md:p-3 [&>div]:shadow-sm"
                value={newInv.date}
                onChange={val => setNewInv({ ...newInv, date: val })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 px-1">نوع فاکتور</label>
              <select 
                className="w-full p-2.5 md:p-3 border dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                value={newInv.type}
                onChange={e => {
                  const type = e.target.value as InvoiceType;
                  const updatedItems = newInv.items.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    return { ...item, unitPrice: type === InvoiceType.RETAIL ? (prod?.retailPrice || 0) : (prod?.wholesalePrice || 0) };
                  });
                  setNewInv({ ...newInv, type, items: updatedItems });
                }}
              >
                <option value={InvoiceType.RETAIL}>🛍️ خرده‌فروشی</option>
                <option value={InvoiceType.WHOLESALE}>📦 عمده‌فروشی</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 px-1">انتخاب مشتری</label>
              <select 
                className="w-full p-2.5 md:p-3 border dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                value={newInv.customerId}
                onChange={e => setNewInv({ ...newInv, customerId: e.target.value, dueDate: '' })}
              >
                <option value="">👤 مشتری گذری</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 px-1">روش تسویه</label>
              <div className="grid grid-cols-4 gap-1 h-[42px] md:h-[46px]">
                 {[
                   { id: PaymentMethod.CASH, label: 'نقدی' },
                   { id: PaymentMethod.CARD, label: 'کارت' },
                   { id: PaymentMethod.DEBT, label: 'نسیه' },
                   { id: PaymentMethod.MIXED, label: 'ترکیبی' }
                 ].map(method => (
                   <button
                     key={method.id}
                     type="button"
                     onClick={() => setNewInv({ ...newInv, paymentMethod: method.id as PaymentMethod })}
                     className={`rounded-lg text-xs font-bold border transition-all ${newInv.paymentMethod === method.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                   >
                     {method.label}
                   </button>
                 ))}
              </div>
            </div>
          </div>

          {newInv.customerId && (
            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 md:p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex flex-col md:flex-row items-end gap-4 animate-in slide-in-from-top-2">
              <JalaliDatePicker 
                label="تاریخ تسویه و یادآوری"
                className="w-full md:w-64"
                value={newInv.dueDate}
                onChange={val => setNewInv({ ...newInv, dueDate: val })}
                placeholder="انتخاب تاریخ تسویه..."
              />
              <div className="flex-1 text-[10px] md:text-xs text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-200 dark:border-orange-900/30">
                💡 با انتخاب تاریخ تسویه، سیستم در موعد مقرر به شما هشدار خواهد داد.
              </div>
            </div>
          )}

          <div className="border dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-slate-800 text-white text-xs">
                  <tr>
                    <th className="p-3 md:p-4">کالا</th>
                    <th className="p-3 md:p-4 w-24 text-center">تعداد</th>
                    <th className="p-3 md:p-4 text-center">قیمت واحد</th>
                    <th className="p-3 md:p-4 text-center">جمع</th>
                    <th className="p-3 md:p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                  {newInv.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 md:p-4">
                        <select 
                          required
                          className="w-full p-2 border dark:border-slate-700 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                          value={item.productId}
                          onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                        >
                          <option value="" className="dark:bg-slate-800">انتخاب کالا...</option>
                          {products.map(p => <option key={p.id} value={p.id} className="dark:bg-slate-800">{p.name}</option>)}
                        </select>
                      </td>
                      <td className="p-3 md:p-4">
                        <input 
                          type="number" 
                          min="1" 
                          className="w-full p-2 border dark:border-slate-700 rounded-lg text-center bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs" 
                          value={item.qty}
                          onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3 md:p-4">
                        <input 
                          type="number" 
                          className="w-full p-2 border dark:border-slate-700 rounded-lg text-center bg-white dark:bg-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                          value={item.unitPrice}
                          onChange={e => handleItemChange(idx, 'unitPrice', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3 md:p-4 text-center font-bold text-slate-700 dark:text-slate-300 font-mono text-xs">
                        {formatCurrency(item.qty * item.unitPrice)}
                      </td>
                      <td className="p-3 md:p-4 text-center">
                        <button 
                          type="button"
                          onClick={() => setNewInv({...newInv, items: newInv.items.filter((_, i) => i !== idx)})}
                          className="text-red-400 hover:text-red-600 text-xl font-bold"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700">
              <button type="button" onClick={handleAddItem} className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline flex items-center gap-1">
                <span>➕</span> افزودن سطر جدید
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-4 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border dark:border-slate-800">
              <div className="flex justify-between items-center p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">جمع کل کالاها:</span>
                <span className="font-mono font-bold text-base md:text-lg dark:text-white">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex gap-2 md:gap-4 items-center">
                <label className="font-bold text-gray-700 dark:text-slate-300 w-24 md:w-32 text-xs">تخفیف:</label>
                <input 
                  type="number" 
                  className="flex-1 p-2 md:p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
                  value={newInv.discountTotal}
                  onChange={e => setNewInv({ ...newInv, discountTotal: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-2 md:gap-4 items-center">
                <label className="font-bold text-gray-700 dark:text-slate-300 w-24 md:w-32 text-xs">دریافتی:</label>
                <input 
                  type="number" 
                  className="flex-1 p-2 md:p-3 border border-green-200 dark:border-green-900/30 rounded-xl bg-green-50 dark:bg-green-900/10 focus:ring-2 focus:ring-green-500 outline-none font-bold font-mono text-sm text-green-700 dark:text-green-400" 
                  value={newInv.paidAmount}
                  onChange={e => setNewInv({ ...newInv, paidAmount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl space-y-4 md:space-y-6">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3 md:pb-4">
                <span className="text-slate-400 text-sm">نهایی:</span>
                <span className="text-xl md:text-2xl font-black">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">مانده حساب:</span>
                <span className={`text-lg md:text-xl font-bold ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 md:py-4 rounded-xl font-bold text-base md:text-lg transition-transform active:scale-95"
              >
                {editingInvoiceId ? '💾 ثبت تغییرات فاکتور' : '💾 تایید و صدور فاکتور'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">فاکتورها</h3>
        <button 
          onClick={handleOpenAddMode} 
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 font-bold"
        >
          <span>➕</span> صدور فاکتور جدید
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1 px-1">جستجو</label>
            <input 
              type="text" 
              placeholder="شماره فاکتور یا مشتری..." 
              className="w-full pl-4 pr-10 py-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute bottom-2.5 right-3 text-gray-400">🔍</span>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1 px-1">نوع</label>
            <select 
              className="w-full p-2 border dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="ALL">همه موارد</option>
              <option value={InvoiceType.RETAIL}>خرده‌فروشی</option>
              <option value={InvoiceType.WHOLESALE}>عمده‌فروشی</option>
            </select>
          </div>
          
          <JalaliDatePicker 
            label="از تاریخ"
            value={startDate}
            onChange={setStartDate}
            placeholder="شروع..."
          />
          
          <JalaliDatePicker 
            label="تا تاریخ"
            value={endDate}
            onChange={setEndDate}
            placeholder="پایان..."
          />
        </div>
      </div>

      <div className="overflow-x-auto border dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-right min-w-[700px]">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase">
            <tr>
              <th className="p-3 md:p-4">شماره فاکتور</th>
              <th className="p-3 md:p-4">تاریخ</th>
              <th className="p-3 md:p-4">مشتری</th>
              <th className="p-3 md:p-4 text-center">نوع</th>
              <th className="p-3 md:p-4 text-center">مبلغ کل</th>
              <th className="p-3 md:p-4 text-center">وضعیت</th>
              <th className="p-3 md:p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
            {filteredInvoices.length > 0 ? [...filteredInvoices].reverse().map(inv => (
              <tr key={inv.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                <td className="p-3 md:p-4 font-bold text-slate-700 dark:text-slate-200 text-xs">{inv.invoiceNumber}</td>
                <td className="p-3 md:p-4 text-gray-500 dark:text-slate-400 text-[10px]">{formatJalali(inv.date)}</td>
                <td className="p-3 md:p-4 font-medium text-slate-600 dark:text-slate-300 text-xs">{inv.customerName || '👤 مشتری گذری'}</td>
                <td className="p-3 md:p-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${inv.type === InvoiceType.RETAIL ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'}`}>
                    {inv.type === InvoiceType.RETAIL ? 'خرده' : 'عمده'}
                  </span>
                </td>
                <td className="p-3 md:p-4 text-center font-bold font-mono text-xs">{formatCurrency(inv.totalAmount)}</td>
                <td className="p-3 md:p-4 text-center">
                  {inv.remainingAmount === 0 ? (
                    <span className="text-green-600 text-[9px] font-bold border border-green-200 bg-green-50 px-2 py-0.5 rounded">✅ تسویه</span>
                  ) : (
                    <span className="text-red-500 font-bold font-mono text-[10px]">{formatCurrency(inv.remainingAmount)}</span>
                  )}
                </td>
                <td className="p-3 md:p-4 text-center flex gap-1 justify-center">
                  <button 
                    onClick={() => setViewingInvoice(inv)}
                    className="p-1.5 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    title="مشاهده جزئیات"
                  >👁️</button>
                  <button 
                    onClick={() => handleEditInvoiceClick(inv)}
                    className="p-1.5 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                    title="ویرایش فاکتور"
                  >✏️</button>
                  <button 
                    onClick={() => exportToPDF(`invoice-${inv.id}`, `invoice-${inv.invoiceNumber}`)} 
                    className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="چاپ فاکتور"
                  >🖨️</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="p-16 text-center text-gray-400 italic text-xs">فاکتوری یافت نشد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredInvoices.length > 0 && (
        <div className="p-4 md:p-6 bg-slate-800 dark:bg-slate-950 rounded-2xl flex flex-col md:flex-row justify-between items-center text-white gap-4">
          <div className="flex gap-6 md:gap-8 w-full md:w-auto justify-between md:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">فاکتورها</span>
              <span className="text-base font-bold">{filteredInvoices.length} مورد</span>
            </div>
            <div className="flex flex-col border-r border-slate-700 pr-6 md:pr-8">
              <span className="text-[10px] text-slate-400">جمع کل</span>
              <span className="text-base font-bold text-blue-400">{formatCurrency(filteredInvoices.reduce((a, b) => a + b.totalAmount, 0))}</span>
            </div>
          </div>
          <button className="w-full md:w-auto text-[10px] font-bold bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition-colors">📥 خروجی اکسل</button>
        </div>
      )}

      {/* View Invoice Modal Shared Component */}
      <InvoiceDetailModal invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
    </div>
  );
};

export default Invoices;
