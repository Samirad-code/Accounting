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
  
  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  useEffect(() => {
    const unsub = db.subscribe(() => setCloudStatus(db.getStatus()));
    
    // Intercept standard PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If app is already running in standalone (installed) mode, hide the button
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User install choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

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
    <div className={`flex flex-col md:flex-row min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Mobile Header (z-40) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900/95 backdrop-blur-md text-white sticky top-0 z-40 shadow-lg border-b border-slate-800">
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-2xl hover:bg-slate-800 rounded-xl transition-colors">☰</button>
        <h1 className="text-xl font-black tracking-tighter text-blue-400">پلاستیک‌بان</h1>
        <button onClick={() => setIsSyncModalOpen(true)} className="relative p-2 hover:bg-slate-800 rounded-xl transition-colors">
           ☁️
           <span className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-slate-900 ${cloudStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-500'}`}></span>
        </button>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden transition-opacity animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-[60] w-72 bg-slate-900 dark:bg-slate-950 text-white transition-all duration-500 ease-in-out transform 
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:static md:w-72 md:flex md:flex-col md:h-screen md:sticky md:top-0 shadow-2xl border-l border-slate-800/50
      `}>
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">📦</div>
            <h1 className="text-2xl font-black tracking-tighter text-white">پلاستیک‌بان</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-xl text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">✕</button>
        </div>
        
        <nav className="flex-1 mt-4 px-3 overflow-y-auto custom-scrollbar space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}
            >
              <span className={`text-2xl transition-transform duration-300 ${activePage === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
              <span className="mr-4 text-sm font-bold">{item.label}</span>
              {activePage === item.id && <span className="mr-auto w-1.5 h-1.5 bg-white rounded-full"></span>}
            </button>
          ))}
        </nav>

        {showInstallBtn && (
          <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/90 rounded-2xl border border-blue-500/20 text-right animate-in fade-in slide-in-from-bottom-5 duration-300">
            <p className="text-xs font-black text-blue-400">📲 نصب روی کامپیوتر / موبایل</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-bold">پلاستیک‌بان را مانند یک نرم‌افزار اختصاصی نصب کرده و به‌صورت آفلاین و سریع اجرا کنید.</p>
            <button 
              onClick={handleInstallClick}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              نصب نرم‌افزار 📥
            </button>
          </div>
        )}
        
        <div className="p-6 border-t border-slate-800/50 text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
          <p>نسخه ۱.۱.۰ ابری • پلاستیک‌بان</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        <header className="mb-8 md:mb-12 hidden md:flex justify-between items-center">
          <div className="animate-in slide-in-from-right-10 duration-500">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">مدیریت هوشمند و یکپارچه کسب و کار شما</p>
          </div>
          
          <div className="flex items-center gap-4 animate-in slide-in-from-left-10 duration-500">
            {/* Cloud Sync Status Button */}
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-sm transition-all hover:scale-105 active:scale-95 group ${getCloudIconColor()}`}
              title="تنظیمات فضای ابری"
            >
              <span className="text-2xl group-hover:animate-bounce">☁️</span>
              <div className="text-right leading-none hidden lg:block">
                <p className="text-[10px] uppercase font-black opacity-60 tracking-widest">Cloud Sync</p>
                <p className="text-xs font-bold mt-1">
                  {cloudStatus === 'connected' ? 'همگام‌سازی فعال' : 'آفلاین'}
                </p>
              </div>
            </button>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95 text-xl hover:shadow-lg dark:hover:shadow-slate-900/50"
              title={isDarkMode ? 'حالت روز' : 'حالت شب'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2.5 px-5 rounded-2xl shadow-sm border dark:border-slate-700">
              <div className="text-left leading-tight hidden xl:block">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Administrator</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">مدیریت فروشگاه</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-500/20">م</div>
            </div>
          </div>
        </header>

        {/* Mobile Page Title */}
        <div className="md:hidden mb-6 flex justify-between items-center animate-in slide-in-from-top-5 duration-300">
           <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
           </h2>
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm text-lg">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 md:p-10 min-h-[75vh] transition-all duration-500 animate-in fade-in zoom-in-95 duration-500">
          {children}
        </div>
      </main>

      {isSyncModalOpen && <CloudSyncModal onClose={() => setIsSyncModalOpen(false)} />}
    </div>
  );
};

export default Layout;