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
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {editingPurchaseId ? 'ویرایش فاکتور خرید' : 'ثبت خرید جدید'}
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">مدیریت موجودی و ورود کالا به انبار</p>
          </div>
          <button 
            onClick={() => { setIsAdding(false); setEditingPurchaseId(null); }}
            className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">تاریخ فاکتور</label>
              <JalaliDatePicker 
                className="w-full [&>div]:p-4 [&>div]:border-2 [&>div]:border-slate-100 [&>div]:dark:border-slate-800 [&>div]:rounded-2xl [&>div]:bg-slate-50 [&>div]:dark:bg-slate-800/50 [&>div]:dark:text-white [&>div]:focus-within:border-blue-500 [&>div]:transition-all"
                value={newPurchase.date}
                onChange={val => setNewPurchase({ ...newPurchase, date: val })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">نام تامین‌کننده</label>
              <input 
                type="text" 
                placeholder="مثلا: بازرگانی احمدی"
                className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white outline-none focus:border-blue-500 transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                value={newPurchase.supplier} 
                onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">هزینه‌های جانبی (حمل و...)</label>
              <input 
                type="number" 
                className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 dark:text-white outline-none focus:border-blue-500 transition-all font-mono font-black" 
                value={newPurchase.extraCost} 
                onChange={e => setNewPurchase({...newPurchase, extraCost: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-widest">لیست اقلام فاکتور</h4>
            </div>
            <div className="overflow-x-auto custom-scrollbar pb-[150px]">
              <table className="w-full text-right min-w-[800px]">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="p-6">محصول</th>
                    <th className="p-6 w-32 text-center">تعداد</th>
                    <th className="p-6 text-center">قیمت واحد خرید</th>
                    <th className="p-6 text-center">جمع ردیف</th>
                    <th className="p-6 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {newPurchase.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                      <td className="p-6">
                        <SearchableProductSelect 
                          value={item.productId}
                          onChange={val => handleItemChange(idx, 'productId', val)}
                          products={products}
                        />
                      </td>
                      <td className="p-6">
                        <input 
                          required 
                          type="number" 
                          min="1" 
                          className="w-full p-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-center bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-blue-500 outline-none font-black" 
                          value={item.qty} 
                          onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)} 
                        />
                      </td>
                      <td className="p-6">
                        <input 
                          required 
                          type="number" 
                          min="0" 
                          className="w-full p-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-center font-mono font-black bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:border-blue-500 outline-none" 
                          value={item.unitCost} 
                          onChange={e => handleItemChange(idx, 'unitCost', parseInt(e.target.value) || 0)} 
                        />
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(item.qty * item.unitCost)}</span>
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          type="button" 
                          onClick={() => setNewPurchase({...newPurchase, items: newPurchase.items.filter((_, i) => i !== idx)})} 
                          className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center font-black"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={handleAddItem} 
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest hover:gap-3 transition-all"
              >
                <span className="text-lg">⊕</span> افزودن کالا به لیست
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-black text-xs uppercase tracking-widest">مبلغ نهایی فاکتور:</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(newPurchase.items.reduce((acc, i) => acc + (i.qty * i.unitCost), 0) + newPurchase.extraCost)}
              </span>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingPurchaseId(null); }} 
                className="flex-1 md:flex-none px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                انصراف
              </button>
              <button 
                type="submit" 
                className="flex-1 md:flex-none px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
              >
                {editingPurchaseId ? 'ذخیره تغییرات' : 'ثبت و ورود به انبار'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">تاریخچه خریدها</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">مدیریت تامین کالا و ورود به انبار</p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <span className="text-lg">⊕</span> ثبت فاکتور خرید جدید
        </button>
      </div>

      <div className="grid gap-8">
        {purchases.length > 0 ? [...purchases].reverse().map(p => (
          <div key={p.id} className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-50 dark:border-slate-800 pb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                  🏢
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">تامین‌کننده</span>
                  <h4 className="font-black text-xl text-slate-800 dark:text-white mt-1">{p.supplierName || 'نامشخص'}</h4>
                </div>
              </div>
              <div className="flex flex-col md:items-end gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-1.5 rounded-full uppercase tracking-widest">
                    {formatJalali(p.date)}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                    #{p.id.slice(-6)}
                  </span>
                </div>
                <button 
                  onClick={() => handleEditClick(p)}
                  className="text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-amber-600 hover:text-white"
                >
                  ویرایش فاکتور
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {p.items.map((item, idx) => (
                <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800/50 group/item hover:bg-white dark:hover:bg-slate-800 transition-all">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">نام محصول</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{item.productName}</span>
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">تعداد × قیمت</span>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs font-black font-mono text-slate-500">{item.qty}</span>
                      <span className="text-[10px] text-slate-300">×</span>
                      <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">{formatCurrency(item.unitCost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 border-t border-slate-50 dark:border-slate-800 pt-8">
               <div className="flex flex-wrap gap-3">
                 {p.extraCost > 0 && (
                   <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-4 py-2 rounded-xl uppercase tracking-widest">
                     هزینه جانبی: {formatCurrency(p.extraCost)}
                   </span>
                 )}
                 {p.note && (
                   <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl uppercase tracking-widest">
                     یادداشت: {p.note}
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-6">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">جمع کل فاکتور:</span>
                 <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(p.totalAmount)}</span>
               </div>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center p-32 text-slate-400 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
            <span className="text-7xl mb-6 opacity-10">📦</span>
            <p className="text-sm font-black uppercase tracking-widest italic">تاریخچه خریدی ثبت نشده است</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchases;