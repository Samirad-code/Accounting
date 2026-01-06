
import React, { useState, useEffect, useRef } from 'react';

interface JalaliDatePickerProps {
  value: string; // ISO string
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({ value, onChange, label, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const getJalaliParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    };
  };

  const jalaliMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const { year: jYear, month: jMonth } = getJalaliParts(viewDate);
  const selectedParts = value ? getJalaliParts(new Date(value)) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const days = [];
    const firstDay = new Date(date);
    while (getJalaliParts(firstDay).day !== 1) firstDay.setDate(firstDay.getDate() - 1);
    const currentMonth = getJalaliParts(firstDay).month;
    let tempDate = new Date(firstDay);
    while (getJalaliParts(tempDate).month === currentMonth) {
      days.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  };

  const days = getDaysInMonth(viewDate);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-1 px-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 cursor-pointer flex justify-between items-center text-sm min-h-[40px] dark:text-white"
      >
        <span className={value ? 'font-bold' : 'text-gray-400'}>
          {value ? new Intl.DateTimeFormat('fa-IR').format(new Date(value)) : (placeholder || 'انتخاب تاریخ...')}
        </span>
        <span>📅</span>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl shadow-2xl z-[150] w-72 overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <button type="button" onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 30); setViewDate(d); }}>❯</button>
            <div className="font-bold">{jalaliMonths[jMonth - 1]} {jYear}</div>
            <button type="button" onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 30); setViewDate(d); }}>❮</button>
          </div>
          <div className="p-4 grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              const { day } = getJalaliParts(d);
              const isSelected = selectedParts && getJalaliParts(d).day === selectedParts.day && getJalaliParts(d).month === selectedParts.month;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(d.toISOString()); setIsOpen(false); }}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default JalaliDatePicker;
