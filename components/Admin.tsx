
import React, { useState } from 'react';
import { Link, Save, CheckCircle2, XCircle, Activity, Info, Database } from 'lucide-react';
import { useAppStore } from '../context/Store';

const Admin: React.FC = () => {
  const { apiUrl, updateApiUrl, backendOnline, testConnection, refreshData } = useAppStore();
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const handleTestConnection = async () => {
    if (!tempUrl) return;
    setIsSaving(true);
    setTestResult(null);
    const result = await testConnection(tempUrl);
    setTestResult(result);
    setIsSaving(false);
  };

  const handleSaveUrl = async () => {
    if (!tempUrl) return;
    setIsSaving(true);
    updateApiUrl(tempUrl);
    
    // Beri jeda sedikit agar ref di Store terupdate, lalu paksa refresh data
    setTimeout(async () => {
      await refreshData();
      setIsSaving(false);
      setTestResult({ success: true, message: "URL Berhasil disimpan dan data diperbarui!" });
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">System Node</h1>
          <p className="text-sm text-muted-gray font-medium mt-1">Konfigurasi database Google Sheets via AppScript.</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
          backendOnline 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
            : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {backendOnline ? <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> : <XCircle size={14} />}
          {backendOnline ? 'Cloud Synchronized' : 'Offline Mode'}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/10">
            <Database size={24} />
          </div>
          <div>
            <h3 className="font-bold text-navy dark:text-white text-lg leading-tight">Google Apps Script Connector</h3>
            <p className="text-xs text-muted-gray font-medium uppercase tracking-wider">Serverless Backend Infrastructure</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
              <Info size={14} /> Cara Setup:
            </h4>
            <ol className="text-[11px] text-blue-800 dark:text-blue-400 list-decimal ml-4 space-y-1">
              <li>Deploy kode backend Anda di Google Apps Script sebagai <strong>Web App</strong>.</li>
              <li>Set "Who has access" ke <strong>Anyone</strong>.</li>
              <li>Salin URL Web App (berakhir dengan /exec) dan tempel di bawah ini.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1">AppScript Execution URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full pl-11 pr-4 py-3.5 bg-surface dark:bg-slate-950 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-[20px] text-xs outline-none transition-all font-mono"
                />
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={handleTestConnection}
                  disabled={isSaving || !tempUrl}
                  className="px-6 py-3.5 bg-white dark:bg-slate-800 text-navy dark:text-white border border-card-border dark:border-slate-800 rounded-[20px] text-[10px] font-black hover:bg-surface transition-all disabled:opacity-50 flex items-center gap-2 shadow-soft"
                >
                  <Activity className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> TEST
                </button>
                <button 
                  onClick={handleSaveUrl}
                  disabled={isSaving || !tempUrl}
                  className="px-8 py-3.5 bg-primary text-white rounded-[20px] text-[10px] font-black hover:bg-blue-600 transition-all shadow-glow-primary flex items-center gap-2"
                >
                  <Save size={16} /> CONNECT
                </button>
              </div>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-2xl border flex items-start gap-4 animate-in slide-in-from-top-2 duration-300 ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              {testResult.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <div className="text-xs font-bold leading-relaxed">{testResult.message}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
