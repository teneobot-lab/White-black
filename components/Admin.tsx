
import React, { useState } from 'react';
import { User, Shield, Bell, Server, Link, Save, RotateCcw, CheckCircle2, XCircle, Activity, Info, Settings, Lock } from 'lucide-react';
import { useAppStore } from '../context/Store';

const Admin: React.FC = () => {
  const { apiUrl, updateApiUrl, backendOnline, testConnection, refreshData } = useAppStore();
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const handleTestConnection = async () => {
    setIsSaving(true);
    setTestResult(null);
    const result = await testConnection(tempUrl);
    setTestResult(result);
    setIsSaving(false);
  };

  const handleSaveUrl = async () => {
    setIsSaving(true);
    updateApiUrl(tempUrl);
    setTimeout(async () => {
      await refreshData();
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">System Configuration</h1>
          <p className="text-sm text-muted-gray font-medium mt-1">Mengatur node koneksi ke VPS 159.223.57.240.</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${
          backendOnline 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {backendOnline ? <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> : <XCircle size={14} />}
          {backendOnline ? 'Cloud Active' : 'Offline Mode'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/10">
              <Server size={24} />
            </div>
            <div>
              <h3 className="font-bold text-navy dark:text-white text-lg leading-tight">Backend Infrastructure</h3>
              <p className="text-xs text-muted-gray font-medium uppercase tracking-wider">Current Node IP: 159.223.57.240</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-4xl">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-gray uppercase tracking-widest ml-1">API Base URL (Proxy recommended)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="e.g., /api"
                    className="w-full pl-11 pr-4 py-3.5 bg-surface dark:bg-slate-950 border border-transparent focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-[20px] text-sm outline-none transition-all font-mono"
                  />
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={handleTestConnection}
                    disabled={isSaving}
                    className="px-6 py-3.5 bg-white dark:bg-slate-800 text-navy dark:text-white border border-card-border dark:border-slate-800 rounded-[20px] text-xs font-black hover:bg-surface transition-all disabled:opacity-50 flex items-center gap-2 shadow-soft"
                  >
                    <Activity className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> TEST VPS
                  </button>
                  <button 
                    onClick={handleSaveUrl}
                    disabled={isSaving}
                    className="px-8 py-3.5 bg-primary text-white rounded-[20px] text-xs font-black hover:bg-blue-600 transition-all shadow-glow-primary flex items-center gap-2"
                  >
                    <Save size={16} /> DEPLOY CONFIG
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
                {testResult.success ? <CheckCircle2 size={20} className="shrink-0" /> : <XCircle size={20} className="shrink-0" />}
                <div className="text-xs font-bold leading-relaxed">{testResult.message}</div>
              </div>
            )}
            
            <div className="pt-6 border-t border-card-border dark:border-slate-800 flex justify-between items-center">
               <div className="flex items-center gap-2 text-[10px] text-muted-gray font-bold italic">
                 <Info size={12} /> Gunakan <strong>/api</strong> untuk menggunakan proxy Vercel ke VPS Anda.
               </div>
               <button onClick={() => setTempUrl("/api")} className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 uppercase tracking-widest">
                 <RotateCcw size={12} /> Reset to Defaults
               </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-navy dark:text-white text-lg leading-tight">Security & Audit</h3>
              <p className="text-xs text-muted-gray font-medium uppercase tracking-wider">VPS Access Logging</p>
            </div>
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-surface dark:bg-slate-950 rounded-2xl border border-card-border dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-navy dark:text-white">API Key Status</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase">Valid</span>
             </div>
             <div className="p-4 bg-surface dark:bg-slate-950 rounded-2xl border border-card-border dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-navy dark:text-white">Auto-Sync</span>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                   <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
