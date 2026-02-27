
import React, { useState } from 'react';
import { db } from '../db';
import { Category } from '../types';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(db.getCategories());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [retailMargin, setRetailMargin] = useState<number | ''>('');
  const [wholesaleMargin, setWholesaleMargin] = useState<number | ''>('');

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

            <button 
              onClick={() => handleApplyMargins(cat.id)}
              className="mt-auto w-full py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all active:scale-95"
            >
              بروزرسانی قیمت محصولات
            </button>
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
    </div>
  );
};

export default Categories;
