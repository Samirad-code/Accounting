
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name_asc');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickCost, setQuickCost] = useState<number>(0);

  const [formData, setFormData] = useState({
    name: '',
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
    category: ''
  });

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = 
        p.name.includes(searchTerm) || 
        p.id.includes(searchTerm) || 
        (p.internalCode && p.internalCode.includes(searchTerm));
      
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchLowStock = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      return matchSearch && matchCategory && matchLowStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name, 'fa');
        case 'name_desc': return b.name.localeCompare(a.name, 'fa');
        case 'category_asc': return a.category.localeCompare(b.category, 'fa');
        case 'qty_desc': return b.quantity - a.quantity;
        case 'qty_asc': return a.quantity - b.quantity;
        default: return 0;
      }
    });

    return result;
  }, [products, searchTerm, categoryFilter, lowStockOnly, sortBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
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
    setFormData({ 
      name: '', 
      category: categories[0]?.name || '', 
      internalCode: '', 
      retailPrice: 0, 
      wholesalePrice: 0, 
      lowStockThreshold: 5, 
      avgCost: 0, 
      quantity: 0 
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
      quantity: p.quantity 
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
        isActive: true, 
        createdAt: new Date().toISOString() 
      };
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
    if (!updates.category) delete updates.category;
    db.bulkUpdateProducts(selectedIds, updates);
    setProducts(db.getProducts());
    setIsBulkEditModalOpen(false);
    setSelectedIds([]);
    setBulkData({ retailPercent: 0, wholesalePercent: 0, costPercent: 0, quantity: undefined, category: '' });
  };

  const handleQuickCostUpdate = (id: string, newCost: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const category = categories.find(c => c.name === product.category);
    const retailMargin = category?.retailMargin ?? 50; // Default 50%
    const wholesaleMargin = category?.wholesaleMargin ?? 20; // Default 20%

    const updates = {
      avgCost: newCost,
      retailPrice: Math.round(newCost * (1 + retailMargin / 100)),
      wholesalePrice: Math.round(newCost * (1 + wholesaleMargin / 100))
    };

    db.updateProduct(id, updates);
    setProducts(db.getProducts());
    setQuickEditingId(null);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('فایل اکسل خالی است یا فرمت آن صحیح نیست.');
          return;
        }

        const newProducts: Product[] = data.map((row: any) => ({
          id: row['کد سیستم'] && row['کد سیستم'] !== '---' ? String(row['کد سیستم']) : Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: String(row['نام کالا'] || 'کالای بدون نام'),
          category: String(row['دسته‌بندی'] || categories[0]?.name || 'عمومی'),
          internalCode: row['کد کالا'] === '---' ? '' : String(row['کد کالا'] || ''),
          quantity: Number(row['موجودی']) || 0,
          avgCost: Number(row['قیمت خرید (تومان)']) || 0,
          retailPrice: Number(row['قیمت خرده‌فروشی (تومان)']) || 0,
          wholesalePrice: Number(row['قیمت عمده‌فروشی (تومان)']) || 0,
          lowStockThreshold: 5,
          isActive: true,
          createdAt: new Date().toISOString()
        }));

        db.addProducts(newProducts);
        setProducts(db.getProducts());
        setIsExcelModalOpen(false);
        alert(`${newProducts.length} کالا با موفقیت وارد شد.`);
      } catch (err) {
        console.error(err);
        alert('خطا در خواندن فایل اکسل. لطفا از صحت فرمت فایل مطمئن شوید.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    const dataToExport = filteredProducts.map(p => ({
      'کد سیستم': p.id,
      'نام کالا': p.name,
      'دسته‌بندی': p.category,
      'کد کالا': p.internalCode || '---',
      'موجودی': p.quantity,
      'قیمت خرید (تومان)': p.avgCost,
      'قیمت خرده‌فروشی (تومان)': p.retailPrice,
      'قیمت عمده‌فروشی (تومان)': p.wholesalePrice,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'محصولات');
    XLSX.writeFile(workbook, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96 group">
          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
          <input 
            type="text" 
            placeholder="جستجو کالا، کد یا دسته‌بندی..." 
            className="w-full pr-12 pl-4 py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none shadow-sm bg-white dark:bg-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button onClick={exportExcel} className="flex-1 md:flex-none bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 px-6 py-4 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all font-black flex items-center justify-center gap-3 active:scale-95">
            📊 خروجی اکسل
          </button>
          <button onClick={() => setIsExcelModalOpen(true)} className="flex-1 md:flex-none bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 px-6 py-4 rounded-2xl hover:bg-amber-600 hover:text-white transition-all font-black flex items-center justify-center gap-3 active:scale-95">
            📥 ورود اکسل
          </button>
          <button onClick={openAddModal} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 font-black flex items-center justify-center gap-3 active:scale-95">
            + محصول جدید
          </button>
        </div>
      </div>

      <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">فیلتر دسته:</span>
          <select className="text-sm font-bold p-3 px-5 border-2 border-transparent focus:border-blue-500 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm transition-all" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">همه دسته‌ها</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">مرتب‌سازی:</span>
          <select className="text-sm font-bold p-3 px-5 border-2 border-transparent focus:border-blue-500 rounded-xl bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm transition-all" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name_asc">نام (الف تا ی)</option>
            <option value="name_desc">نام (ی تا الف)</option>
            <option value="category_asc">دسته (الف تا ی)</option>
            <option value="qty_desc">موجودی (بیشترین)</option>
            <option value="qty_asc">موجودی (کمترین)</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className={`w-10 h-6 rounded-full transition-all relative ${lowStockOnly ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
            <input type="checkbox" className="hidden" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${lowStockOnly ? 'right-5' : 'right-1'}`}></div>
          </div>
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">فقط کم‌موجودی</span>
        </label>
      </div>

      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-right min-w-[1000px]">
          <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">
            <tr>
              <th className="p-6 w-16 text-center">
                <input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500" />
              </th>
              <th className="p-6">نام محصول</th>
              <th className="p-6">دسته و کد</th>
              <th className="p-6 text-center">موجودی</th>
              <th className="p-6 text-center">قیمت خرید</th>
              <th className="p-6 text-center">خرده‌فروشی</th>
              <th className="p-6 text-center">عمده‌فروشی</th>
              <th className="p-6 text-center">وضعیت سودآوری</th>
              <th className="p-6 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {filteredProducts.map(p => {
              const getProfitabilityStatus = () => {
                if (!p.avgCost || p.avgCost === 0) {
                  if (p.retailPrice > 0) {
                    return { 
                      label: 'سود بالا', 
                      color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/20', 
                      icon: '🟢', 
                      percent: 100 
                    };
                  }
                  return { 
                    label: 'نامشخص', 
                    color: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-slate-150', 
                    icon: '⚪', 
                    percent: 0 
                  };
                }
                const margin = ((p.retailPrice - p.avgCost) / p.avgCost) * 100;
                if (margin >= 35) {
                  return { 
                    label: 'سود بالا', 
                    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/20', 
                    icon: '🟢', 
                    percent: Math.round(margin) 
                  };
                } else if (margin >= 15) {
                  return { 
                    label: 'سود متوسط', 
                    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/30 border border-amber-100 dark:border-amber-900/20', 
                    icon: '🟡', 
                    percent: Math.round(margin) 
                  };
                } else {
                  return { 
                    label: 'سود پایین', 
                    color: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/20', 
                    icon: '🔴', 
                    percent: Math.round(margin) 
                  };
                }
              };

              const prof = getProfitabilityStatus();

              return (
                <tr key={p.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group ${selectedIds.includes(p.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                  <td className="p-6 text-center">
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelectProduct(p.id)} className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500" />
                  </td>
                  <td className="p-6">
                    <div className="font-black text-slate-800 dark:text-slate-200 text-base group-hover:text-blue-600 transition-colors">{p.name}</div>
                  </td>
                  <td className="p-6">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl uppercase tracking-widest">{p.category}</span>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">کد: {p.internalCode || '---'}</div>
                  </td>
                  <td className={`p-6 text-center font-black text-base ${getStockStatusColor(p.quantity, p.lowStockThreshold)}`}>{p.quantity}</td>
                  <td className="p-6 text-center">
                    {quickEditingId === p.id ? (
                      <div className="flex items-center gap-2 justify-center animate-in zoom-in-95 duration-200">
                        <input 
                          autoFocus
                          type="number" 
                          className="w-32 p-2 border-2 border-blue-500 rounded-xl bg-white dark:bg-slate-800 dark:text-white text-sm text-center font-black shadow-lg"
                          value={quickCost}
                          onChange={e => setQuickCost(Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleQuickCostUpdate(p.id, quickCost);
                            if (e.key === 'Escape') setQuickEditingId(null);
                          }}
                        />
                        <button onClick={() => handleQuickCostUpdate(p.id, quickCost)} className="bg-emerald-500 text-white p-2 rounded-xl shadow-lg shadow-emerald-500/20">✓</button>
                      </div>
                    ) : (
                      <div 
                        className="text-slate-500 dark:text-slate-400 font-bold text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2 group/cost transition-all"
                        onClick={() => {
                          setQuickEditingId(p.id);
                          setQuickCost(p.avgCost);
                        }}
                      >
                        {formatCurrency(p.avgCost)}
                        <span className="opacity-0 group-hover/cost:opacity-100 text-xs transition-opacity">✏️</span>
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center text-blue-600 dark:text-blue-400 font-black text-base font-mono">{formatCurrency(p.retailPrice)}</td>
                  <td className="p-6 text-center text-indigo-600 dark:text-indigo-400 font-black text-base font-mono">{formatCurrency(p.wholesalePrice)}</td>
                  <td className="p-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${prof.color}`}>
                      <span>{prof.icon}</span>
                      <span>{prof.label}</span>
                      {prof.percent > 0 && <span className="font-mono text-[10px] opacity-80" dir="ltr">({prof.percent}%)</span>}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEditModal(p)} className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all active:scale-90" title="ویرایش">✏️</button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90" title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Excel Import Modal */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ورود کالاها از اکسل</h3>
              <button onClick={() => setIsExcelModalOpen(false)} className="text-2xl">×</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <p className="font-bold">راهنمای فرمت فایل:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ستون‌ها باید شامل: نام کالا، دسته‌بندی، موجودی، قیمت خرید (تومان)، قیمت خرده‌فروشی (تومان) باشد.</li>
                  <li>می‌توانید ابتدا یک خروجی اکسل بگیرید و از همان فرمت برای ورود اطلاعات استفاده کنید.</li>
                  <li>کد سیستم در صورت وجود برای بروزرسانی استفاده می‌شود، در غیر این صورت کالای جدید ساخته می‌شود.</li>
                </ul>
              </div>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 hover:border-blue-500 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleExcelImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-4xl mb-4">📁</div>
                <p className="text-slate-600 dark:text-slate-400 font-bold">انتخاب فایل اکسل</p>
                <p className="text-xs text-slate-400 mt-2">فرمت‌های مجاز: .xlsx, .xls</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setIsExcelModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-4 rounded-xl font-bold">بستن</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <label className="block text-xs font-bold mb-2">تغییر دسته‌بندی برای همه</label>
                  <select className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={bulkData.category} onChange={e => setBulkData({...bulkData, category: e.target.value})}>
                    <option value="">بدون تغییر دسته‌بندی</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
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
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1">دسته</label>
                  <select 
                    required 
                    className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" 
                    value={formData.category} 
                    onChange={e => {
                      const catName = e.target.value;
                      const selectedCat = categories.find(c => c.name === catName);
                      const retailMargin = selectedCat?.retailMargin ?? 50;
                      const wholesaleMargin = selectedCat?.wholesaleMargin ?? 20;
                      setFormData(prev => ({
                        ...prev,
                        category: catName,
                        retailPrice: prev.avgCost > 0 ? Math.round(prev.avgCost * (1 + retailMargin / 100)) : prev.retailPrice,
                        wholesalePrice: prev.avgCost > 0 ? Math.round(prev.avgCost * (1 + wholesaleMargin / 100)) : prev.wholesalePrice
                      }));
                    }}
                  >
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
                  <input 
                    required 
                    type="number" 
                    className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" 
                    value={formData.avgCost} 
                    onChange={e => {
                      const newCost = parseInt(e.target.value) || 0;
                      const selectedCat = categories.find(c => c.name === formData.category);
                      const retailMargin = selectedCat?.retailMargin ?? 50;
                      const wholesaleMargin = selectedCat?.wholesaleMargin ?? 20;
                      setFormData(prev => ({
                        ...prev,
                        avgCost: newCost,
                        retailPrice: Math.round(newCost * (1 + retailMargin / 100)),
                        wholesalePrice: Math.round(newCost * (1 + wholesaleMargin / 100))
                      }));
                    }} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">قیمت خرده</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-bold text-blue-600" value={formData.retailPrice} onChange={e => setFormData({...formData, retailPrice: parseInt(e.target.value) || 0})} />
                  {formData.retailPrice > 0 && (
                    <div className="mt-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      سود: {formatCurrency(formData.retailPrice - formData.avgCost)} ({formData.avgCost > 0 ? Math.round(((formData.retailPrice - formData.avgCost) / formData.avgCost) * 100) : 0}٪)
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1">قیمت عمده</label>
                  <input required type="number" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-bold text-indigo-600" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseInt(e.target.value) || 0})} />
                  {formData.wholesalePrice > 0 && (
                    <div className="mt-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      سود: {formatCurrency(formData.wholesalePrice - formData.avgCost)} ({formData.avgCost > 0 ? Math.round(((formData.wholesalePrice - formData.avgCost) / formData.avgCost) * 100) : 0}٪)
                    </div>
                  )}
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
