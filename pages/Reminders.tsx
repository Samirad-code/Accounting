
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
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <p className="text-gray-500">مدیریت سررسید چک‌ها و بدهی‌های معوقه</p>
        <div className="flex gap-4">
           <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold border border-red-100">
             {overdue.length} سررسید گذشته
           </div>
           <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold border border-blue-100">
             {pending.length} در انتظار
           </div>
        </div>
      </header>

      <section>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">🚨 سررسید گذشته</h4>
        <div className="grid gap-4">
          {overdue.length > 0 ? overdue.map(r => (
            <div key={r.id} className="bg-white border-2 border-red-100 rounded-2xl p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <h5 className="font-bold text-lg text-slate-800">{r.customerName}</h5>
                <p className="text-gray-500 text-sm">{r.message}</p>
              </div>
              <div className="text-left space-y-1">
                <p className="text-red-500 font-bold">{formatJalali(r.dueDate)}</p>
                <button className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg text-slate-600 transition-colors">تغییر وضعیت</button>
              </div>
            </div>
          )) : (
            <div className="bg-gray-50 p-10 rounded-2xl text-center text-gray-400 border border-dashed">موردی برای نمایش وجود ندارد</div>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">📅 فاکتورهای دارای بدهی (بدون یادآور)</h4>
        <div className="overflow-x-auto border rounded-xl">
           <table className="w-full text-right">
             <thead className="bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase">
               <tr>
                 <th className="p-4">شماره فاکتور</th>
                 <th className="p-4">مشتری</th>
                 <th className="p-4">مبلغ بدهی</th>
                 <th className="p-4">تاریخ فاکتور</th>
                 <th className="p-4">عملیات</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {invoicesWithDebt.map(inv => (
                 <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                   <td className="p-4 font-bold">{inv.invoiceNumber}</td>
                   <td className="p-4">{inv.customerName}</td>
                   <td className="p-4 font-bold text-red-500 font-mono">{formatCurrency(inv.remainingAmount)}</td>
                   <td className="p-4 text-gray-400">{formatJalali(inv.date)}</td>
                   <td className="p-4">
                     <button className="bg-blue-50 text-blue-600 px-4 py-1 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold">ثبت یادآوری</button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </section>
    </div>
  );
};

export default Reminders;
