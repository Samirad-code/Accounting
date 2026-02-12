
import React, { useState, useMemo, useRef } from 'react';
import { db } from '../db';
import { Product, Category } from '../types';
import { formatCurrency, getStockStatusColor } from '../utils';
import * as XLSX from 'xlsx';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const categories = db.getCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: categories[0]?.name || '',
    internalCode: '',
    retailPrice: 0,
    wholesalePrice: 0,
    lowStockThreshold: 5,
    avgCost: 0,
    quantity: 0,
  });

  const [bulkData, setBulkData] = useState({
    retailPercent: 0,
    wholesalePercent: 0,
    costPercent: 0,
    quantity: undefined as number | undefined,
    brand: ''
  });

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = 
        p.name.includes(searchTerm) || 
        p.id.includes(searchTerm) || 
        (p.internalCode && p.internalCode.includes(searchTerm)) ||
        (p.brand && p.brand.includes(searchTerm));
      
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter || p.brand === categoryFilter;
      const matchLowStock = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      return matchSearch && matchCategory && matchLowStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name, 'fa');
        case 'name_desc': return b.name.localeCompare(a.name, 'fa');
        case 'category_asc': return a.category.localeCompare(b.category, 'fa');
        case 'brand_asc': return (a.brand || '').localeCompare(b.brand || '', 'fa');
        case 'brand_desc': return (b.brand || '').localeCompare(a.brand || '', 'fa');
        case 'qty_desc': return b.quantity - a.quantity;
        case 'qty_asc': return a.quantity - b.quantity;
        default: return 0;
      }
    });

    return result;
  }, [products, searchTerm, categoryFilter, lowStockOnly, sortBy]);

  const uniqueBrands = useMemo(() => {
    const brands = products.map(p => p.brand).filter(Boolean) as string[];
    return Array.from(new Set(brands)).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [products]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', brand: '', category: categories[0]?.name || '', internalCode: '', retailPrice: 0, wholesalePrice: 0, lowStockThreshold: 5, avgCost: 0, quantity: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({ name: p.name, brand: p.brand || '', category: p.category, internalCode: p.internalCode || '', retailPrice: p.retailPrice, wholesalePrice: p.wholesalePrice, lowStockThreshold: p.lowStockThreshold, avgCost: p.avgCost, quantity: p.quantity });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      db.updateProduct(editingProduct.id, formData);
    } else {
      const newProduct: Product = { id: Date.now().toString(), ...formData, isActive: true, createdAt: new Date().toISOString() };
      db.addProduct(newProduct);
    }
    setProducts(db.getProducts());
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('آیا از حذف این کالا مطمئن هستید؟')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: any = { ...bulkData };
    if (!updates.brand) delete updates.brand;
    db.bulkUpdateProducts(selectedIds, updates);
    setProducts(db.getProducts());
    setIsBulkEditModalOpen(false);
    setSelectedIds([]);
    setBulkData({ retailPercent: 0, wholesalePercent: 0, costPercent: 0, quantity: undefined, brand: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">🔍</span>
          <input 
            type="text" 
            placeholder="جستجو کالا، برند یا کد..." 
            className="w-full pr-10 pl-4 py-3 border dark:border-slate-700 rounded-2xl outline-none shadow-sm bg-white dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => setIsExcelModalOpen(true)} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-3 rounded-2xl hover:bg-green-700 transition-all font-bold flex items-center justify-center gap-2">
            📥 ورود اکسل
          </button>
          <button onClick={openAddModal} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold flex items-center justify-center gap-2">
            + محصول جدید
          </button>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">فیلتر برند/دسته:</span>
          <select className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">همه موارد</option>
            <optgroup label="برندها">
              {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </optgroup>
            <optgroup label="دسته‌ها">
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">مرتب‌سازی:</span>
          <select className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name_asc">نام (الف تا ی)</option>
            <option value="brand_asc">برند (الف تا ی)</option>
            <option value="brand_desc">برند (ی تا الف)</option>
            <option value="qty_desc">موجودی (بیشترین)</option>
            <option value="qty_asc">موجودی (کمترین)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">کم‌موجودی</span>
        </label>
      </div>

      <div className="overflow-x-auto border dark:border-slate-700 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-right min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">
            <tr>
              <th className="p-4 w-12 text-center">
                <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} className="w-4 h-4" />
              </th>
              <th className="p-4">نام و برند</th>
              <th className="p-4">دسته و کد</th>
              <th className="p-4 text-center">موجودی</th>
              <th className="p-4 text-center">قیمت خرید</th>
              <th className="p-4 text-center">خرده‌فروشی</th>
              <th className="p-4 text-center">عمده‌فروشی</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredProducts.map(p => (
              <tr key={p.id} className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${selectedIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <td className="p-4 text-center">
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelectProduct(p.id)} className="w-4 h-4" />
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-700 dark:text-slate-200">{p.name}</div>
                  <div className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded w-max mt-1">{p.brand || 'بدون برند'}</div>
                </td>
                <td className="p-4">
                  <span className="text-xs text-slate-500">{p.category}</span>
                  <div className="text-[10px] text-gray-400">کد: {p.internalCode || '---'}</div>
                </td>
                <td className={`p-4 text-center ${getStockStatusColor(p.quantity, p.lowStockThreshold)} font-bold`}>{p.quantity}</td>
                <td className="p-4 text-center text-gray-500 font-mono text-sm">{formatCurrency(p.avgCost)}</td>
                <td className="p-4 text-center text-blue-600 font-bold font-mono">{formatCurrency(p.retailPrice)}</td>
                <td className="p-4 text-center text-indigo-600 font-bold font-mono">{formatCurrency(p.wholesalePrice)}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => openEditModal(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">✏️</button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ویرایش گروهی {selectedIds.length} کالا</h3>
              <button onClick={() => setIsBulkEditModalOpen(false)} className="text-2xl">×</button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-2">تغییر برند برای همه</label>
                  <input type="text" placeholder="نام برند جدید..." className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.brand} onChange={e => setBulkData({...bulkData, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2">تغییر درصد قیمت خرده</label>
                  <input type="number" step="0.1" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.retailPercent} onChange={e => setBulkData({...bulkData, retailPercent: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2">تغییر درصد قیمت عمده</label>
                  <input type="number" step="0.1" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.wholesalePercent} onChange={e => setBulkData({...bulkData, wholesalePercent: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2">تغییر درصد قیمت خرید</label>
                  <input type="number" step="0.1" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.costPercent} onChange={e => setBulkData({...bulkData, costPercent: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2">تنظیم موجودی جدید</label>
                  <input type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.quantity || ''} onChange={e => setBulkData({...bulkData, quantity: e.target.value ? parseInt(e.target.value) : undefined})} />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">اعمال تغییرات</button>
                <button type="button" onClick={() => setIsBulkEditModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-4 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1">نام محصول</label>
                  <input required type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl outline-none bg-white dark:bg-slate-800 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">برند</label>
                  <input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">دسته</label>
                  <select required className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">موجودی</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">کد کالا</label>
                  <input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.internalCode} onChange={e => setFormData({...formData, internalCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">قیمت خرید</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">قیمت خرده</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-bold text-blue-600" value={formData.retailPrice} onChange={e => setFormData({...formData, retailPrice: parseInt(e.target.value) || 0})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1">قیمت عمده</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-bold text-indigo-600" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg">{editingProduct ? 'بروزرسانی' : 'ثبت محصول'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl z-[150] flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{selectedIds.length}</span>
            <span className="text-sm font-bold">کالا انتخاب شده</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700"></div>
          <button onClick={() => setIsBulkEditModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold transition-all">ویرایش گروهی</button>
          <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-sm">انصراف</button>
        </div>
      )}
    </div>
  );
};

export default Products;
