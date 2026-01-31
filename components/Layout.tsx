
import React, { useState } from 'react';
// Fix react-router-dom import errors by splitting core and DOM members
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router';
import { useAppStore } from '../context/Store';
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  History, 
  Bot, 
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  ClipboardList,
  Globe,
  Bell,
  Search,
  LogOut,
  RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode, toggleTheme, backendOnline, isSyncing, apiUrl } = useAppStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Transactions', icon: ArrowRightLeft, path: '/transactions' },
    { name: 'History', icon: History, path: '/history' },
    { name: 'Reject Logs', icon: ClipboardList, path: '/reject' },
    { name: 'AI Assistant', icon: Bot, path: '/ai' },
    { name: 'Admin', icon: Settings, path: '/admin' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-card-border dark:border-slate-800 transition-all duration-300">
      <div className="h-20 px-8 flex items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-glow-primary">
            <Package size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-navy dark:text-white">Jupiter<span className="text-primary">.</span></span>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface dark:bg-slate-800/50 border border-card-border dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-primary font-bold text-xs border border-card-border dark:border-slate-700">
            AD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-navy dark:text-white truncate">Administrator</span>
            <span className="text-[10px] font-medium text-muted-gray uppercase tracking-wider">Pro Access</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-muted-gray hover:text-navy hover:bg-surface dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary transition-colors'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-card-border dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse' : 'bg-red-500'}`} />
             <span className="text-[10px] font-bold text-muted-gray uppercase tracking-wider">{backendOnline ? 'Online' : 'Offline'}</span>
           </div>
           <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-gray hover:bg-surface dark:hover:bg-slate-800 transition-colors">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
           </button>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-muted-gray hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-surface dark:bg-slate-950 transition-colors duration-200">
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 lg:h-20 bg-surface/80 dark:bg-slate-950/80 backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30 border-b border-card-border/50 dark:border-slate-800/50">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-navy dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-soft">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center relative group">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-white dark:bg-slate-900 border border-card-border dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 w-64 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-soft"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isSyncing && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full animate-pulse border border-primary/20">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
              </div>
            )}
            <button className="p-2.5 rounded-xl text-muted-gray hover:text-primary hover:bg-white dark:hover:bg-slate-800 transition-all relative">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-surface dark:border-slate-950" />
            </button>
            <div className="w-px h-6 bg-card-border dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-navy dark:text-white leading-tight">Admin</p>
                <p className="text-[10px] text-muted-gray leading-tight">Administrator</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold shadow-glow-primary">
                AD
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
