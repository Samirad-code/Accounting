
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { formatCurrency, formatJalali } from '../utils';
import { Invoice, InvoiceItem, InvoiceType, PaymentMethod } from '../types';
import JalaliDatePicker from '../components/JalaliDatePicker';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import SearchableProductSelect from '../components/SearchableProductSelect';

interface CategoryStat {
  sales: number;
  profit: number;
}

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [productSortBy, setProductSortBy] = useState<'profit' | 'percent'>('profit');

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

  const invoices = db.getInvoices();
  const products = db.getProducts();
  const customers = db.getCustomers();

  const subTotal = useMemo(() => {
    return newInv.items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  }, [newInv.items]);

  const finalTotal = subTotal - newInv.discountTotal;
  const remaining = finalTotal - newInv.paidAmount;

  // Filter invoices based on date range with improved logic
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (dateRange === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'month') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'year') {
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'custom') {
      startDate = customStart ? new Date(customStart) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    return invoices.filter(inv => {
      const d = new Date(inv.date);
      const isAfterStart = startDate ? d >= startDate : true;
      const isBeforeEnd = d <= endDate;
      return isAfterStart && isBeforeEnd && inv.status === 'ACTIVE';
    });
  }, [invoices, dateRange, customStart, customEnd]);

  const stats = useMemo(() => {
    let grossSales = 0;
    let totalCogs = 0; 
    let totalDiscounts = 0;
    const categoryProfit: Record<string, CategoryStat> = {};
    const productProfit: Record<string, { name: string, profit: number, sales: number, percent: number }> = {};

    filteredInvoices.forEach(inv => {
      grossSales += inv.totalAmount + inv.discountTotal;
      totalDiscounts += inv.discountTotal;

      inv.items.forEach(item => {
        const itemSales = item.qty * item.unitPrice;
        const itemCost = item.qty * item.costBasisAtSale;
        const profit = itemSales - itemCost;
        
        totalCogs += itemCost;

        const product = db.getProducts().find(p => p.id === item.productId);
        const cat = product?.category || 'سایر';
        
        if (!categoryProfit[cat]) categoryProfit[cat] = { sales: 0, profit: 0 };
        categoryProfit[cat].sales += itemSales;
        categoryProfit[cat].profit += profit;

        if (item.productId && !productProfit[item.productId]) {
          productProfit[item.productId] = { name: item.productName, profit: 0, sales: 0, percent: 0 };
        }
        if (item.productId) {
          productProfit[item.productId].profit += profit;
          productProfit[item.productId].sales += itemSales;
        }
      });
    });

    Object.values(productProfit).forEach(p => {
      p.percent = p.sales > 0 ? (p.profit / p.sales) * 100 : 0;
    });

    const netProfit = (grossSales - totalCogs) - totalDiscounts;
    const topProducts = Object.values(productProfit)
      .sort((a, b) => productSortBy === 'profit' ? b.profit - a.profit : b.percent - a.percent)
      .slice(0, 5);

    return { grossSales, totalCogs, totalDiscounts, netProfit, categoryProfit, topProducts };
  }, [filteredInvoices, productSortBy]);

  const handleDeleteInvoice = (id: string) => {
    db.deleteInvoice(id);
    setViewingInvoice(null);
  };

  const handleEditInvoice = (id: string) => {
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
    setIsEditMode(true);
    setViewingInvoice(null);
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

  const handleSubmitEdit = (e: React.FormEvent) => {
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
        id: editingInvoiceId!,
        invoiceNumber: invoices.find(i => i.id === editingInvoiceId)!.invoiceNumber,
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

      db.updateInvoice(editingInvoiceId!, invoice);
      setIsEditMode(false);
      setEditingInvoiceId(null);
    } catch (err: any) { alert(err.message); }
  };

  if (isEditMode) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">ویرایش فاکتور</h3>
          <button onClick={() => { setIsEditMode(false); setEditingInvoiceId(null); }} className="text-red-500 font-bold">لغو</button>
        </div>

        <form onSubmit={handleSubmitEdit} className="space-y-6">
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
              <button type="button" onClick={() => setNewInv({ ...newInv, items: [...newInv.items, { productId: '', qty: 1, unitPrice: 0 }] })} className="text-blue-600 font-bold text-xs flex items-center gap-1">➕ افزودن ردیف</button>
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
              <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg active:scale-95 transition-all">بروزرسانی فاکتور</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">فیلتر گزارشات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">بازه زمانی مورد نظر خود را برای تحلیل سود و زیان انتخاب کنید.</p>
          </div>
          
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {(['today', 'month', 'year', 'custom'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setDateRange(mode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === mode ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {mode === 'today' ? 'امروز' : mode === 'month' ? '۳۰ روز اخیر' : mode === 'year' ? 'سال اخیر' : 'بازه دلخواه'}
              </button>
            ))}
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top-2">
            <JalaliDatePicker 
              label="تاریخ شروع گزارش"
              value={customStart}
              onChange={setCustomStart}
              placeholder="انتخاب تاریخ شروع..."
              className="w-full"
            />
            <JalaliDatePicker 
              label="تاریخ پایان گزارش"
              value={customEnd}
              onChange={setCustomEnd}
              placeholder="انتخاب تاریخ پایان..."
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider">فروش ناخالص</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(stats.grossSales)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-red-400 dark:text-red-500 text-[10px] font-bold mb-2 uppercase tracking-wider">بهای تمام شده</p>
          <h4 className="text-xl font-black text-red-600 dark:text-red-400">-{formatCurrency(stats.totalCogs)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-orange-400 dark:text-orange-500 text-[10px] font-bold mb-2 uppercase tracking-wider">تخفیفات</p>
          <h4 className="text-xl font-black text-orange-600 dark:text-orange-400">-{formatCurrency(stats.totalDiscounts)}</h4>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-3xl shadow-xl">
          <p className="text-green-100 text-[10px] font-bold mb-2 uppercase tracking-wider">سود خالص</p>
          <h4 className="text-2xl font-black text-white">{formatCurrency(stats.netProfit)}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Performance */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
            <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">سوددهی به تفکیک دسته‌بندی</h5>
          </div>
          <div className="p-8 space-y-6">
            {Object.entries(stats.categoryProfit).length > 0 ? (Object.entries(stats.categoryProfit) as [string, CategoryStat][]).map(([name, data]) => (
              <div key={name} className="space-y-2 group">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">{name}</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(data.profit)} سود</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, (data.profit / Math.max(1, stats.netProfit)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-10">داده‌ای یافت نشد</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center">
            <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">برترین محصولات سودآور</h5>
            <select 
              className="text-[10px] font-bold p-1 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white outline-none"
              value={productSortBy}
              onChange={(e) => setProductSortBy(e.target.value as any)}
            >
              <option value="profit">بر اساس مبلغ سود</option>
              <option value="percent">بر اساس درصد سود</option>
            </select>
          </div>
          <div className="divide-y dark:divide-slate-800">
            {stats.topProducts.map((p, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">درصد سود: {p.percent.toFixed(1)}%</span>
                </div>
                <span className="text-sm font-black text-green-600 font-mono">{formatCurrency(p.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction List (New Section) */}
      <section className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 bg-slate-800 text-white flex justify-between items-center">
          <h5 className="font-bold text-sm flex items-center gap-2">🧾 لیست فاکتورهای این بازه</h5>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">{filteredInvoices.length} فاکتور</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-bold text-xs">
              <tr>
                <th className="p-4">شماره فاکتور</th>
                <th className="p-4">مشتری</th>
                <th className="p-4 text-center">مبلغ کل</th>
                <th className="p-4 text-center">باقیمانده</th>
                <th className="p-4 text-center">تاریخ</th>
                <th className="p-4 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{inv.invoiceNumber}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{inv.customerName || 'مشتری گذری'}</td>
                  <td className="p-4 text-center font-bold font-mono text-blue-600 dark:text-blue-400">{formatCurrency(inv.totalAmount)}</td>
                  <td className="p-4 text-center font-bold font-mono text-rose-500">{formatCurrency(inv.remainingAmount)}</td>
                  <td className="p-4 text-center text-xs text-gray-400">{formatJalali(inv.date)}</td>
                  <td className="p-4 text-left">
                    <button 
                      onClick={() => setViewingInvoice(inv)}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white px-4 py-1 rounded-lg font-bold text-xs transition-all"
                    >
                      مشاهده و عملیات
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 italic">هیچ فاکتوری در این بازه زمانی ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InvoiceDetailModal 
        invoice={viewingInvoice} 
        onClose={() => setViewingInvoice(null)} 
        onDelete={handleDeleteInvoice}
        onEdit={handleEditInvoice}
      />
    </div>
  );
};

export default Reports;
