
import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-[60] shadow-md">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-2xl">
          {isSidebarOpen ? '✕' : '☰'}
        </button>
        <h1 className="text-lg font-bold text-blue-400">پلاستیک‌بان</h1>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">م</div>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 dark:bg-slate-950 text-white transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:static md:w-64 md:flex md:flex-col md:h-screen md:sticky md:top-0 shadow-xl border-l border-slate-800
      `}>
        <div className="p-6 hidden md:flex items-center justify-between border-b border-slate-800">
          <h1 className="text-xl font-bold text-blue-400">پلاستیک‌بان</h1>
        </div>
        
        <nav className="flex-1 mt-4 overflow-y-auto">
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
          <p>نسخه ۱.۱.۰</p>
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
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
              title={isDarkMode ? 'حالت روز' : 'حالت شب'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 px-4 rounded-2xl shadow-sm border dark:border-slate-700">
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500">کاربر فعلی</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">مدیریت فروشگاه</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                م
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Page Title */}
        <div className="md:hidden mb-4 flex justify-between items-center">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
           </h2>
           <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 md:p-8 min-h-[70vh] transition-colors duration-300">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
