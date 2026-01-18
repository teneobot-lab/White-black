
import React, { useState } from 'react';
import { User, Shield, Bell, Moon, Server, Link, Save, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '../context/Store';

const Admin: React.FC = () => {
  const { apiUrl, updateApiUrl, backendOnline, lastError, refreshData } = useAppStore();
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveUrl = async () => {
    setIsSaving(true);
    updateApiUrl(tempUrl);
    // Tunggu sebentar untuk trigger re-fetch di store
    setTimeout(async () => {
      await refreshData();
      setIsSaving(false);
    }, 1000);
  };

  const handleReset = () => {
    const defaultUrl = "/api";
    setTempUrl(defaultUrl);
    updateApiUrl(defaultUrl);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage users and system preferences.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${backendOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {backendOnline ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {backendOnline ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Connectivity - NEW FEATURE */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-900/20 shadow-sm transition-colors lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500 text-white rounded-lg shadow-blue-200 dark:shadow-none shadow-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Server Configuration</h3>
              <p className="text-xs text-zinc-500">Configure your backend API endpoint.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">API Base URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="/api or http://your-vps-ip:5000/api"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all"
                  />
                </div>
                <button 
                  onClick={handleSaveUrl}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Connecting...' : 'Connect'}
                  {!isSaving && <Save className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-zinc-400 italic">
                  * Gunakan <strong>/api</strong> untuk menggunakan Vercel Proxy (Rekomendasi)
                </p>
                <button 
                  onClick={handleReset}
                  className="text-[10px] font-bold text-zinc-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Default
                </button>
              </div>
            </div>

            {!backendOnline && lastError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 dark:text-red-400">
                  <p className="font-bold">Gagal Terhubung ke Backend</p>
                  <p className="mt-1">{lastError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">User Management</h3>
          </div>
          <div className="space-y-4">
             {[1, 2].map((i) => (
               <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-300">
                     {i === 1 ? 'JD' : 'AS'}
                   </div>
                   <div>
                     <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{i === 1 ? 'John Doe' : 'Alice Smith'}</p>
                     <p className="text-xs text-zinc-500 dark:text-zinc-400">{i === 1 ? 'Admin' : 'Staff'}</p>
                   </div>
                 </div>
                 <button className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline">Edit</button>
               </div>
             ))}
             <button className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
               + Add New User
             </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">System Preferences</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Email Notifications</span>
              </div>
              <div className="w-10 h-6 bg-zinc-900 dark:bg-zinc-100 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full transition-all duration-300 translate-x-4"></div>
              </div>
            </div>
            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Dark Mode (Global)</span>
              </div>
              <div className="text-xs text-zinc-400">Use sidebar toggle</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
