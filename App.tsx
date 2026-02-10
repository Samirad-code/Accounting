import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import Purchases from './pages/Purchases';
import Reminders from './pages/Reminders';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import { db } from './db';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    // عضویت در موتور دیتابیس؛ هرگاه تغییری از سمت کلود دریافت شود، اپلیکیشن آپدیت می‌شود
    const unsubscribe = db.subscribe(() => {
       setDbTick(prev => prev + 1);
       if (!isDbReady) setIsDbReady(true);
    });
    
    // راه‌اندازی اولیه
    db.init();

    return () => unsubscribe();
  }, [isDbReady]);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white flex-col gap-6">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <p className="text-xl font-bold">راه‌اندازی سیستم...</p>
        </div>
      </div>
    );
  }

  // پاس دادن dbTick به عنوان کلید تغییر، باعث می‌شود تمامی کامپوننت‌های داخل Layout 
  // در لحظه دریافت تغییرات ابری، آخرین دیتا را از db.ts استخراج کنند.
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard key={dbTick} />;
      case 'products': return <Products key={dbTick} />;
      case 'categories': return <Categories key={dbTick} />;
      case 'invoices': return <Invoices key={dbTick} />;
      case 'purchases': return <Purchases key={dbTick} />;
      case 'reminders': return <Reminders key={dbTick} />;
      case 'customers': return <Customers key={dbTick} />;
      case 'reports': return <Reports key={dbTick} />;
      default: return <Dashboard key={dbTick} />;
    }
  };

  return (
    <Layout activePage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default App;