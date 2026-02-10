import React, { useState, useRef } from 'react';
import { db } from '../db';

interface CloudSyncModalProps {
  onClose: () => void;
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ onClose }) => {
  const currentStatus = db.getStatus();
  const [configStr, setConfigStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'backup' | 'cloud'>('backup');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedConfig = {};
      if (configStr.trim().startsWith('{')) {
        parsedConfig = JSON.parse(configStr);
      } else {
        const match = configStr.match(/{[\s\S]*?}/);
        if (match) {
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

  const handleDownloadBackup = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    db.downloadBackupFile(`plasticban_manual_backup_${dateStr}.json`);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const jsonStr = evt.target?.result as string;
        const success = db.importBackup(jsonStr);
        if (success) {
          alert('✅ اطلاعات با موفقیت بازیابی شد. اپلیکیشن جهت اعمال تغییرات بارگزاری مجدد می‌شود.');
          window.location.reload();
        } else {
          alert('❌ فایل انتخاب شده معتبر نیست یا ساختار آن خراب است.');
        }
      } catch (err) {
        alert('❌ خطا در خواندن فایل!');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h3 className="font-bold text-xl">تنظیمات داده‌ها و همگام‌سازی</h3>
              <p className="text-blue-100 text-sm opacity-90">مدیریت فایل‌های پشتیبان و اتصال ابری</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 transition-colors text-2xl">✕</button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'backup' ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            💾 پشتیبان‌گیری محلی (Backup)
          </button>
          <button 
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'cloud' ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            ☁️ همگام‌سازی ابری (Cloud Sync)
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-bold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
                  <span>💡</span> اهمیت بکاپ‌گیری
                </p>
                <p className="leading-relaxed text-xs md:text-sm">
                  داده‌های شما در حافظه موقت مرورگر (Cache / LocalStorage) ذخیره می‌شود. 
                  چنانچه مرورگر خود را حذف کنید یا تاریخچه و کش را پاک کنید، اطلاعات از بین می‌رود. 
                  لذا <strong>حتماً هفته‌ای یکبار</strong> از اطلاعات خود فایل پشتیبان تهیه کنید.
                  (البته سیستم به صورت خودکار هر ۲۴ ساعت یکبار یک فایل دانلود می‌کند).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleDownloadBackup}
                  className="bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-blue-600 dark:text-blue-400"
                >
                  <span className="text-4xl">📥</span>
                  <span className="font-bold">دریافت فایل پشتیبان</span>
                  <span className="text-[10px] text-slate-500">فرمت استاندارد json</span>
                </button>

                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    onChange={handleRestoreBackup} 
                    className="hidden" 
                    id="backup-upload"
                  />
                  <label 
                    htmlFor="backup-upload"
                    className="w-full h-full bg-white dark:bg-slate-800 border-2 border-green-100 dark:border-green-900/50 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-green-600 dark:text-green-400 cursor-pointer"
                  >
                    <span className="text-4xl">📤</span>
                    <span className="font-bold">بازیابی اطلاعات (Restore)</span>
                    <span className="text-[10px] text-slate-500">جایگزینی کامل دیتابیس فعلی</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700">
                <div className={`w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] ${
                  currentStatus === 'connected' ? 'bg-green-500 shadow-green-500/50' : 
                  currentStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  currentStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">وضعیت اتصال به کلود</p>
                  <p className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;