
import React, { useState } from 'react';
import { db } from '../db';
import { Category } from '../types';
import { formatCurrency } from '../utils';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(db.getCategories());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [retailMargin, setRetailMargin] = useState<number | ''>('');
  const [wholesaleMargin, setWholesaleMargin] = useState<number | ''>('');

  const [productEditCategory, setProductEditCategory] = useState<Category | null>(null);
  const [isProductListModalOpen, setIsProductListModalOpen] = useState(false);
  const [categoryProductPrices, setCategoryProductPrices] = useState<{[productId: string]: number}>({});

  const openProductListModal = (cat: Category) => {
    setProductEditCategory(cat);
    const catProds = db.getProducts().filter(p => p.category === cat.name);
    const initialPrices: {[id: string]: number} = {};
    catProds.forEach(p => {
      initialPrices[p.id] = p.avgCost;
    });
    setCategoryProductPrices(initialPrices);
    setIsProductListModalOpen(true);
  };

  const handleSaveProductPrices = () => {
    if (!productEditCategory) return;
    const catProds = db.getProducts().filter(p => p.category === productEditCategory.name);
    const rMargin = productEditCategory.retailMargin ?? 50;
    const wMargin = productEditCategory.wholesaleMargin ?? 20;

    catProds.forEach(p => {
      const newCost = categoryProductPrices[p.id];
      if (newCost !== undefined) {
        db.updateProduct(p.id, {
          avgCost: newCost,
          retailPrice: Math.round(newCost * (1 + rMargin / 100)),
          wholesalePrice: Math.round(newCost * (1 + wMargin / 100))
        });
      }
    });

    setIsProductListModalOpen(false);
    setProductEditCategory(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    db.addCategory(
      categoryName.trim(), 
      retailMargin === '' ? undefined : Number(retailMargin), 
      wholesaleMargin === '' ? undefined : Number(wholesaleMargin)
    );
    setCategories([...db.getCategories()]);
    setCategoryName('');
    setRetailMargin('');
    setWholesaleMargin('');
    setIsAddModalOpen(false);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !categoryName.trim()) return;
    db.updateCategory(selectedCategory.id, {
      name: categoryName.trim(),
      retailMargin: retailMargin === '' ? undefined : Number(retailMargin),
      wholesaleMargin: wholesaleMargin === '' ? undefined : Number(wholesaleMargin)
    });
    setCategories([...db.getCategories()]);
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    setCategoryName('');
    setRetailMargin('');
    setWholesaleMargin('');
  };

  const handleApplyMargins = (categoryId: string) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید قیمت تمام محصولات این دسته را بر اساس درصدهای تعیین شده بروزرسانی کنید؟')) {
      db.applyCategoryMargins(categoryId);
      alert('قیمت محصولات با موفقیت بروزرسانی شد.');
    }
  };

  const handleDelete = () => {
    if (!selectedCategory) return;
    db.deleteCategory(selectedCategory.id);
    setCategories([...db.getCategories()]);
    setIsDeleteModalOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">مدیریت دسته‌بندی‌ها</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">سازماندهی محصولات و تعیین حاشیه سود پیش‌فرض</p>
        </div>
        <button 
          onClick={() => {
            setCategoryName('');
            setIsAddModalOpen(true);
          }}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 font-black flex items-center justify-center gap-3 active:scale-95"
        >
          + دسته جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col group hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">دسته محصول</span>
                <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2">{cat.name}</h4>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCategoryName(cat.name);
                    setRetailMargin(cat.retailMargin ?? '');
                    setWholesaleMargin(cat.wholesaleMargin ?? '');
                    setIsEditModalOpen(true);
                  }}
                  className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-90"
                  title="ویرایش"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90"
                  title="حذف"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">سود خرده</p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">{cat.retailMargin ?? 0}%</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">سود عمده</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{cat.wholesaleMargin ?? 0}%</p>
              </div>
            </div>

            <div className="mt-auto space-y-2">
              <button 
                onClick={() => openProductListModal(cat)}
                className="w-full py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>📝</span> مشاهده و ویرایش قیمت محصولات
              </button>
              <button 
                onClick={() => handleApplyMargins(cat.id)}
                className="w-full py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>⚡</span> بروزرسانی گروهی قیمت فروش
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold">افزودن دسته جدید</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">نام دسته‌بندی</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">درصد سود خرده‌فروشی</label>
                  <input 
                    type="number" 
                    placeholder="مثلا ۵۰"
                    className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                    value={retailMargin}
                    onChange={e => setRetailMargin(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">درصد سود عمده‌فروشی</label>
                  <input 
                    type="number" 
                    placeholder="مثلا ۲۰"
                    className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                    value={wholesaleMargin}
                    onChange={e => setWholesaleMargin(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">ثبت دسته</button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h4 className="font-bold">ویرایش دسته‌بندی</h4>
              <button onClick={() => setIsEditModalOpen(false)} className="text-xl">×</button>
            </div>
            <form onSubmit={handleEdit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">نام جدید</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">درصد سود خرده‌فروشی</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                    value={retailMargin}
                    onChange={e => setRetailMargin(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">درصد سود عمده‌فروشی</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white"
                    value={wholesaleMargin}
                    onChange={e => setWholesaleMargin(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700">بروزرسانی</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-700">
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center text-3xl mx-auto">⚠️</div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white">آیا مطمئن هستید؟</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                دسته‌بندی <span className="font-bold text-slate-700 dark:text-slate-200">«{selectedCategory.name}»</span> حذف خواهد شد. 
                این عمل غیرقابل بازگشت است.
              </p>
              <div className="flex gap-3 pt-6">
                <button onClick={handleDelete} className="flex-1 bg-rose-500 text-white p-3 rounded-xl font-bold hover:bg-rose-600 shadow-lg">بله، حذف شود</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold">خیر، انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Prices Inline Modal */}
      {isProductListModalOpen && productEditCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <h4 className="font-black text-lg">لیست قیمت خرید و فروش محصولات دسته «{productEditCategory.name}»</h4>
                <p className="text-[11px] text-slate-300 font-bold">
                  حاشیه سود تعریف شده: خرده‌فروشی <span className="text-blue-400 font-extrabold">{(productEditCategory.retailMargin ?? 50)}٪</span> | عمده‌فروشی <span className="text-indigo-400 font-extrabold">{(productEditCategory.wholesaleMargin ?? 20)}٪</span>
                </p>
              </div>
              <button onClick={() => { setIsProductListModalOpen(false); setProductEditCategory(null); }} className="text-2xl hover:text-slate-300 transition-colors">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-950/20">
              {db.getProducts().filter(p => p.category === productEditCategory.name).length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <span className="text-4xl">📦</span>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">هیچ محصولی در این دسته‌بندی تعریف نشده است.</p>
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b dark:border-slate-800">
                        <th className="p-4 font-black">نام محصول</th>
                        <th className="p-4 font-black">موجودی</th>
                        <th className="p-4 font-black w-48 text-center">قیمت خرید اولیه (تومان)</th>
                        <th className="p-4 font-black text-blue-600 dark:text-blue-400">قیمت فروش خرده‌فروشی جدید</th>
                        <th className="p-4 font-black text-indigo-600 dark:text-indigo-400">قیمت فروش عمده‌فروشی جدید</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {db.getProducts().filter(p => p.category === productEditCategory.name).map(p => {
                        const rMargin = productEditCategory.retailMargin ?? 50;
                        const wMargin = productEditCategory.wholesaleMargin ?? 20;
                        const currentCost = categoryProductPrices[p.id] ?? 0;
                        const calcRetail = Math.round(currentCost * (1 + rMargin / 100));
                        const calcWholesale = Math.round(currentCost * (1 + wMargin / 100));

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200">{p.name}</td>
                            <td className="p-4 font-bold font-mono text-slate-500 dark:text-slate-400">
                              {p.quantity.toLocaleString('fa-IR')}
                            </td>
                            <td className="p-4 flex justify-center">
                              <input
                                type="number"
                                className="w-full max-w-[160px] px-3 py-2 border border-slate-250 dark:border-slate-750 rounded-lg text-center bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-black text-sm"
                                value={categoryProductPrices[p.id] ?? 0}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  setCategoryProductPrices(prev => ({ ...prev, [p.id]: val }));
                                }}
                              />
                            </td>
                            <td className="p-4 text-blue-600 dark:text-blue-400 font-black font-mono">
                              {calcRetail.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">({rMargin}٪ سود)</span>
                            </td>
                            <td className="p-4 text-indigo-600 dark:text-indigo-400 font-black font-mono">
                              {calcWholesale.toLocaleString('fa-IR')} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans font-sans">({wMargin}٪ سود)</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t dark:border-slate-800 flex gap-3 shrink-0">
              <button 
                onClick={handleSaveProductPrices}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                disabled={db.getProducts().filter(p => p.category === productEditCategory.name).length === 0}
              >
                💾 ذخیره تغییرات کلی قیمت‌ها
              </button>
              <button 
                onClick={() => { setIsProductListModalOpen(false); setProductEditCategory(null); }}
                className="bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-6 rounded-xl font-black text-sm hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
