
import React, { useState } from 'react';
import { db } from '../db';
import { Reminder, ReminderStatus } from '../types';
import { formatCurrency, formatJalali } from '../utils';

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(db.getReminders());
  const invoicesWithDebt = db.getInvoices().filter(inv => inv.remainingAmount > 0 && inv.status === 'ACTIVE');

  const getRemindersByStatus = (status: ReminderStatus) => {
    return reminders.filter(r => r.status === status);
  };

  const overdue = reminders.filter(r => new Date(r.dueDate) < new Date() && r.status === ReminderStatus.PENDING);
  const pending = reminders.filter(r => new Date(r.dueDate) >= new Date() && r.status === ReminderStatus.PENDING);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">یادآورها و سررسیدها</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">مدیریت چک‌ها، بدهی‌های معوقه و پیگیری مشتریان</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <div className="flex-1 md:flex-none bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 dark:border-rose-800 shadow-sm flex items-center justify-center gap-2">
             <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
             {overdue.length} سررسید گذشته
           </div>
           <div className="flex-1 md:flex-none bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm flex items-center justify-center gap-2">
             <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
             {pending.length} در انتظار
           </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">سررسیدهای گذشته و فوری</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {overdue.length > 0 ? overdue.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 rounded-[2rem] p-8 flex flex-col justify-between gap-6 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-xl text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">{r.customerName}</h5>
                  <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1 rounded-lg uppercase tracking-widest">فوری</span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold leading-relaxed">{r.message}</p>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">تاریخ سررسید</span>
                  <p className="text-rose-600 dark:text-rose-400 font-black font-mono">{formatJalali(r.dueDate)}</p>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-800 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 px-4 py-2 rounded-xl transition-all active:scale-95">تغییر وضعیت</button>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-slate-50/50 dark:bg-slate-800/30 p-16 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
              <span className="text-5xl mb-4 opacity-10 block">✅</span>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">موردی برای نمایش وجود ندارد</p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">فاکتورهای دارای بدهی</h4>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">نمایش فاکتورهایی که هنوز تسویه نشده‌اند</p>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-right">
             <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest">
               <tr>
                 <th className="p-6">شماره فاکتور</th>
                 <th className="p-6">مشتری</th>
                 <th className="p-6 text-center">مبلغ بدهی</th>
                 <th className="p-6 text-center">تاریخ فاکتور</th>
                 <th className="p-6 text-left">عملیات</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
               {invoicesWithDebt.map(inv => (
                 <tr key={inv.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                   <td className="p-6 font-black text-slate-800 dark:text-slate-200">#{inv.invoiceNumber}</td>
                   <td className="p-6">
                     <div className="font-bold text-slate-700 dark:text-slate-300">{inv.customerName}</div>
                   </td>
                   <td className="p-6 text-center font-black font-mono text-rose-600 dark:text-rose-400">{formatCurrency(inv.remainingAmount)}</td>
                   <td className="p-6 text-center">
                     <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">{formatJalali(inv.date)}</span>
                   </td>
                   <td className="p-6 text-left">
                     <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-500/10">ثبت یادآوری</button>
                   </td>
                 </tr>
               ))}
               {invoicesWithDebt.length === 0 && (
                 <tr>
                   <td colSpan={5} className="p-24 text-center">
                     <div className="flex flex-col items-center justify-center text-slate-400">
                       <span className="text-6xl mb-4 opacity-10">🎉</span>
                       <p className="text-sm font-black uppercase tracking-widest italic">تمامی فاکتورها تسویه شده‌اند</p>
                     </div>
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </section>
    </div>
  );
};

export default Reminders;
