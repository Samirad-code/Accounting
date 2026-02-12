
import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';

interface SearchableProductSelectProps {
  value: string;
  onChange: (val: string) => void;
  products: Product[];
}

const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({ value, onChange, products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = products.find(p => p.id === value);
  const isManual = !selected && value.startsWith('MANUAL:');
  const manualName = isManual ? value.replace('MANUAL:', '') : '';
  
  const displayValue = isOpen ? searchTerm : (selected?.name || manualName || '');

  const filtered = products.filter(p => 
    p.name.includes(searchTerm) || 
    (p.internalCode && p.internalCode.includes(searchTerm))
  );

  return (
    <div className="relative text-right w-full min-w-[200px]" ref={wrapperRef}>
      <input
        type="text"
        className="w-full p-2.5 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-sm"
        placeholder="جستجو کالا یا تایپ نام جدید..."
        value={displayValue}
        onChange={e => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setSearchTerm('');
          setIsOpen(true);
        }}
      />
      {isOpen && (
        <div className="absolute z-[100] top-full right-0 left-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl custom-scrollbar animate-in fade-in slide-in-from-top-2">
          {filtered.map(p => (
            <div
              key={p.id}
              className="p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs text-slate-700 dark:text-slate-300 border-b dark:border-slate-700/50 last:border-0"
              onClick={() => {
                onChange(p.id);
                setIsOpen(false);
              }}
            >
              <div className="font-bold text-sm">
                {p.name} 
                <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded font-normal mr-2 inline-block">{p.category}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">موجودی: {p.quantity} | قیمت: {formatCurrency(p.retailPrice)}</div>
            </div>
          ))}
          {searchTerm.trim().length > 0 && (
            <div 
              className="p-4 bg-orange-50 dark:bg-orange-900/20 cursor-pointer border-t dark:border-slate-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
              onClick={() => {
                onChange(`MANUAL:${searchTerm}`);
                setIsOpen(false);
              }}
            >
              <div className="text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center gap-2">
                <span>➕</span> ثبت دستی: «{searchTerm}»
              </div>
              <p className="text-[10px] text-orange-400 mt-1">این کالا در لیست کالاها ثبت نمی‌شود و فقط در این فاکتور اعمال می‌گردد.</p>
            </div>
          )}
          {filtered.length === 0 && !searchTerm.trim() && (
            <div className="p-8 text-center text-gray-400 italic text-xs">کالایی یافت نشد.</div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper for formatting within the component if not imported
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(Math.round(amount)) + ' تومان';
};

export default SearchableProductSelect;
