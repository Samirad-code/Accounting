
import React, { useState } from 'react';
import { db } from '../db';
import { Product, Purchase, PurchaseItem } from '../types';
import { formatCurrency, formatJalali } from '../utils';

const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>(db.getPurchases());
  const [isAdding, setIsAdding] = useState(false);
  const products = db.getProducts();

  const [newPurchase, setNewPurchase] = useState<{
    supplier: string;
    items: { productId: string; qty: number; unitCost: number }[];
    extraCost: number;
    note: string;
  }>({
    supplier: '',
    items: [{ productId: '', qty: 10, unitCost: 0 }],
    extraCost: 0,
    note: ''
  });

  const handleAddItem = () => {
    setNewPurchase({ ...newPurchase, items: [...newPurchase.items, { productId: '', qty: 1, unitCost: 0 }] });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...newPurchase.items];
    (updated[index] as any)[field] = value;
    setNewPurchase({ ...newPurchase, items: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items: PurchaseItem[] = newPurchase.items.map(i => ({
      productId: i.productId,
      productName: products.find(p => p.id === i.productId)?.name || '',
      qty: i.qty,
      unitCost: i.unitCost
    }));

    const total = items.reduce((acc, i) => acc + (i.qty * i.unitCost), 0) + newPurchase.extraCost;

    const purchase: Purchase = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      supplierName: newPurchase.supplier,
      items,
      extraCost: newPurchase.extraCost,
      totalAmount: total,
      note: newPurchase.note
    };

    db.addPurchase(purchase);
    setPurchases(db.getPurchases());
    setIsAdding(false);
    alert('سند خرید با موفقیت ثبت و موجودی به‌روزرسانی شد.');
  };

  if (isAdding) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold border-b pb-4">ثبت خرید جدید و ورود به انبار</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">نام تامین‌کننده</label>
              <input type="text" className="w-full p-3 border rounded-xl" value={newPurchase.supplier} onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">هزینه‌های جانبی (حمل و...)</label>
              <input type="number" className="w-full p-3 border rounded-xl" value={newPurchase.extraCost} onChange={e => setNewPurchase({...newPurchase, extraCost: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="p-4">محصول</th>
                  <th className="p-4 w-32 text-center">تعداد ورودی</th>
                  <th className="p-4 text-center">قیمت واحد خرید</th>
                  <th className="p-4 text-center">جمع ردیف</th>
                  <th className="p-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {newPurchase.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <select required className="w-full p-2 border rounded-lg bg-transparent" value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)}>
                        <option value="">انتخاب کالا...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <input required type="number" min="1" className="w-full p-2 border rounded-lg text-center" value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value))} />
                    </td>
                    <td className="p-4">
                      <input required type="number" className="w-full p-2 border rounded-lg text-center font-mono" value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', parseInt(e.target.value))} />
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 font-mono">{formatCurrency(item.qty * item.unitCost)}</td>
                    <td className="p-4 text-center">
                      <button type="button" onClick={() => setNewPurchase({...newPurchase, items: newPurchase.items.filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-gray-50 border-t">
              <button type="button" onClick={handleAddItem} className="text-blue-600 font-bold text-sm">+ افزودن کالا به لیست خرید</button>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200">ثبت نهایی و به‌روزرسانی انبار</button>
            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-600 px-8 rounded-xl font-bold">انصراف</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">تاریخچه خریدها و تامین کالا</h3>
        <button onClick={() => setIsAdding(true)} className="bg-slate-800 text-white px-6 py-2 rounded-xl hover:bg-slate-700 shadow-md">ثبت فاکتور خرید جدید</button>
      </div>

      <div className="grid gap-6">
        {purchases.length > 0 ? [...purchases].reverse().map(p => (
          <div key={p.id} className="border rounded-2xl p-6 bg-white hover:border-blue-200 transition-colors shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <span className="text-gray-400 text-xs">تامین‌کننده:</span>
                <h4 className="font-bold text-lg text-slate-800">{p.supplierName || 'نامشخص'}</h4>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-blue-600">{formatJalali(p.date)}</p>
                <p className="text-xs text-gray-400">کد سند: {p.id.slice(-6)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {p.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                  <span className="text-sm font-medium">{item.productName}</span>
                  <div className="text-left">
                    <span className="text-xs text-gray-400">{item.qty} عدد × </span>
                    <span className="text-sm font-bold font-mono">{formatCurrency(item.unitCost)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end items-center gap-4 border-t pt-4">
               {p.extraCost > 0 && <span className="text-xs text-orange-500 font-medium">هزینه جانبی: {formatCurrency(p.extraCost)}</span>}
               <span className="text-gray-400">جمع کل فاکتور:</span>
               <span className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(p.totalAmount)}</span>
            </div>
          </div>
        )) : (
          <div className="p-20 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed">تاریخچه خریدی ثبت نشده است</div>
        )}
      </div>
    </div>
  );
};

export default Purchases;
