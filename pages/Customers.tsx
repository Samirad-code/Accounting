
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">تعداد کل مشتریان</p>
            <h4 className="text-2xl font-bold">{customers.length} نفر</h4>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">👥</div>
        </div>
        <div className="bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between col-span-2">
          <div>
            <p className="text-gray-400 text-sm">مجموع کل مطالبات (طلب فروشگاه)</p>
            <h4 className="text-2xl font-bold text-red-600">{formatCurrency(totalDebts)}</h4>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl">💰</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Customer List Section */}
        <section className="flex-1 bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">🔍</span>
              <input 
                type="text" 
                placeholder="جستجوی مشتری..." 
                className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddCustomer}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + مشتری جدید
            </button>
          </div>
          <div className="max-h-[600px] overflow-auto custom-scrollbar">
            <table className="w-full text-right">
              <thead className="bg-gray-100 sticky top-0 z-10 text-xs font-bold text-gray-500">
                <tr>
                  <th className="p-4">نام مشتری</th>
                  <th className="p-4 text-center">وضعیت حساب</th>
                  <th className="p-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedCustomer(c)}
                    className={`cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{c.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{c.phone}</div>
                    </td>
                    <td className="p-4 text-center">
                      {c.balance < 0 ? (
                        <span className="text-red-600 font-bold font-mono">{formatCurrency(Math.abs(c.balance))} بدهکار</span>
                      ) : (
                        <span className="text-green-600 font-bold">تسویه</span>
                      )}
                    </td>
                    <td className="p-4 text-left">
                      <button className="text-blue-600 text-sm font-bold">نمایش دفتر ❮</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Details / Ledger Section */}
        <section className="w-full lg:w-[450px] space-y-4">
          {selectedCustomer ? (
            <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-left duration-300">
              <div className="p-6 bg-slate-800 flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold">{selectedCustomer.name}</h4>
                  <p className="text-slate-400 text-sm font-mono mt-1">{selectedCustomer.phone}</p>
                  {selectedCustomer.note && <p className="text-slate-400 text-xs mt-2 italic">{selectedCustomer.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-left">
                    <p className="text-xs text-slate-500">مانده فعلی</p>
                    <p className={`text-xl font-bold ${selectedCustomer.balance < 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {formatCurrency(Math.abs(selectedCustomer.balance))}
                    </p>
                  </div>
                  <button 
                    onClick={openEditCustomer}
                    className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
                  >
                    ✏️ ویرایش
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  📥 ثبت دریافتی جدید
                </button>

                <div className="space-y-4">
                  <h5 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-2">تاریخچه تراکنش‌ها (دفتر کل)</h5>
                  <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                    {ledger.length > 0 ? ledger.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{item.description}</p>
                            {item.originalInvoice && (
                              <button 
                                onClick={() => setViewingInvoice(item.originalInvoice!)} 
                                className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-md hover:bg-blue-800 transition-colors"
                              >
                                مشاهده فاکتور
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">{formatJalali(item.date)}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className={`text-sm font-bold font-mono ${item.type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>
                            {item.type === 'DEBIT' ? '+' : '-'}{formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-slate-600 py-8 italic">تراکنشی یافت نشد</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <span className="text-5xl mb-4">📄</span>
              <p>برای مشاهده ریز حساب و ثبت پرداختی، یک مشتری را از لیست انتخاب کنید.</p>
            </div>
          )}
        </section>
      </div>

      {/* Add/Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-blue-600 text-white p-4 font-bold flex justify-between">
              <span>{editingCustomer ? 'ویرایش اطلاعات مشتری' : 'افزودن مشتری جدید'}</span>
              <button onClick={() => setIsCustomerModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">نام و نام خانوادگی</label>
                <input required className="w-full p-2 border rounded-xl" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">شماره تماس</label>
                <input required className="w-full p-2 border rounded-xl font-mono text-left" dir="ltr" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">یادداشت</label>
                <textarea className="w-full p-2 border rounded-xl" rows={2} value={newCustomer.note} onChange={e => setNewCustomer({...newCustomer, note: e.target.value})} placeholder="آدرس یا توضیحات اضافی..." />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                {editingCustomer ? 'ذخیره تغییرات' : 'ثبت مشتری'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-green-600 text-white p-4 font-bold flex justify-between">
              <span>ثبت وجه دریافتی از {selectedCustomer.name}</span>
              <button onClick={() => setIsPaymentModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">مبلغ دریافتی (تومان)</label>
                <input required type="number" className="w-full p-2 border rounded-xl font-bold text-lg" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">روش پرداخت</label>
                <select className="w-full p-2 border rounded-xl" value={paymentData.method} onChange={e => setPaymentData({...paymentData, method: e.target.value as PaymentMethod})}>
                  <option value={PaymentMethod.CASH}>نقدی (صندوق)</option>
                  <option value={PaymentMethod.CARD}>کارت به کارت / پوز</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">توضیحات (بابت...)</label>
                <textarea className="w-full p-2 border rounded-xl" rows={2} value={paymentData.note} onChange={e => setPaymentData({...paymentData, note: e.target.value})} placeholder="مثال: بابت تسویه فاکتور شماره ۱۲۳" />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">تایید و ثبت دریافتی</button>
            </form>
          </div>
        </div>
      )}

      {/* Shared Invoice Modal */}
      <InvoiceDetailModal invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />
    </div>
  );
};

export default Customers;
