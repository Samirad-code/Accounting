import React, { useState } from 'react';
import { db } from '../db';
import { Product, Purchase, PurchaseItem } from '../types';
import { formatCurrency, formatJalali } from '../utils';
import JalaliDatePicker from '../components/JalaliDatePicker';
import SearchableProductSelect from '../components/SearchableProductSelect';

const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>(db.getPurchases());
  const [isAdding, setIsAdding] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const products = db.getProducts();

  const [newPurchase, setNewPurchase] = useState<{
    date: string;
    supplier: string;
    items: { productId: string; qty: number; unitCost: number }[];
    extraCost: number;
    note: string;
  }>({
    date: new Date().toISOString(),
    supplier: '',
    items: [{ productId: '', qty: 1, unitCost: 0 }],
    extraCost: 0,
    note: ''
  });

  const handleOpenAdd = () => {
    setNewPurchase({
      date: new Date().toISOString(),
      supplier: '',
      items: [{ productId: '', qty: 1, unitCost: 0 }],
      extraCost: 0,
      note: ''
    });
    setEditingPurchaseId(null);
    setIsAdding(true);
  };

  const handleEditClick = (p: Purchase) => {
    setNewPurchase({
      date: p.date,
      supplier: p.supplierName || '',
      items: p.items.map(i => ({ productId: i.productId, qty: i.qty, unitCost: i.unitCost })),
      extraCost: p.extraCost || 0,
      note: p.note || ''
    });
    setEditingPurchaseId(p.id);
    setIsAdding(true);
  };

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

    if (items.some(i => !i.productId)) {
       alert("لطفا کالا را انتخاب کنید");
       return;
    }

    const total = items.reduce((acc, i) => acc + (i.qty * i.unitCost), 0) + newPurchase.extraCost;

    const purchase: Purchase = {
      id: editingPurchaseId || Date.now().toString(),
      date: newPurchase.date,
      supplierName: newPurchase.supplier,
      items,
      extraCost: newPurchase.extraCost,
      totalAmount: total,
      note: newPurchase.note
    };

    if (editingPurchaseId) {
        try {
            db.updatePurchase(editingPurchaseId, purchase);
            alert('تغییرات با موفقیت ذخیره شد.');
        } catch (err: any) {
            alert(err.message);
            return;
        }
    } else {
        db.addPurchase(purchase);
        alert('سند خرید با موفقیت ثبت و موجودی به‌روزرسانی شد.');
    }
    
    setPurchases(db.getPurchases());
    setIsAdding(false);
    setEditingPurchaseId(null);
  };

  if (isAdding) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h3 className="text-xl font-bold border-b dark:border-slate-800 pb-4 text-slate-800 dark:text-white">
          {editingPurchaseId ? 'ویرایش فاکتور خرید' : 'ثبت خرید جدید و ورود به انبار'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border dark:border-slate-700">
            <div>
              <JalaliDatePicker 
                label="تاریخ فاکتور"
                className="w-full [&>div]:p-3 [&>div]:border [&>div]:rounded-xl [&>div]:bg-white [&>div]:dark:bg-slate-800 [&>div]:dark:border-slate-700"
                value={newPurchase.date}
                onChange={val => setNewPurchase({ ...newPurchase, date: val })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 px-1">نام تامین‌کننده</label>
              <input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={newPurchase.supplier} onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 px-1">هزینه‌های جانبی (حمل و...)</label>
              <input type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={newPurchase.extraCost} onChange={e => setNewPurchase({...newPurchase, extraCost: parseInt(e.target.value) || 0})} />
            </div>
          </div>

          <div className="border dark:border-slate-700 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            <div className="overflow-x-auto pb-[150px]">
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-slate-700 text-white text-sm">
                  <tr>
                    <th className="p-4 rounded-tr-2xl">محصول</th>
                    <th className="p-4 w-32 text-center">تعداد ورودی</th>
                    <th className="p-4 text-center">قیمت واحد خرید</th>
                    <th className="p-4 text-center">جمع ردیف</th>
                    <th className="p-4 w-16 rounded-tl-2xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                  {newPurchase.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <SearchableProductSelect 
                          value={item.productId}
                          onChange={val => handleItemChange(idx, 'productId', val)}
                          products={products}
                        />
                      </td>
                      <td className="p-4">
                        <input required type="number" min="1" className="w-full p-2.5 border dark:border-slate-700 rounded-lg text-center bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-4">
                        <input required type="number" min="0" className="w-full p-2.5 border dark:border-slate-700 rounded-lg text-center font-mono bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', parseInt(e.target.value) || 0)} />
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(item.qty * item.unitCost)}</td>
                      <td className="p-4 text-center">
                        <button type="button" onClick={() => setNewPurchase({...newPurchase, items: newPurchase.items.filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600 text-xl font-bold bg-red-50 dark:bg-red-900/20 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-700 rounded-b-2xl">
              <button type="button" onClick={handleAddItem} className="text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline flex items-center gap-1"><span>➕</span> افزودن کالا به لیست</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t dark:border-slate-800">
            <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg active:scale-95">
              {editingPurchaseId ? 'ذخیره تغییرات فاکتور' : 'ثبت نهایی و ورود به انبار'}
            </button>
            <button type="button" onClick={() => { setIsAdding(false); setEditingPurchaseId(null); }} className="bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-8 py-4 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">انصراف</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">تاریخچه خریدها و تامین کالا</h3>
        <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold flex items-center gap-2 transition-transform active:scale-95">
          <span>➕</span> ثبت فاکتور خرید جدید
        </button>
      </div>

      <div className="grid gap-6">
        {purchases.length > 0 ? [...purchases].reverse().map(p => (
          <div key={p.id} className="border dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors shadow-sm group">
            <div className="flex justify-between items-center mb-5 border-b dark:border-slate-800 pb-5">
              <div>
                <span className="text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">تامین‌کننده</span>
                <h4 className="font-bold text-lg md:text-xl text-slate-800 dark:text-white mt-1">{p.supplierName || 'نامشخص'}</h4>
              </div>
              <div className="text-left flex flex-col items-end gap-2">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">{formatJalali(p.date)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">کد: {p.id.slice(-6)}</span>
                  <button 
                    onClick={() => handleEditClick(p)}
                    className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded md:opacity-0 md:group-hover:opacity-100 transition-opacity font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    title="ویرایش فاکتور خرید"
                  >
                    ✏️ ویرایش
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {p.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl flex justify-between items-center border border-gray-100 dark:border-slate-700/50">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.productName}</span>
                  <div className="text-left">
                    <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{item.qty} عدد × </span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{formatCurrency(item.unitCost)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-end items-end sm:items-center gap-4 border-t dark:border-slate-800 pt-5">
               {p.extraCost > 0 && <span className="text-xs text-orange-500 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/10 px-3 py-1 rounded-lg">هزینه جانبی: {formatCurrency(p.extraCost)}</span>}
               <div className="flex items-center gap-3">
                 <span className="text-gray-400 dark:text-slate-500 text-sm font-bold">جمع کل فاکتور:</span>
                 <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(p.totalAmount)}</span>
               </div>
            </div>
          </div>
        )) : (
          <div className="p-20 text-center text-gray-400 dark:text-slate-600 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed dark:border-slate-700">تاریخچه خریدی ثبت نشده است</div>
        )}
      </div>
    </div>
  );
};

export default Purchases;