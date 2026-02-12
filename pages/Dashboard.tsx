
// Add React import to fix 'Cannot find namespace React' errors
import React, { useState } from 'react';
import { db } from '../db';
import { Todo } from '../types';
import { formatCurrency, getStockStatusColor } from '../utils';

const Dashboard: React.FC = () => {
  const products = db.getProducts();
  const invoices = db.getInvoices();
  const customers = db.getCustomers();
  const [todos, setTodos] = useState<Todo[]>(db.getTodos());
  const [newTodo, setNewTodo] = useState('');

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 md:p-6 rounded-3xl text-white shadow-xl shadow-blue-500/10">
          <p className="text-blue-100 text-[10px] md:text-xs font-bold uppercase tracking-wider">مجموع فروش کل</p>
          <h3 className="text-xl md:text-2xl font-black mt-1 md:mt-2">{formatCurrency(totalSales)}</h3>
          <p className="text-[10px] mt-3 md:mt-4 opacity-70">گزارش تجمعی سیستم</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 md:p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/10">
          <p className="text-emerald-100 text-[10px] md:text-xs font-bold uppercase tracking-wider">سود تخمینی</p>
          <h3 className="text-xl md:text-2xl font-black mt-1 md:mt-2">{formatCurrency(totalProfit)}</h3>
          <p className="text-[10px] mt-3 md:mt-4 opacity-70">بر اساس بهای تمام شده</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 md:p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/10">
          <p className="text-indigo-100 text-[10px] md:text-xs font-bold uppercase tracking-wider">فاکتورهای صادر شده</p>
          <h3 className="text-xl md:text-2xl font-black mt-1 md:mt-2">{invoices.length} عدد</h3>
          <p className="text-[10px] mt-3 md:mt-4 opacity-70">تاریخچه کامل فروش</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 p-5 md:p-6 rounded-3xl text-white shadow-xl shadow-rose-500/10">
          <p className="text-rose-100 text-[10px] md:text-xs font-bold uppercase tracking-wider">هشدار موجودی</p>
          <h3 className="text-xl md:text-2xl font-black mt-1 md:mt-2">{lowStockProducts.length} کالا</h3>
          <p className="text-[10px] mt-3 md:mt-4 opacity-70">نیاز به شارژ انبار</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Low Stock & Debtors */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 md:space-y-8">
          
          {/* Low Stock Table */}
          <section className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h4 className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                ⚠️ کالاهای زیر حد نصاب موجودی
              </h4>
              <span className="text-[9px] md:text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">Critical</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold border-b dark:border-slate-800">
                  <tr>
                    <th className="p-3 md:p-4 text-right">نام کالا</th>
                    <th className="p-3 md:p-4 text-center">موجودی</th>
                    <th className="p-3 md:p-4 text-center">حداقل</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 md:p-4 text-right font-bold text-slate-700 dark:text-slate-300 text-xs md:text-sm">{p.name}</td>
                      <td className={`p-3 md:p-4 text-center ${getStockStatusColor(p.quantity, p.lowStockThreshold)}`}>{p.quantity}</td>
                      <td className="p-3 md:p-4 text-center text-gray-400 dark:text-slate-600 font-mono text-xs">{p.lowStockThreshold}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-8 md:p-12 text-center text-gray-400 dark:text-slate-600 italic text-xs">تمامی کالاها موجودی کافی دارند</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Debtors Table */}
          <section className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h4 className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                💸 لیست بدهکاران برتر
              </h4>
              <span className="text-[9px] md:text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">Receivables</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold border-b dark:border-slate-800">
                  <tr>
                    <th className="p-3 md:p-4 text-right">نام مشتری</th>
                    <th className="p-3 md:p-4 text-center">مانده</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {topDebtors.filter(c => c.balance < 0).length > 0 ? topDebtors.filter(c => c.balance < 0).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="p-3 md:p-4 text-right font-bold text-slate-700 dark:text-slate-300 text-xs md:text-sm group-hover:text-blue-600 transition-colors">{c.name}</td>
                      <td className="p-3 md:p-4 text-center text-rose-600 dark:text-rose-400 font-black font-mono text-xs md:text-sm">{formatCurrency(Math.abs(c.balance))}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="p-8 md:p-12 text-center text-gray-400 dark:text-slate-600 italic text-xs">بدهکاری در سیستم ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: To-Do List (Enlarged for Desktop) */}
        <section className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-sm flex flex-col overflow-hidden h-fit ring-4 ring-blue-50/30 dark:ring-transparent">
          <div className="p-5 md:p-6 border-b dark:border-slate-800 bg-blue-600 dark:bg-slate-800/50 flex justify-between items-center text-white">
            <h4 className="text-sm md:text-base font-black flex items-center gap-3">
              <span className="text-xl">📝</span>
              لیست کارهای امروز
            </h4>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">High Priority</span>
          </div>
          
          <div className="p-5 md:p-8 space-y-6 md:space-y-8">
            <form onSubmit={handleAddTodo} className="relative">
              <input 
                type="text" 
                placeholder="چه کاری باید انجام شود؟" 
                className="w-full pr-5 pl-14 py-4 md:py-5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none dark:text-white transition-all text-sm md:text-base font-medium shadow-inner"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
              />
              <button 
                type="submit" 
                className="absolute left-3 top-2 bottom-2 px-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 font-bold active:scale-90"
              >
                ثبت
              </button>
            </form>

            <div className="space-y-4 max-h-[450px] md:max-h-[600px] overflow-auto pr-1 custom-scrollbar">
              {todos.length > 0 ? [...todos].reverse().map(todo => (
                <div 
                  key={todo.id} 
                  className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border-2 transition-all group ${todo.completed ? 'bg-gray-50/50 dark:bg-slate-800/30 border-transparent opacity-60' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm'}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button 
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-gray-200 dark:border-slate-700 hover:border-blue-500'}`}
                    >
                      {todo.completed && '✓'}
                    </button>
                    <span className={`text-sm md:text-base font-bold truncate dark:text-slate-300 ${todo.completed ? 'line-through text-gray-400' : 'text-slate-700'}`}>
                      {todo.text}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-all md:opacity-0 md:group-hover:opacity-100 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  >
                    🗑️
                  </button>
                </div>
              )) : (
                <div className="text-center py-16 opacity-30">
                  <div className="text-6xl mb-4">🏖️</div>
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">همه کارها انجام شده!</p>
                </div>
              )}
            </div>
          </div>
          
          {todos.length > 0 && (
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-center items-center gap-4">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-blue-400 border-2 border-white dark:border-slate-900"></div>
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
