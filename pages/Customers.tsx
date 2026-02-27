
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Customer, Payment, PaymentMethod, Invoice } from '../types';
import { formatCurrency, formatJalali } from '../utils';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Form states
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', note: '' });
  const [paymentData, setPaymentData] = useState({ amount: 0, method: PaymentMethod.CASH, note: '' });

  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  const totalDebts = useMemo(() => 
    customers.reduce((acc, c) => acc + (c.balance < 0 ? Math.abs(c.balance) : 0), 0)
  , [customers]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setNewCustomer({ name: '', phone: '', note: '' });
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditingCustomer(selectedCustomer);
    setNewCustomer({ name: selectedCustomer.name, phone: selectedCustomer.phone, note: selectedCustomer.note || '' });
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      db.updateCustomer(editingCustomer.id, newCustomer);
      const updated = db.getCustomers().find(c => c.id === editingCustomer.id);
      if (updated && selectedCustomer?.id === updated.id) setSelectedCustomer(updated);
    } else {
      const customer: Customer = {
        id: 'c' + Date.now(),
        ...newCustomer,
        balance: 0
      };
      db.addCustomer(customer);
    }
    setCustomers(db.getCustomers());
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    setNewCustomer({ name: '', phone: '', note: '' });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const payment: Payment = {
      id: 'p' + Date.now(),
      customerId: selectedCustomer.id,
      date: new Date().toISOString(),
      amount: paymentData.amount,
      method: paymentData.method,
      note: paymentData.note
    };

    db.addPayment(payment);
    setCustomers(db.getCustomers());
    
    // Update the selected customer view
    const updated = db.getCustomers().find(c => c.id === selectedCustomer.id);
    if (updated) setSelectedCustomer(updated);
    
    setIsPaymentModalOpen(false);
    setPaymentData({ amount: 0, method: PaymentMethod.CASH, note: '' });
  };

  const handleDeleteInvoice = (id: string) => {
    db.deleteInvoice(id);
    setCustomers(db.getCustomers());
    setViewingInvoice(null);
    // Refresh selected customer to update balance/ledger
    if (selectedCustomer) {
      const updated = db.getCustomers().find(c => c.id === selectedCustomer.id);
      setSelectedCustomer(updated || null);
    }
  };

  // Combine invoices and payments for the selected customer to show a ledger
  const ledger = useMemo(() => {
    if (!selectedCustomer) return [];
    const customerInvoices = db.getInvoices().filter(inv => inv.customerId === selectedCustomer.id);
    const customerPayments = db.getPayments().filter(p => p.customerId === selectedCustomer.id);

    const items = [
      ...customerInvoices.map(inv => ({
        id: inv.id,
        date: inv.date,
        description: `فاکتور شماره ${inv.invoiceNumber}`,
        amount: inv.totalAmount,
        type: 'DEBIT' as const, // Customer owes more
        originalInvoice: inv
      })),
      ...customerPayments.map(p => ({
        id: p.id,
        date: p.date,
        description: `دریافتی - ${p.note || (p.method === PaymentMethod.CASH ? 'نقدی' : 'کارت')}`,
        amount: p.amount,
        type: 'CREDIT' as const, // Customer owes less
        originalInvoice: undefined
      }))
    ];

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer]);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">مدیریت مشتریان</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">لیست کامل مشتریان و وضعیت بدهی‌ها</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">💰</div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">مجموع کل مطالبات</p>
            <h4 className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(totalDebts)}</h4>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Customer List Section */}
        <section className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative flex-1 w-full group">
              <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
              <input 
                type="text" 
                placeholder="جستجوی نام یا شماره تماس..." 
                className="w-full pr-12 pl-4 py-4 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none bg-white dark:bg-slate-900 dark:text-white shadow-sm transition-all font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddCustomer}
              className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 font-black flex items-center justify-center gap-3 active:scale-95"
            >
              + مشتری جدید
            </button>
          </div>
          <div className="max-h-[600px] overflow-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="p-6">نام مشتری</th>
                  <th className="p-6 text-center">وضعیت حساب</th>
                  <th className="p-6 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredCustomers.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCustomer(c)}
                    className={`cursor-pointer transition-all group ${selectedCustomer?.id === c.id ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}
                  >
                    <td className="p-6">
                      <div className={`font-black text-base transition-colors ${selectedCustomer?.id === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-blue-600'}`}>{c.name}</div>
                      <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 font-mono">{c.phone}</div>
                    </td>
                    <td className="p-6 text-center">
                      {c.balance < 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl uppercase tracking-widest">بدهکار</span>
                          <span className="text-sm font-black text-rose-500 font-mono">{formatCurrency(Math.abs(c.balance))}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl uppercase tracking-widest">تسویه شده</span>
                      )}
                    </td>
                    <td className="p-6 text-left">
                      <span className={`text-xs font-black transition-all flex items-center justify-end gap-2 ${selectedCustomer?.id === c.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`}>
                        نمایش دفتر 
                        <span className="text-lg">❮</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Details / Ledger Section */}
        <section className="w-full lg:w-[500px] space-y-6">
          {selectedCustomer ? (
            <div className="bg-slate-900 text-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-left duration-500 border border-slate-800">
              <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 flex justify-between items-start border-b border-slate-700/50">
                <div>
                  <h4 className="text-2xl font-black">{selectedCustomer.name}</h4>
                  <p className="text-slate-400 text-sm font-mono mt-2 tracking-wider">{selectedCustomer.phone}</p>
                  {selectedCustomer.note && (
                    <div className="mt-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">یادداشت</p>
                      <p className="text-slate-300 text-xs italic leading-relaxed">{selectedCustomer.note}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="text-left bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 shadow-inner">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">مانده فعلی</p>
                    <p className={`text-2xl font-black font-mono ${selectedCustomer.balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(Math.abs(selectedCustomer.balance))}
                    </p>
                  </div>
                  <button 
                    onClick={openEditCustomer}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all border border-slate-700 active:scale-95"
                  >
                    <span>✏️</span>
                    <span>ویرایش</span>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/40 active:scale-[0.98]"
                >
                  <span className="text-2xl">📥</span>
                  <span>ثبت دریافتی جدید</span>
                </button>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">تاریخچه تراکنش‌ها (دفتر کل)</h5>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-1 rounded-lg">{ledger.length} مورد</span>
                  </div>
                  <div className="space-y-4 max-h-[450px] overflow-auto pr-2 custom-scrollbar">
                    {ledger.length > 0 ? ledger.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors group">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-slate-200">{item.description}</p>
                            {item.originalInvoice && (
                              <button 
                                onClick={() => setViewingInvoice(item.originalInvoice!)} 
                                className="text-[10px] font-black text-blue-400 bg-blue-900/30 px-3 py-1 rounded-lg hover:bg-blue-800 transition-all active:scale-90"
                              >
                                مشاهده فاکتور
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 font-mono">{formatJalali(item.date)}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className={`text-base font-black font-mono ${item.type === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {item.type === 'DEBIT' ? '+' : '-'}{formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                        <span className="text-4xl mb-4 opacity-20">📭</span>
                        <p className="text-xs font-bold italic">تراکنشی یافت نشد</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-50 dark:bg-slate-900/50 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center animate-pulse">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner">📄</div>
              <h5 className="text-xl font-black text-slate-400 dark:text-slate-600 mb-2">انتخاب مشتری</h5>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-600 max-w-[250px] leading-relaxed">برای مشاهده ریز حساب و ثبت پرداختی، یک مشتری را از لیست انتخاب کنید.</p>
            </div>
          )}
        </section>
      </div>

      {/* Add/Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="bg-blue-600 text-white p-8 font-black text-xl flex justify-between items-center">
              <span>{editingCustomer ? 'ویرایش اطلاعات مشتری' : 'افزودن مشتری جدید'}</span>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">نام و نام خانوادگی:</label>
                <input 
                  required 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-blue-500 outline-none transition-all font-bold" 
                  value={newCustomer.name} 
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">شماره تماس:</label>
                <input 
                  required 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl font-mono text-left bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-blue-500 outline-none transition-all" 
                  dir="ltr" 
                  value={newCustomer.phone} 
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">یادداشت:</label>
                <textarea 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-blue-500 outline-none transition-all font-bold" 
                  rows={3} 
                  value={newCustomer.note} 
                  onChange={e => setNewCustomer({...newCustomer, note: e.target.value})} 
                  placeholder="آدرس یا توضیحات اضافی..." 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                {editingCustomer ? 'ذخیره تغییرات' : 'ثبت مشتری'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="bg-emerald-600 text-white p-8 font-black text-xl flex justify-between items-center">
              <span>ثبت وجه دریافتی</span>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 mb-2">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">مشتری:</p>
                <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">{selectedCustomer.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">مبلغ دریافتی (تومان):</label>
                <input 
                  required 
                  type="number" 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl font-black text-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-emerald-500 outline-none transition-all font-mono" 
                  value={paymentData.amount} 
                  onChange={e => setPaymentData({...paymentData, amount: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">روش پرداخت:</label>
                <select 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-emerald-500 outline-none transition-all font-bold" 
                  value={paymentData.method} 
                  onChange={e => setPaymentData({...paymentData, method: e.target.value as PaymentMethod})}
                >
                  <option value={PaymentMethod.CASH}>نقدی (صندوق)</option>
                  <option value={PaymentMethod.CARD}>کارت به کارت / پوز</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">توضیحات:</label>
                <textarea 
                  className="w-full p-4 border-2 border-slate-50 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-emerald-500 outline-none transition-all font-bold" 
                  rows={2} 
                  value={paymentData.note} 
                  onChange={e => setPaymentData({...paymentData, note: e.target.value})} 
                  placeholder="مثال: بابت تسویه فاکتور شماره ۱۲۳" 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-[0.98]"
              >
                تایید و ثبت دریافتی
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shared Invoice Modal */}
      <InvoiceDetailModal 
        invoice={viewingInvoice} 
        onClose={() => setViewingInvoice(null)} 
        onDelete={handleDeleteInvoice}
      />
    </div>
  );
};

export default Customers;
