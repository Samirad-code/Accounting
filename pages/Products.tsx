
import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { Product, Category } from '../types';
import { formatCurrency, getStockStatusColor } from '../utils';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const categories = db.getCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.name || '',
    internalCode: '',
    retailPrice: 0,
    wholesalePrice: 0,
    lowStockThreshold: 5,
    avgCost: 0,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = 
        p.name.includes(searchTerm) || 
        p.id.includes(searchTerm) || 
        (p.internalCode && p.internalCode.includes(searchTerm));
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchLowStock = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      return matchSearch && matchCategory && matchLowStock;
    });
  }, [products, searchTerm, categoryFilter, lowStockOnly]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      category: categories[0]?.name || '', 
      internalCode: '', 
      retailPrice: 0, 
      wholesalePrice: 0, 
      lowStockThreshold: 5,
      avgCost: 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      internalCode: p.internalCode || '',
      retailPrice: p.retailPrice,
      wholesalePrice: p.wholesalePrice,
      lowStockThreshold: p.lowStockThreshold,
      avgCost: p.avgCost,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      db.updateProduct(editingProduct.id, formData);
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        ...formData,
        quantity: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      db.addProduct(newProduct);
    }
    setProducts(db.getProducts());
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">🔍</span>
          <input 
            type="text" 
            placeholder="جستجو کالا یا کد..." 
            className="w-full pr-10 pl-4 py-3 border dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 font-bold"
        >
          <span>+</span> محصول جدید
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">دسته:</span>
          <select 
            className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">همه دسته‌ها</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors">کم‌موجودی</span>
        </label>
      </div>

      <div className="overflow-x-auto border dark:border-slate-700 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-right">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">نام و کد کالا</th>
              <th className="p-4">دسته‌بندی</th>
              <th className="p-4 text-center">موجودی</th>
              <th className="p-4 text-center">قیمت پایه (خرید)</th>
              <th className="p-4 text-center">قیمت خرده</th>
              <th className="p-4 text-center">قیمت عمده</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredProducts.length > 0 ? filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                <td className="p-4">
                  <div className="font-bold text-slate-700 dark:text-slate-200">{p.name}</div>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-slate-500 dark:text-slate-400">کد: {p.internalCode || '---'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">{p.category}</span>
                </td>
                <td className={`p-4 text-center ${getStockStatusColor(p.quantity, p.lowStockThreshold)} font-bold`}>
                  {p.quantity} <span className="text-[10px] font-normal">عدد</span>
                </td>
                <td className="p-4 text-center text-gray-600 dark:text-slate-400 font-mono text-sm">{formatCurrency(p.avgCost)}</td>
                <td className="p-4 text-center text-blue-600 dark:text-blue-400 font-bold font-mono">{formatCurrency(p.retailPrice)}</td>
                <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-bold font-mono">{formatCurrency(p.wholesalePrice)}</td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => openEditModal(p)}
                    className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm"
                    title="ویرایش کالا"
                  >
                    ✏️
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="p-20 text-center text-gray-400 italic">محصولی یافت نشد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">نام محصول</label>
                  <input required type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">دسته‌بندی کالا</label>
                  <select 
                    required 
                    className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">کد اختصاصی</label>
                  <input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.internalCode} onChange={e => setFormData({...formData, internalCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">حداقل موجودی (هشدار)</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت پایه / خرید (تومان)</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-red-600 dark:text-red-400 font-bold" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت خرده (تومان)</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-blue-600 dark:text-blue-400 font-bold" value={formData.retailPrice} onChange={e => setFormData({...formData, retailPrice: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت عمده (تومان)</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-indigo-600 dark:text-indigo-400 font-bold" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">{editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
