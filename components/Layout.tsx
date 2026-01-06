
import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
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

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300 flex flex-col sticky top-0 h-screen z-50 shadow-xl border-l border-slate-800`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen && <h1 className="text-xl font-bold text-blue-400">پلاستیک‌بان</h1>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400">
            {isSidebarOpen ? '❮' : '❯'}
          </button>
        </div>
        
        <nav className="flex-1 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center p-4 transition-colors ${activePage === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <span className="text-xl">{item.icon}</span>
              {isSidebarOpen && <span className="mr-4 text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-center text-gray-500">
          {isSidebarOpen && <p>نسخه ۱.۱.۰</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {menuItems.find(i => i.id === activePage)?.label}
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">مدیریت هوشمند کسب و کار شما</p>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
              title={isDarkMode ? 'حالت روز' : 'حالت شب'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 px-4 rounded-2xl shadow-sm border dark:border-slate-700">
              <div className="text-left leading-tight hidden md:block">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500">کاربر فعلی</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">مدیریت فروشگاه</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                م
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 min-h-[80vh] transition-colors duration-300">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
