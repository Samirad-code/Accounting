
// Add React import to fix 'Cannot find namespace React' errors
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db';
import { Todo } from '../types';
import { formatCurrency, getStockStatusColor } from '../utils';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const jalaliMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const getJalaliParts = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    };
  } catch (e) {
    return {
      year: date.getFullYear() - 621,
      month: ((date.getMonth() + 9) % 12) + 1,
      day: date.getDate()
    };
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-xl text-white text-xs font-bold space-y-2 text-right">
        <p className="text-slate-300 font-extrabold border-b border-slate-700/50 pb-1.5 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-6 text-right">
            <span className="flex items-center gap-1.5 font-black" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}:
            </span>
            <span className="font-mono text-slate-100">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const formatYValue = (value: number) => {
  if (value === 0) return '۰';
  if (value >= 1000000) {
    return (value / 1000000).toLocaleString('fa-IR') + ' م';
  }
  if (value >= 1000) {
    return (value / 1000).toLocaleString('fa-IR') + ' ه';
  }
  return value.toLocaleString('fa-IR');
};

const Dashboard: React.FC = () => {
  const products = db.getProducts();
  const invoices = db.getInvoices();
  const customers = db.getCustomers();
  const purchases = db.getPurchases();
  const [todos, setTodos] = useState<Todo[]>(db.getTodos());
  const [newTodo, setNewTodo] = useState('');

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Stats calculation
  const totalSales = invoices.reduce((acc, inv) => acc + (inv.status === 'ACTIVE' ? inv.totalAmount : 0), 0);
  const totalProfit = invoices.reduce((acc, inv) => {
    if (inv.status !== 'ACTIVE') return acc;
    const invProfit = inv.items.reduce((itemAcc, item) => {
      const itemProfit = (item.unitPrice - item.costBasisAtSale) * item.qty;
      return itemAcc + itemProfit;
    }, 0);
    return acc + invProfit - inv.discountTotal;
  }, 0);

  const lowStockProducts = products.filter(p => p.quantity <= p.lowStockThreshold);
  const topDebtors = [...customers].sort((a, b) => a.balance - b.balance).slice(0, 5);

  const chartData = useMemo(() => {
    const currentJalali = getJalaliParts(new Date());
    const monthsData = [];
    let currYear = currentJalali.year;
    let currMonth = currentJalali.month;

    for (let i = 0; i < 12; i++) {
      monthsData.push({
        year: currYear,
        month: currMonth,
        name: `${jalaliMonths[currMonth - 1]} ${currYear % 100}`,
        sales: 0,
        purchases: 0
      });

      currMonth--;
      if (currMonth === 0) {
        currMonth = 12;
        currYear--;
      }
    }

    const months = monthsData.reverse();

    // Accumulate invoices (sales)
    invoices.forEach(inv => {
      if (inv.status !== 'ACTIVE') return;
      const jalali = getJalaliParts(new Date(inv.date));
      const match = months.find(m => m.year === jalali.year && m.month === jalali.month);
      if (match) {
        match.sales += inv.totalAmount;
      }
    });

    // Accumulate purchases
    purchases.forEach(p => {
      const jalali = getJalaliParts(new Date(p.date));
      const match = months.find(m => m.year === jalali.year && m.month === jalali.month);
      if (match) {
        match.purchases += p.totalAmount;
      }
    });

    return months;
  }, [invoices, purchases]);

  const totalSalesOfYear = useMemo(() => chartData.reduce((acc, curr) => acc + curr.sales, 0), [chartData]);
  const totalPurchasesOfYear = useMemo(() => chartData.reduce((acc, curr) => acc + curr.purchases, 0), [chartData]);

  const currentJalali = useMemo(() => getJalaliParts(new Date()), []);
  const currentMonthName = useMemo(() => jalaliMonths[currentJalali.month - 1] || 'جاری', [currentJalali]);

  const currentMonthData = useMemo(() => {
    return chartData[chartData.length - 1];
  }, [chartData]);

  const currentMonthSales = currentMonthData ? currentMonthData.sales : 0;
  const currentMonthPurchases = currentMonthData ? currentMonthData.purchases : 0;
  const currentMonthNetProfit = currentMonthSales - currentMonthPurchases;

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    db.addTodo(newTodo.trim());
    setTodos([...db.getTodos()]);
    setNewTodo('');
  };

  const handleToggleTodo = (id: string) => {
    db.toggleTodo(id);
    setTodos([...db.getTodos()]);
  };

  const handleDeleteTodo = (id: string) => {
    db.deleteTodo(id);
    setTodos([...db.getTodos()]);
  };

  // گرفتن تاریخ امروز به شمسی
  const todayDate = new Intl.DateTimeFormat('fa-IR', { 
    dateStyle: 'full' 
  }).format(new Date());

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Dashboard Header with Date */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👋</span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">خوش آمدید!</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border dark:border-slate-700/50">
          <span className="text-lg">📅</span>
          <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400">{todayDate}</span>
        </div>
      </div>

      {/* Top Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8">
        <div className="group bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">مجموع فروش کل</p>
            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">💰</span>
          </div>
          <h3 className="text-3xl font-black mt-6 tracking-tight font-mono">{formatCurrency(totalSales)}</h3>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">گزارش تجمعی</span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest opacity-80">سود تخمینی</p>
            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">💎</span>
          </div>
          <h3 className="text-3xl font-black mt-6 tracking-tight font-mono">{formatCurrency(totalProfit)}</h3>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">سود خالص</span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-widest">Net</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <p className="text-purple-100 text-[10px] font-black uppercase tracking-widest opacity-80">سود خالص ماه جاری ({currentMonthName})</p>
            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📊</span>
          </div>
          <h3 className="text-3xl font-black mt-6 tracking-tight font-mono">{formatCurrency(currentMonthNetProfit)}</h3>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">تفاوت کل خرید و فروش</span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-widest">{currentMonthName}</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest opacity-80">فاکتورهای صادر شده</p>
            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">🧾</span>
          </div>
          <h3 className="text-3xl font-black mt-6 tracking-tight font-mono">{invoices.length} <span className="text-sm font-black opacity-60 uppercase tracking-widest">عدد</span></h3>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">تاریخچه کامل</span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-widest">Total</span>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-rose-500 to-rose-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest opacity-80">هشدار موجودی</p>
            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">🚨</span>
          </div>
          <h3 className="text-3xl font-black mt-6 tracking-tight font-mono">{lowStockProducts.length} <span className="text-sm font-black opacity-60 uppercase tracking-widest">کالا</span></h3>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">نیاز به شارژ</span>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase tracking-widest">Alert</span>
          </div>
        </div>
      </div>

      {/* Monthly Financial Chart Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm p-6 md:p-8 transition-all hover:shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3">
              <span className="text-xl">📈</span>
              گزارش عملکرد مالی ماهانه
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">مقایسه فروش و خرید در بازه ۱۲ ماه گذشته (ریالی)</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-black">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 px-4 py-2 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-blue-700 dark:text-blue-300">مجموع فروش ۱۲ ماه: <span className="font-mono">{formatCurrency(totalSalesOfYear)}</span></span>
            </div>
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 px-4 py-2 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-rose-700 dark:text-rose-300">مجموع خرید ۱۲ ماه: <span className="font-mono">{formatCurrency(totalPurchasesOfYear)}</span></span>
            </div>
          </div>
        </div>

        <div className="w-full h-[320px] md:h-[350px] direction-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={textColor} 
                fontSize={11} 
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke={textColor} 
                fontSize={11} 
                fontWeight="bold"
                tickFormatter={formatYValue}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs font-black text-slate-700 dark:text-slate-300 px-1">{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                name="مجموع فروش" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#0f172a' : '#ffffff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="purchases" 
                name="مجموع خرید" 
                stroke="#f43f5e" 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#0f172a' : '#ffffff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
        
        {/* Left Column: Low Stock & Debtors */}
        <div className="space-y-8 md:space-y-10">
          
          {/* Low Stock Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden h-fit transition-all hover:shadow-md">
            <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                کالاهای زیر حد نصاب موجودی
              </h4>
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">Critical</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-4 md:p-5 text-right">نام کالا</th>
                    <th className="p-4 md:p-5 text-center">موجودی</th>
                    <th className="p-4 md:p-5 text-center">حداقل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <td className="p-4 md:p-5 text-right font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{p.name}</td>
                      <td className={`p-4 md:p-5 text-center font-black ${getStockStatusColor(p.quantity, p.lowStockThreshold)}`}>{p.quantity}</td>
                      <td className="p-4 md:p-5 text-center text-slate-400 dark:text-slate-600 font-mono font-bold">{p.lowStockThreshold}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-12 text-center text-slate-400 dark:text-slate-600 italic font-medium">تمامی کالاها موجودی کافی دارند ✨</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Debtors Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden h-fit transition-all hover:shadow-md">
            <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3">
                <span className="text-xl">💸</span>
                لیست بدهکاران برتر
              </h4>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">Receivables</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-4 md:p-5 text-right">نام مشتری</th>
                    <th className="p-4 md:p-5 text-center">مانده بدهی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {topDebtors.filter(c => c.balance < 0).length > 0 ? topDebtors.filter(c => c.balance < 0).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <td className="p-4 md:p-5 text-right font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{c.name}</td>
                      <td className="p-4 md:p-5 text-center text-rose-600 dark:text-rose-400 font-black font-mono">{formatCurrency(Math.abs(c.balance))}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="p-12 text-center text-slate-400 dark:text-slate-600 italic font-medium">بدهکاری در سیستم ثبت نشده است ✅</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: To-Do List */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden h-fit ring-8 ring-blue-50/50 dark:ring-transparent transition-all hover:shadow-lg">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 bg-blue-600 dark:bg-slate-800/50 flex justify-between items-center text-white">
            <h4 className="text-lg md:text-xl font-black flex items-center gap-4">
              <span className="text-2xl">📝</span>
              لیست کارهای امروز
            </h4>
            <span className="text-[10px] font-black bg-white/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">High Priority</span>
          </div>
          
          <div className="p-6 md:p-10 space-y-8 md:space-y-10">
            <form onSubmit={handleAddTodo} className="relative group">
              <input 
                type="text" 
                placeholder="چه کاری باید انجام شود؟" 
                className="w-full pr-6 pl-16 py-5 md:py-6 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded-3xl outline-none dark:text-white transition-all text-base md:text-lg font-bold shadow-inner"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <button 
                type="submit" 
                className="absolute left-3 top-3 bottom-3 px-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 font-black active:scale-95 flex items-center justify-center"
              >
                ثبت
              </button>
            </form>

            <div className="space-y-5 max-h-[500px] md:max-h-[700px] overflow-auto pr-2 custom-scrollbar">
              {todos.length > 0 ? [...todos].reverse().map(todo => (
                <div 
                  key={todo.id} 
                  className={`flex items-center justify-between p-5 md:p-6 rounded-3xl border-2 transition-all group ${todo.completed ? 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent opacity-60' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm'}`}
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <button 
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500'}`}
                    >
                      {todo.completed && <span className="text-lg font-black">✓</span>}
                    </button>
                    <span className={`text-base md:text-lg font-bold truncate ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {todo.text}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-3 text-slate-300 hover:text-rose-500 transition-all md:opacity-0 md:group-hover:opacity-100 bg-slate-50 dark:bg-slate-800 rounded-xl"
                  >
                    🗑️
                  </button>
                </div>
              )) : (
                <div className="text-center py-20 opacity-40">
                  <div className="text-7xl mb-6">🏖️</div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">همه کارها انجام شده!</p>
                </div>
              )}
            </div>
          </div>
          
          {todos.length > 0 && (
            <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-6">
              <div className="flex -space-x-3 rtl:space-x-reverse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                ))}
              </div>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                {todos.filter(t => t.completed).length} مورد انجام شد • {todos.length} مورد باقی‌مانده
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
