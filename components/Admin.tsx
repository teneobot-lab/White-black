import React from 'react';
import { User, Shield, Bell, Moon } from 'lucide-react';

const Admin: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage users and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Management */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
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
                <div className="absolute right-1 top-1 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full"></div>
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