import React, { useState } from 'react';
import { db } from '../db';

interface CloudSyncModalProps {
  onClose: () => void;
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ onClose }) => {
  const currentStatus = db.getStatus();
  const [configStr, setConfigStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Basic extraction of config from pasted code
      let parsedConfig = {};
      if (configStr.trim().startsWith('{')) {
        parsedConfig = JSON.parse(configStr);
      } else {
        // Extract from traditional snippet if they pasted the raw const firebaseConfig = {...}
        const match = configStr.match(/{[\s\S]*?}/);
        if (match) {
           // We need a safer parser since it might not be strict JSON. But we'll try evaluating it safely or require strict JSON
           parsedConfig = JSON.parse(match[0].replace(/([a-zA-Z0-9]+?):/g, '"$1":').replace(/'/g, '"'));
        } else {
          throw new Error("فرمت وارد شده صحیح نیست.");
        }
      }

      if (!(parsedConfig as any).projectId || !(parsedConfig as any).apiKey) {
         throw new Error("اطلاعات Project ID و API Key در این کد یافت نشد.");
      }

      db.connectFirebase(parsedConfig);
      onClose();
    } catch (err: any) {
      setErrorMsg("خطا در پردازش اطلاعات: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border dark:border-slate-800">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">☁️</span>
            <div>
              <h3 className="font-bold text-xl">همگام‌سازی ابری (Cloud Sync)</h3>
              <p className="text-blue-100 text-sm opacity-90">دسترسی امن به اطلاعات فروشگاه از هر دستگاه</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 transition-colors text-2xl">✕</button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700">
            <div className={`w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] ${
              currentStatus === 'connected' ? 'bg-green-500 shadow-green-500/50' : 
              currentStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              currentStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">وضعیت فعلی سیستم</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {currentStatus === 'connected' ? 'متصل به فضای ابری - اطلاعات در لحظه سینک می‌شود' : 
                 currentStatus === 'connecting' ? 'در حال برقراری ارتباط...' : 
                 currentStatus === 'error' ? 'خطا در اتصال به سرور ابری' : 'آفلاین - استفاده از حافظه محلی سیستم'}
              </p>
            </div>
            {currentStatus === 'connected' && (
               <button onClick={() => db.disconnectFirebase()} className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold transition-colors">قطع اتصال</button>
            )}
          </div>

          {currentStatus !== 'connected' && (
            <div className="space-y-4">
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-blue-700 dark:text-blue-400 mb-2">چگونه دیتابیس رایگان بسازیم؟</p>
                <ol className="list-decimal list-inside space-y-2 text-xs md:text-sm">
                  <li>به وب‌سایت <a href="https://firebase.google.com/" target="_blank" className="text-blue-600 hover:underline" rel="noreferrer">Firebase</a> مراجعه کرده و یک پروژه جدید (بدون نیاز به کارت بانکی) بسازید.</li>
                  <li>از منوی کناری وارد بخش <strong>Firestore Database</strong> شده و یک دیتابیس در حالت <strong>Test Mode</strong> ایجاد کنید.</li>
                  <li>در بخش Project Settings، یک <strong>Web App</strong> جدید بسازید.</li>
                  <li>قطعه کد داده شده (بخش <code>firebaseConfig</code>) را کپی کرده و در کادر زیر قرار دهید.</li>
                </ol>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">پیکربندی فایربیس (Firebase Config)</label>
                  <textarea 
                    required
                    rows={6}
                    dir="ltr"
                    className="w-full p-4 border dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 font-mono text-sm dark:text-green-400 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                    placeholder={`{\n  "apiKey": "AIzaSyB...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app",\n  ...\n}`}
                    value={configStr}
                    onChange={e => setConfigStr(e.target.value)}
                  />
                  {errorMsg && <p className="text-xs text-red-500 mt-2 font-bold">{errorMsg}</p>}
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95">
                  اتصال به سرور ابری
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;