import React, { useState, useEffect } from 'react';
import { db } from '../db';
import CloudSyncModal from './CloudSyncModal';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  // Real-time status tracker for the UI
  const [cloudStatus, setCloudStatus] = useState(db.getStatus());
  
  useEffect(() => {
    const unsub = db.subscribe(() => setCloudStatus(db.getStatus()));
    return unsub;
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const menuItems = [
    { id: 'dashboard', label: 'داشبورد', icon: '📊' },
    { id: 'products', label: 'محصولات و انبار', icon: '📦' },
    { id: 'categories', label: 'مدیریت دسته‌بندی‌ها', icon: '🏷️' },
    { id: 'purchases', label: 'ثبت خرید', icon: '📥' },
    { id: 'invoices', label: 'فروش و فاکتور', icon: '🧾' },
    { id: 'customers', label: 'مشتریان و حساب‌ها', icon: '👥' },
    { id: 'reminders', label: 'یادآوری طلب‌ها', icon: '🔔' },
    { id: 'reports', label: 'گزارشات سود و زیان', icon: '📈' },
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  const getCloudIconColor = () => {
     if (cloudStatus === 'connected') return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
     if (cloudStatus === 'error') return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
     return 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      
      {/* Mobile Header (z-40) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-2xl">☰</button>
        <h1 className="text-lg font-bold text-blue-400">پلاستیک‌بان</h1>
        <button onClick={() => setIsSyncModalOpen(true)} className="relative p-2">
           ☁️
           <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${cloudStatus === 'connected' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
        </button>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-[60] w-64 bg-slate-900 dark:bg-slate-950 text-white transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:static md:w-64 md:flex md:flex-col md:h-screen md:sticky md:top-0 shadow-2xl md:shadow-xl border-l border-slate-800
      `}>
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-slate-800">
          <h1 className="text-xl font-bold text-blue-400">پلاستیک‌بان</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-xl text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        
        <nav className="flex-1 mt-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center p-4 transition-colors ${activePage === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="mr-4 text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-center text-gray-500">
          <p>نسخه ۱.۱.۰ ابری</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <header className="mb-6 md:mb-8 hidden md:flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">مدیریت هوشمند کسب و کار شما</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Cloud Sync Status Button */}
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-sm transition-all hover:scale-105 active:scale-95 ${getCloudIconColor()}`}
              title="تنظیمات فضای ابری"
            >
              <span className="text-xl">☁️</span>
              <span className="text-xs font-bold hidden lg:block">
                {cloudStatus === 'connected' ? 'همگام‌سازی فعال' : 'آفلاین (بدون سینک)'}
              </span>
            </button>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95 text-lg"
              title={isDarkMode ? 'حالت روز' : 'حالت شب'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 px-4 rounded-2xl shadow-sm border dark:border-slate-700">
              <div className="text-left leading-tight hidden xl:block">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500">کاربر فعلی</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">مدیریت فروشگاه</p>
              </div>
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">م</div>
            </div>
          </div>
        </header>

        {/* Mobile Page Title */}
        <div className="md:hidden mb-4 flex justify-between items-center">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
           </h2>
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 md:p-8 min-h-[70vh] transition-colors duration-300">
          {children}
        </div>
      </main>

      {isSyncModalOpen && <CloudSyncModal onClose={() => setIsSyncModalOpen(false)} />}
    </div>
  );
};

export default Layout;