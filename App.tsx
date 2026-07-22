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
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbTick(prev => prev + 1);
    });
    
    db.init();

    // سیستم بکاپ اضطراری هنگام بسته شدن تب
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        const needsBackup = localStorage.getItem('plasticban_needs_backup') === 'true';
        if (needsBackup) {
          db.downloadBackupFile(`plasticban_emergency_backup_${Date.now()}.json`);
          e.preventDefault();
          e.returnValue = ''; 
        }
      } catch (err) {
        // Safe storage fallback for sandboxed iframes
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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