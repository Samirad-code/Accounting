import React, { useState } from 'react';
import { db } from '../db';
import { Reminder, ReminderStatus, Invoice } from '../types';
import { formatCurrency, formatJalali } from '../utils';
import JalaliDatePicker from '../components/JalaliDatePicker';

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(db.getReminders());
  const invoicesWithDebt = db.getInvoices().filter(inv => inv.remainingAmount > 0 && inv.status === 'ACTIVE');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString());
  const [message, setMessage] = useState<string>('');

  const overdue = reminders.filter(r => new Date(r.dueDate) < new Date() && r.status === ReminderStatus.PENDING);
  const pending = reminders.filter(r => new Date(r.dueDate) >= new Date() && r.status === ReminderStatus.PENDING);
  const completed = reminders.filter(r => r.status === ReminderStatus.DISMISSED);

  const openAddModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedCustomerId(invoice.customerId || '');
    setSelectedInvoiceId(invoice.id);
    setCustomerSearch(invoice.customerName || '');
    setDueDate(new Date().toISOString());
    setMessage(`پیگیری سررسید بدهی فاکتور ${invoice.invoiceNumber}`);
    setIsAddModalOpen(true);
  };

  const openManualAddModal = () => {
    setSelectedInvoice(null);
    setSelectedCustomerId('');
    setSelectedInvoiceId('');
    setCustomerSearch('');
    setDueDate(new Date().toISOString());
    setMessage('');
    setIsAddModalOpen(true);
  };

  const handleSubmitReminder = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find customer details
    const customer = db.getCustomers().find(c => c.id === selectedCustomerId);
    if (!customer) {
      alert('لطفاً یک مشتری را انتخاب کنید.');
      return;
    }

    const linkedInvoice = db.getInvoices().find(inv => inv.id === selectedInvoiceId);

    const newReminder: Reminder = {
      id: 'rem-' + Date.now(),
      customerId: customer.id,
      customerName: customer.name,
      dueDate,
      invoiceId: linkedInvoice ? linkedInvoice.id : undefined,
      message: message || (linkedInvoice ? `پیگیری سررسید فاکتور ${linkedInvoice.invoiceNumber}` : `پیگیری یادآوری مشتری ${customer.name}`),
      status: ReminderStatus.PENDING
    };

    db.addReminder(newReminder);
    setReminders(db.getReminders());
    setIsAddModalOpen(false);
    setSelectedCustomerId('');
    setSelectedInvoiceId('');
    setSelectedInvoice(null);
    setMessage('');
  };

  const handleToggleStatus = (id: string, currentStatus: ReminderStatus) => {
    const nextStatus = currentStatus === ReminderStatus.PENDING ? ReminderStatus.DISMISSED : ReminderStatus.PENDING;
    db.updateReminderStatus(id, nextStatus);
    setReminders(db.getReminders());
  };

  const handleDeleteReminder = (id: string) => {
    if (window.confirm('آیا از حذف این یادآور مطمئن هستید؟')) {
      db.deleteReminder(id);
      setReminders(db.getReminders());
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">یادآورها و سررسیدها</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">مدیریت چک‌ها، بدهی‌های معوقه و پیگیری مشتریان</p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-wrap gap-3 flex-1 lg:flex-none">
            <div className="flex-1 lg:flex-none bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-800 shadow-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              {overdue.length} سررسید گذشته
            </div>
            <div className="flex-1 lg:flex-none bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {pending.length} در انتظار
            </div>
            <div className="flex-1 lg:flex-none bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50 shadow-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              {completed.length} تسویه شده
            </div>
          </div>
          <button
            onClick={openManualAddModal}
            className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>➕ ثبت یادآوری دستی</span>
          </button>
        </div>
      </header>

      {/* Overdue Section */}
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleStatus(r.id, r.status)}
                    className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white px-3 py-2 rounded-xl transition-all active:scale-95 border border-emerald-100 dark:border-emerald-800/30"
                  >
                    ✔️ تسویه شد
                  </button>
                  <button 
                    onClick={() => handleDeleteReminder(r.id)}
                    className="text-xs p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
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

      {/* Pending Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">یادآورهای فعال در انتظار</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pending.length > 0 ? pending.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col justify-between gap-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-xl text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{r.customerName}</h5>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg uppercase tracking-widest">فعال</span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold leading-relaxed">{r.message}</p>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">تاریخ سررسید</span>
                  <p className="text-blue-600 dark:text-blue-400 font-black font-mono">{formatJalali(r.dueDate)}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleStatus(r.id, r.status)}
                    className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white px-3 py-2 rounded-xl transition-all active:scale-95 border border-emerald-100 dark:border-emerald-800/30"
                  >
                    ✔️ تسویه شد
                  </button>
                  <button 
                    onClick={() => handleDeleteReminder(r.id)}
                    className="text-xs p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-slate-50/50 dark:bg-slate-800/30 p-16 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
              <span className="text-5xl mb-4 opacity-10 block">📅</span>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">موردی برای نمایش وجود ندارد</p>
            </div>
          )}
        </div>
      </section>

      {/* Completed Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✔️</span>
          <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">سررسیدهای تسویه و بایگانی شده</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completed.length > 0 ? completed.map(r => (
            <div key={r.id} className="bg-slate-50/30 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col justify-between gap-6 opacity-75 hover:opacity-100 transition-all group">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h5 className="font-black text-xl text-slate-600 dark:text-slate-400 line-through">{r.customerName}</h5>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg uppercase tracking-widest">تسویه شده</span>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-medium leading-relaxed">{r.message}</p>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">سررسید فاکتور</span>
                  <p className="text-slate-500 dark:text-slate-400 font-bold font-mono">{formatJalali(r.dueDate)}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleStatus(r.id, r.status)}
                    className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-all active:scale-95"
                  >
                    ↩️ بازگردانی
                  </button>
                  <button 
                    onClick={() => handleDeleteReminder(r.id)}
                    className="text-xs p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-slate-50/50 dark:bg-slate-800/30 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">یادآور تسویه شده‌ای یافت نشد</p>
            </div>
          )}
        </div>
      </section>

      {/* Debt Invoices List Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
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
                    <button 
                      onClick={() => openAddModal(inv)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-blue-500/10"
                    >
                      ثبت یادآوری
                    </button>
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

      {/* Add Reminder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ثبت یادآوری جدید</h3>
              <button 
                onClick={() => { 
                  setIsAddModalOpen(false); 
                  setSelectedInvoice(null); 
                  setSelectedCustomerId('');
                  setSelectedInvoiceId('');
                }} 
                className="text-2xl text-slate-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitReminder} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">مشتری</label>
                {selectedInvoice ? (
                  <input 
                    disabled 
                    type="text" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400"
                    value={selectedInvoice.customerName || 'مشتری گذری'}
                  />
                ) : (
                  <div className="relative">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        placeholder="جستجوی نام یا تلفن مشتری..."
                        className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 dark:text-white text-sm"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                      />
                      {selectedCustomerId && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl text-xs flex items-center gap-1 shrink-0 font-black">
                          <span>✓ انتخاب شده</span>
                        </div>
                      )}
                    </div>
                    
                    {isCustomerDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {db.getCustomers().filter(c =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.phone.includes(customerSearch)
                        ).length > 0 ? (
                          db.getCustomers().filter(c =>
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.phone.includes(customerSearch)
                          ).map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearch(c.name);
                                setIsCustomerDropdownOpen(false);
                                setSelectedInvoiceId('');
                              }}
                              className={`w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex justify-between items-center ${selectedCustomerId === c.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                              <span className="text-slate-800 dark:text-slate-200">{c.name}</span>
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">{c.phone}</span>
                            </button>
                          ))
                        ) : (
                          <p className="p-3 text-xs text-slate-400 text-center">مشتری یافت نشد.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomerId && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">فاکتور مرجع (اختیاری)</label>
                  {selectedInvoice ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input 
                          disabled 
                          type="text" 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400"
                          value={`#${selectedInvoice.invoiceNumber}`}
                        />
                      </div>
                      <div>
                        <input 
                          disabled 
                          type="text" 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700 rounded-xl text-sm font-black text-rose-500 font-mono text-center"
                          value={formatCurrency(selectedInvoice.remainingAmount)}
                        />
                      </div>
                    </div>
                  ) : (
                    <select
                      className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 dark:text-white text-xs font-bold"
                      value={selectedInvoiceId}
                      onChange={(e) => {
                        const invId = e.target.value;
                        setSelectedInvoiceId(invId);
                        if (invId) {
                          const inv = db.getInvoices().find(i => i.id === invId);
                          if (inv) {
                            setMessage(`پیگیری سررسید فاکتور ${inv.invoiceNumber} به مبلغ ${formatCurrency(inv.totalAmount)}`);
                          }
                        } else {
                          setMessage('');
                        }
                      }}
                    >
                      <option value="">-- بدون فاکتور مرجع --</option>
                      {db.getInvoices().filter(inv => inv.customerId === selectedCustomerId && inv.status === 'ACTIVE').map(inv => (
                        <option key={inv.id} value={inv.id}>
                          فاکتور #{inv.invoiceNumber} | تاریخ {formatJalali(inv.date)} | مانده {formatCurrency(inv.remainingAmount)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">تاریخ سررسید یادآوری</label>
                <JalaliDatePicker 
                  label="" 
                  value={dueDate} 
                  onChange={(val) => setDueDate(val)} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">یادداشت / پیام یادآور</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 dark:text-white text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="مثال: سررسید چک یا بدهی خرید پلاستیک..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all text-sm cursor-pointer">
                  ثبت یادآوری
                </button>
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsAddModalOpen(false); 
                    setSelectedInvoice(null); 
                    setSelectedCustomerId('');
                    setSelectedInvoiceId('');
                  }} 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
