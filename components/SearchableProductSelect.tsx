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
  const displayValue = isOpen ? searchTerm : (selected?.name || '');

  const filtered = products.filter(p => 
    p.name.includes(searchTerm) || 
    (p.internalCode && p.internalCode.includes(searchTerm)) ||
    (p.brand && p.brand.includes(searchTerm))
  );

  return (
    <div className="relative text-right w-full min-w-[200px]" ref={wrapperRef}>
      <input
        type="text"
        className="w-full p-2.5 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs shadow-sm transition-all"
        placeholder="جستجو و انتخاب کالا..."
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
        <div className="absolute z-[100] top-full right-0 left-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {filtered.length > 0 ? filtered.map(p => (
            <div
              key={p.id}
              className="p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs text-slate-700 dark:text-slate-300 border-b dark:border-slate-700/50 last:border-0 transition-colors"
              onClick={() => {
                onChange(p.id);
                setIsOpen(false);
              }}
            >
              <div className="font-bold text-sm">
                {p.name} 
                {p.brand && <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded font-normal mr-2 inline-block">{p.brand}</span>}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 flex gap-4 mt-1.5">
                {p.internalCode && <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">کد: {p.internalCode}</span>}
                <span className={p.quantity <= p.lowStockThreshold ? 'text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-1 rounded' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1 rounded font-bold'}>
                  موجودی: {p.quantity}
                </span>
              </div>
            </div>
          )) : (
            <div className="p-4 text-xs text-gray-400 text-center italic">کالایی با این نام یا کد یافت نشد</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;