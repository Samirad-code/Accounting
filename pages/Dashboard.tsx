
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
                    <span className={`text-base md:text-lg font-bold truncate dark:text-slate-300 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
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
