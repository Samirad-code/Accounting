
import React from 'react';
import { Invoice, InvoiceType } from '../types';
import { formatCurrency, formatJalali, exportToPDF } from '../utils';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose, onDelete, onEdit }) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-6 bg-slate-800 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
              🧾 جزئیات فاکتور {invoice.invoiceNumber}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-1 font-mono">{formatJalali(invoice.date)}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">مشتری</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">{invoice.customerName || 'مشتری گذری'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">نوع فاکتور</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">{invoice.type === InvoiceType.RETAIL ? 'خرده‌فروشی' : 'عمده‌فروشی'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">وضعیت تسویه</p>
              <p className={`font-bold text-sm md:text-base ${invoice.remainingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {invoice.remainingAmount === 0 ? 'تسویه شده' : 'بدهکار'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">موعد پرداخت</p>
              <p className="font-bold text-orange-600 dark:text-orange-400 text-sm md:text-base">{invoice.dueDate ? formatJalali(invoice.dueDate) : 'ندارد'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm min-w-[500px]">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">نام کالا</th>
                    <th className="p-3 text-center">تعداد</th>
                    <th className="p-3 text-center">قیمت واحد</th>
                    <th className="p-3 text-center">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 text-slate-500 dark:text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{item.productName}</td>
                      <td className="p-3 text-center font-mono">{item.qty}</td>
                      <td className="p-3 text-center font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">{formatCurrency(item.qty * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border dark:border-slate-700 space-y-3">
            <div className="flex justify-between text-xs md:text-sm text-slate-600 dark:text-slate-400">
              <span>جمع کل کالاها:</span>
              <span className="font-mono">{formatCurrency(invoice.items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0))}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm text-orange-600 dark:text-orange-400">
              <span>تخفیف:</span>
              <span className="font-mono">{formatCurrency(invoice.discountTotal)}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 border-t dark:border-slate-700 pt-3">
              <span>مبلغ قابل پرداخت:</span>
              <span className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm text-green-600 dark:text-green-400">
              <span>پرداخت شده:</span>
              <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base font-bold text-red-500 dark:text-red-400 border-t dark:border-slate-700 pt-3">
              <span>مانده حساب (بدهی):</span>
              <span className="font-mono">{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            {onDelete && (
              <button 
                onClick={() => {
                  if (window.confirm('آیا از حذف این فاکتور مطمئن هستید؟ این عمل باعث بازگشت موجودی به انبار و اصلاح حساب مشتری می‌شود.')) {
                    onDelete(invoice.id);
                  }
                }}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
              >
                🗑️ حذف فاکتور
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(invoice.id)}
                className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm"
              >
                ✏️ ویرایش
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => exportToPDF(`invoice-${invoice.id}`, `invoice-${invoice.invoiceNumber}`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm md:text-base"
            >
              🖨️ چاپ فاکتور
            </button>
            <button 
              onClick={onClose}
              className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border dark:border-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors text-sm md:text-base"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
