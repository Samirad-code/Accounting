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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

  const filteredProducts = useMemo(() => {
    // 1. فیلتر کردن
    let result = products.filter(p => {
      const matchSearch = 
        p.name.includes(searchTerm) || 
        p.id.includes(searchTerm) || 
        (p.internalCode && p.internalCode.includes(searchTerm)) ||
        (p.brand && p.brand.includes(searchTerm)); // قابلیت سرچ بر اساس برند
      
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchLowStock = !lowStockOnly || p.quantity <= p.lowStockThreshold;
      return matchSearch && matchCategory && matchLowStock;
    });

    // 2. مرتب‌سازی
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': 
          return a.name.localeCompare(b.name, 'fa');
        case 'name_desc': 
          return b.name.localeCompare(a.name, 'fa');
        case 'category_asc': 
          return a.category.localeCompare(b.category, 'fa');
        case 'brand_asc': 
          return (a.brand || '').localeCompare(b.brand || '', 'fa');
        case 'qty_desc': 
          return b.quantity - a.quantity;
        case 'qty_asc': 
          return a.quantity - b.quantity;
        default: 
          return 0;
      }
    });

    return result;
  }, [products, searchTerm, categoryFilter, lowStockOnly, sortBy]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      brand: '',
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
      brand: p.brand || '',
      category: p.category,
      internalCode: p.internalCode || '',
      retailPrice: p.retailPrice,
      wholesalePrice: p.wholesalePrice,
      lowStockThreshold: p.lowStockThreshold,
      avgCost: p.avgCost,
      quantity: p.quantity,
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

  // --- Excel Import Logic ---
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
        'نام کالا': 'کیسه فریزر',
        'برند': 'پنگوئن',
        'دسته‌بندی': 'کیسه‌ها',
        'کد کالا': 'P-101',
        'موجودی': 100,
        'حداقل موجودی': 10,
        'قیمت خرید': 15000,
        'قیمت خرده': 20000,
        'قیمت عمده': 18000
    }]);
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
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newProducts: Product[] = [];
        const newCategories = new Set<string>();

        data.forEach((row: any, index: number) => {
          // انعطاف‌پذیری در خواندن نام ستون‌ها
          const name = row['نام کالا'] || row['نام'] || row['Name'] || row['name'];
          if (!name) return; // اگر نام کالا نداشت این ردیف را نادیده بگیر

          const brand = row['برند'] || row['شرکت'] || row['Brand'] || '';
          const category = row['دسته‌بندی'] || row['دسته'] || row['Category'] || 'عمومی';
          const internalCode = row['کد کالا'] || row['کد'] || row['Code'] || '';
          const quantity = parseInt(row['موجودی'] || row['تعداد'] || row['Qty'] || row['Quantity']) || 0;
          const lowStockThreshold = parseInt(row['حداقل موجودی'] || row['هشدار موجودی'] || row['Low Stock']) || 5;
          const avgCost = parseFloat(row['قیمت خرید'] || row['قیمت پایه'] || row['Cost']) || 0;
          const retailPrice = parseFloat(row['قیمت خرده'] || row['قیمت فروش'] || row['Retail']) || 0;
          const wholesalePrice = parseFloat(row['قیمت عمده'] || row['Wholesale']) || 0;

          newCategories.add(category);

          newProducts.push({
            id: `prod-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
            name: String(name),
            brand: String(brand),
            category: String(category),
            internalCode: String(internalCode),
            quantity,
            lowStockThreshold,
            avgCost,
            retailPrice,
            wholesalePrice,
            isActive: true,
            createdAt: new Date().toISOString()
          });
        });

        if (newProducts.length > 0) {
          const existingCats = db.getCategories().map(c => c.name);
          newCategories.forEach(cat => {
            if (!existingCats.includes(cat)) {
              db.addCategory(cat);
              existingCats.push(cat); // جلوگیری از ثبت تکراری در طول حلقه
            }
          });
          
          db.addProducts(newProducts);
          alert(`✅ تعداد ${newProducts.length} محصول با موفقیت از فایل وارد شد.`);
          setProducts(db.getProducts());
          setIsExcelModalOpen(false);
        } else {
          alert('❌ محصولی در فایل یافت نشد. لطفا مطمئن شوید که ستون "نام کالا" وجود دارد.');
        }
      } catch (err) {
        console.error(err);
        alert('❌ خطا در پردازش فایل. لطفا از قالب نمونه اکسل استفاده کنید.');
      }
    };
    reader.readAsBinaryString(file);
    // ریست کردن اینپوت تا در صورت انتخاب مجدد همان فایل، رویداد onChange اجرا شود
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
            className="w-full pr-10 pl-4 py-3 border dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white dark:bg-slate-800 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsExcelModalOpen(true)}
            className="flex-1 md:flex-none bg-green-600 text-white px-4 md:px-6 py-3 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 active:scale-95 font-bold"
          >
            <span className="text-lg">📥</span> 
            <span className="hidden sm:inline">ورود از اکسل</span>
            <span className="sm:hidden">اکسل</span>
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 md:flex-none bg-blue-600 text-white px-4 md:px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 font-bold"
          >
            <span className="text-lg">+</span> 
            <span className="hidden sm:inline">محصول جدید</span>
            <span className="sm:hidden">جدید</span>
          </button>
        </div>
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

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">مرتب‌سازی:</span>
          <select 
            className="text-sm p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name_asc">الفبا (الف تا ی)</option>
            <option value="name_desc">الفبا (ی تا الف)</option>
            <option value="category_asc">دسته‌بندی</option>
            <option value="brand_asc">برند کالا</option>
            <option value="qty_desc">موجودی (بیشترین)</option>
            <option value="qty_asc">موجودی (کمترین)</option>
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
        <table className="w-full text-right min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-500 dark:text-slate-400 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">نام و کد کالا</th>
              <th className="p-4">دسته‌بندی و برند</th>
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
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold block w-max">{p.category}</span>
                  {p.brand && (
                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold block w-max mt-1">
                      برند: {p.brand}
                    </span>
                  )}
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

      {/* --- Add / Edit Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">نام محصول</label>
                  <input required type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">برند / شرکت سازنده</label>
                  <input type="text" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
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
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">موجودی فعلی (عدد)</label>
                  <input required type="number" min="0" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-blue-50 dark:bg-blue-900/20 dark:text-white outline-none font-bold text-blue-700 dark:text-blue-400" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">حداقل موجودی (هشدار)</label>
                  <input required type="number" min="0" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: parseInt(e.target.value) || 0})} />
                </div>

                <div className="col-span-2 pt-2 pb-1 border-b dark:border-slate-700">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">قیمت‌گذاری</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت پایه / خرید (تومان)</label>
                  <input required type="number" min="0" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-red-600 dark:text-red-400 font-bold" value={formData.avgCost} onChange={e => setFormData({...formData, avgCost: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت خرده‌فروشی (تومان)</label>
                  <input required type="number" min="0" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-blue-600 dark:text-blue-400 font-bold" value={formData.retailPrice} onChange={e => setFormData({...formData, retailPrice: parseInt(e.target.value) || 0})} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">قیمت عمده‌فروشی (تومان)</label>
                  <input required type="number" min="0" className="w-full p-3 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white outline-none font-mono text-indigo-600 dark:text-indigo-400 font-bold" value={formData.wholesalePrice} onChange={e => setFormData({...formData, wholesalePrice: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2 border-t dark:border-slate-800 mt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">{editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 p-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Excel Import Modal --- */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
            <div className="bg-green-600 text-white p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold">ورود گروهی محصولات از اکسل</h3>
              <button onClick={() => setIsExcelModalOpen(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">×</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-bold text-blue-800 dark:text-blue-400 mb-2">راهنمای بارگذاری:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ابتدا قالب نمونه را دانلود کنید.</li>
                  <li>اطلاعات محصولات خود را در قالب وارد کنید.</li>
                  <li>فایل نهایی را انتخاب و آپلود نمایید.</li>
                </ul>
              </div>
              
              <button 
                onClick={downloadTemplate}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex justify-center items-center gap-2"
              >
                <span className="text-lg">📄</span> دانلود قالب اکسل نمونه
              </button>

              <div className="relative w-full">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="excel-upload"
                />
                <label 
                  htmlFor="excel-upload"
                  className="w-full bg-green-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 cursor-pointer hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
                >
                  <span className="text-xl">📤</span> انتخاب فایل و آپلود
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