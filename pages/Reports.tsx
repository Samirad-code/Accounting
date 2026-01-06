
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { formatCurrency, formatJalali } from '../utils';
import JalaliDatePicker from '../components/JalaliDatePicker';

interface CategoryStat {
  sales: number;
  profit: number;
}

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const invoices = db.getInvoices();

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
    const productProfit: Record<string, { name: string, profit: number }> = {};

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

        if (!productProfit[item.productId]) productProfit[item.productId] = { name: item.productName, profit: 0 };
        productProfit[item.productId].profit += profit;
      });
    });

    const netProfit = (grossSales - totalCogs) - totalDiscounts;
    const topProducts = Object.values(productProfit).sort((a, b) => b.profit - a.profit).slice(0, 5);

    return { grossSales, totalCogs, totalDiscounts, netProfit, categoryProfit, topProducts };
  }, [filteredInvoices]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Enhanced Filter Bar */}
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
            <div className="flex items-end pb-1">
              <button 
                onClick={() => {setCustomStart(''); setCustomEnd('');}}
                className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-red-100"
              >
                ❌ پاکسازی بازه دلخواه
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider">فروش ناخالص (قبل از تخفیف)</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(stats.grossSales)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-red-400 dark:text-red-500 text-[10px] font-bold mb-2 uppercase tracking-wider">بهای تمام شده خرید</p>
          <h4 className="text-xl font-black text-red-600 dark:text-red-400">-{formatCurrency(stats.totalCogs)}</h4>
        </div>
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-3xl shadow-sm">
          <p className="text-orange-400 dark:text-orange-500 text-[10px] font-bold mb-2 uppercase tracking-wider">تخفیفات اعطا شده</p>
          <h4 className="text-xl font-black text-orange-600 dark:text-orange-400">-{formatCurrency(stats.totalDiscounts)}</h4>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-3xl shadow-xl shadow-green-100 dark:shadow-none ring-4 ring-green-50 dark:ring-green-900/20">
          <p className="text-green-100 text-[10px] font-bold mb-2 uppercase tracking-wider">سود خالص عملیاتی</p>
          <h4 className="text-2xl font-black text-white">{formatCurrency(stats.netProfit)}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Performance */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 flex justify-between items-center">
            <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">عملکرد به تفکیک دسته‌بندی</h5>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg font-bold">Category Profitability</span>
          </div>
          <div className="p-8 space-y-6">
            {Object.entries(stats.categoryProfit).length > 0 ? (Object.entries(stats.categoryProfit) as [string, CategoryStat][]).map(([name, data]) => (
              <div key={name} className="space-y-2 group">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors">{name}</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(data.profit)} سود</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    style={{ width: `${Math.min(100, (data.profit / Math.max(1, stats.netProfit)) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                  <span>فروش: {formatCurrency(data.sales)}</span>
                  <span className="font-mono">Margin: {data.sales > 0 ? Math.round((data.profit / data.sales) * 100) : 0}%</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-16">
                <span className="text-4xl opacity-20 grayscale">📊</span>
                <p className="mt-4 text-gray-400 dark:text-slate-600 italic text-sm">داده‌ای برای این بازه یافت نشد</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Product Drivers */}
        <div className="bg-slate-50 dark:bg-slate-800/20 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center">
            <h5 className="font-bold text-slate-700 dark:text-slate-200 text-sm">۵ محصول برتر از لحاظ سودآوری</h5>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Profit Drivers Index</span>
          </div>
          <div className="divide-y dark:divide-slate-800 bg-white dark:bg-slate-900">
            {stats.topProducts.length > 0 ? stats.topProducts.map((p, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {idx+1}
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-green-600 dark:text-green-400 font-mono">{formatCurrency(p.profit)}</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">سود خالص کالا</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-16 dark:bg-slate-900">
                <p className="text-gray-400 dark:text-slate-600 italic text-sm">لیست محصولات خالی است</p>
              </div>
            )}
          </div>
          {stats.topProducts.length > 0 && (
            <div className="p-8 bg-slate-900 dark:bg-black m-6 rounded-2xl text-center shadow-xl">
               <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">بازدهی کل فروش در این بازه</p>
               <p className="text-3xl font-black text-blue-400">
                 {stats.grossSales > 0 ? ((stats.netProfit / stats.grossSales) * 100).toFixed(1) : 0}%
               </p>
               <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">Net Profit Margin Ratio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
