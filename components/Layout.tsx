
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDarkMode, toggleTheme, backendOnline, lastError, refreshData } = useAppStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
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

  const Logo = () => (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex items-center justify-center">
        <svg 
          width="36" 
          height="36" 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-600 dark:text-blue-500"
        >
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 28.2843 35 20C35 11.7157 28.2843 5 20 5ZM20 10C22.6522 10 25.1957 11.0536 27.0711 12.9289C28.9464 14.8043 30 17.3478 30 20C30 22.6522 28.9464 25.1957 27.0711 27.0711C25.1957 28.9464 22.6522 30 20 30C17.3478 30 14.8043 28.9464 12.9289 27.0711C11.0536 25.1957 10 22.6522 10 20C10 17.3478 11.0536 14.8043 12.9289 12.9289C14.8043 11.0536 17.3478 10 20 10ZM20 15L15 20L20 25L25 20L20 15Z" 
            fill="currentColor" 
            fillOpacity="0.2"
          />
          <path 
            d="M14 20L20 14L26 20L20 26L14 20Z" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M8 20H14M26 20H32M20 8V14M20 26V32" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
      <div className="flex flex-col justify-center h-full">
        <div className="flex items-baseline tracking-tight leading-none">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">Jupiter</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-500 ml-1">WMS</span>
        </div>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-colors duration-200">
      <div className="h-16 px-6 flex items-center border-b border-gray-100 dark:border-zinc-800">
        <Logo />
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
        {/* Backend Status Indicator */}
        <div className={`px-4 py-3 rounded-lg border transition-all ${backendOnline ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className={`w-3.5 h-3.5 ${backendOnline ? 'text-zinc-400' : 'text-red-400'}`} />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">VPS Database</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          </div>
          <p className={`text-[11px] font-medium mt-1 ${backendOnline ? 'text-zinc-600 dark:text-zinc-300' : 'text-red-600 dark:text-red-400'}`}>
            {backendOnline ? 'Connected (178.128.106.33)' : 'Connection Failed'}
          </p>
          {!backendOnline && (
            <button 
              onClick={() => setShowTroubleshoot(true)}
              className="mt-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 underline flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" /> Fix Connection
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="flex items-center space-x-3 px-4 py-2 pt-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">Administrator</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Jupiter WMS v1.2</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex transition-colors duration-200">
      {/* Troubleshoot Modal */}
      {showTroubleshoot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Koneksi VPS Gagal</h3>
              </div>
              <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Penyebab Umum:</p>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 font-mono text-xs text-red-500">
                  {lastError || "Unknown connection error."}
                </div>
                <p>Karena VPS Anda menggunakan <b>HTTP</b> (bukan HTTPS), browser sering memblokirnya.</p>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">Cara Memperbaiki:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Klik <b>ikon gembok</b> di sebelah kiri URL bar browser Anda.</li>
                  <li>Klik <b>"Site Settings"</b>.</li>
                  <li>Cari <b>"Insecure content"</b> dan ubah menjadi <b>"Allow"</b>.</li>
                  <li>Refresh halaman ini.</li>
                </ol>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowTroubleshoot(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-sm"
                >
                  Tutup
                </button>
                <button 
                  onClick={() => { refreshData(); setShowTroubleshoot(false); }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 z-50 transform transition-transform duration-200 ease-in-out lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 h-16 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
          <Logo />
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        <footer className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-4 px-6 md:px-8 mt-auto transition-colors duration-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-zinc-400 dark:text-zinc-500">
            <p>&copy; 2024 Jupiter Systems Inc.</p>
            <div className="flex space-x-4 mt-2 md:mt-0">
              <span>System: {backendOnline ? 'CONNECTED' : 'OFFLINE'}</span>
              <span>v1.2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
