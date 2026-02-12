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
    quantity: undefined as number | undefined
  });

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = 
        p.name.includes(searchTerm) || 
        p.id.includes(searchTerm) || 
        (p.internalCode && p.internalCode.includes(searchTerm)) ||
        (p.brand && p.brand.includes(searchTerm));
      
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchLowStock = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      return matchSearch && matchCategory && matchLowStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name, 'fa');
        case 'name_desc': return b.name.localeCompare(a.name, 'fa');
        case 'category_asc': return a.category.localeCompare(b.category, 'fa');
        case 'brand_asc': return (a.brand || '').localeCompare(b.brand || '', 'fa');
        case 'qty_desc': return b.quantity - a.quantity;
        case 'qty_asc': return a.quantity - b.quantity;
        default: return 0;
      }
    });

    return result;
  }, [products, searchTerm, categoryFilter, lowStockOnly, sortBy]);

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
    db.bulkUpdateProducts(selectedIds, bulkData);
    setProducts(db.getProducts());
    setIsBulkEditModalOpen(false);
    setSelectedIds([]);
    setBulkData({ retailPercent: 0, wholesalePercent: 0, costPercent: 0, quantity: undefined });
  };

  const exportAllProducts = () => {
    const ws = XLSX.utils.json_to_sheet(products.map(p => ({
      'کد کالا': p.internalCode || p.id,
      'نام کالا': p.name,
      'برند': p.brand || '-',
      'دسته‌بندی': p.category,
      'موجودی': p.quantity,
      'بهای تمام شده': p.avgCost,
      'قیمت خرده': p.retailPrice,
      'قیمت عمده': p.wholesalePrice,
      'حد هشدار': p.lowStockThreshold
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `plasticban_inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 'نام کالا': 'کیسه فریزر', 'برند': 'پنگوئن', 'دسته‌بندی': 'کیسه‌ها', 'کد کالا': 'P-101', 'موجودی': 100, 'حداقل موجودی': 10, 'قیمت خرید': 15000, 'قیمت خرده': 20000, 'قیمت عمده': 18000 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const newProducts: Product[] = [];
        data.forEach((row: any, index: number) => {
          const name = row['نام کالا'] || row['نام'] || row['Name'];
          if (!name) return;
          const category = row['دسته‌بندی'] || row['دسته'] || 'عمومی';
          if (!db.getCategories().find(c => c.name === category)) db.addCategory(category);
          newProducts.push({
            id: `prod-${Date.now()}-${index}`,
            name: String(name),
            brand: String(row['برند'] || ''),
            category: String(category),
            internalCode: String(row['کد کالا'] || ''),
            quantity: parseInt(row['موجودی']) || 0,
            lowStockThreshold: parseInt(row['حداقل موجودی']) || 5,
            avgCost: parseFloat(row['قیمت خرید']) || 0,
            retailPrice: parseFloat(row['قیمت خرده']) || 0,
            wholesalePrice: parseFloat(row['قیمت عمده']) || 0,
            isActive: true,
            createdAt: new Date().toISOString()
          });
        });
        if (newProducts.length > 0) {
          db.addProducts(newProducts);
          alert(`تعداد ${newProducts.length} محصول با موفقیت وارد شد.`);
          setProducts(db.getProducts());
          setIsExcelModalOpen(false);
        }
      } catch (err) { alert('خطا در پردازش فایل!'); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <button onClick={exportAllProducts} className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold flex items-center justify-center gap-2 border dark:border-slate-700">
            📊 خروجی اکسل کامل
          </button>
          <button onClick={() => setIsExcelModalOpen(true)} className="flex-1 md:flex-none bg-green-600 text-white px-4 py-3 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 font-bold flex items-center justify-center gap-2">
            📥 ورود اکسل
          </button>
          <button onClick={openAddModal} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold flex items-center justify-center gap-2">
            + محصول جدید
          </button>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">دسته:</span>
          <select className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">همه دسته‌ها</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">مرتب‌سازی:</span>
          <select className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name_asc">الفبا (الف تا ی)</option>
            <option value="qty_desc">موجودی (بیشترین)</option>
            <option value="qty_asc">موجودی (کمترین)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer group">
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
              <th className="p-4">نام و کد کالا</th>
              <th className="p-4">برند و دسته</th>
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
                  <div className="text-[10px] text-slate-500">کد: {p.internalCode || '---'}</div>
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] block w-max">{p.category}</span>
                  <span className="text-[10px] text-gray-400 block mt-1">{p.brand || 'بدون برند'}</span>
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

      {/* Floating Action Bar for Selected Items */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl z-[150] flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{selectedIds.length}</span>
            <span className="text-sm font-bold">کالا انتخاب شده</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700"></div>
          <div className="flex gap-3">
            <button onClick={() => setIsBulkEditModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold transition-all">ویرایش گروهی</button>
            <button onClick={() => {
              if (window.confirm(`آیا از حذف ${selectedIds.length} کالا اطمینان دارید؟`)) {
                selectedIds.forEach(id => db.deleteProduct(id));
                setProducts(db.getProducts());
                setSelectedIds([]);
              }
            }} className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-red-500/30">حذف گروهی</button>
            <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-sm">انصراف</button>
          </div>
        </div>
      )}

      {/* --- Bulk Edit Modal --- */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ویرایش گروهی {selectedIds.length} کالا</h3>
              <button onClick={() => setIsBulkEditModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-8 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-xs text-blue-700 dark:text-blue-400">
                💡 درصد را با علامت منفی برای کاهش و بدون علامت برای افزایش وارد کنید.
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-bold mb-2">تنظیم موجودی جدید (یکسان)</label>
                  <input type="number" placeholder="خالی بماند تغییر نمی‌کند" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.quantity || ''} onChange={e => setBulkData({...bulkData, quantity: e.target.value ? parseInt(e.target.value) : undefined})} />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">اعمال تغییرات گروهی</button>
                <button type="button" onClick={() => setIsBulkEditModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-4 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Add / Edit Modal (Single) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
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

      {/* --- Excel Import Modal --- */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border dark:border-slate-700">
            <div className="bg-green-600 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ورود محصولات از اکسل</h3>
              <button onClick={() => setIsExcelModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            <div className="p-8 space-y-6">
              <button onClick={downloadTemplate} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold border dark:border-slate-700 hover:bg-slate-200 transition-colors">📄 دانلود قالب اکسل</button>
              <div className="relative w-full">
                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="w-full bg-green-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer hover:bg-green-600 shadow-lg shadow-green-500/30">
                  <span className="text-xl">📤</span> انتخاب و آپلود فایل
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;