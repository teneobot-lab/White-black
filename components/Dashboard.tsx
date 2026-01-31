
import React from 'react';
import { useAppStore } from '../context/Store';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight,
  Activity,
  ArrowRight,
  Server,
  RefreshCw,
  Clock
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { items, transactions, backendOnline, lastSync, lastError } = useAppStore();

  const totalValue = items.reduce((sum, item) => sum + (item.price * item.currentStock), 0);
  const lowStockItems = items.filter(item => item.currentStock <= item.minLevel);
  
  const topProducts = items
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(item => ({ name: item.name, stock: item.currentStock }));

  const KPICard = ({ title, value, sub, icon: Icon, colorClass, highlight }: any) => (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-card-border dark:border-slate-800 shadow-soft hover-lift group ${highlight ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${colorClass} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
          <TrendingUp className="w-3 h-3" /> 2.5%
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-gray uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-navy dark:text-white leading-none">{value}</h3>
        {sub && <p className="text-xs text-muted-gray mt-2 font-medium">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white tracking-tight">Enterprise Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock size={12} className="text-muted-gray" />
            <p className="text-sm text-muted-gray font-medium">Sinkronisasi terakhir: {lastSync ? lastSync.toLocaleTimeString() : 'Menghubungkan...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-soft flex items-center gap-2 ${backendOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <div className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {backendOnline ? 'Auto-Sync Active' : 'Offline Mode'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Valuation" 
          value={`Rp ${totalValue.toLocaleString('id-ID')}`} 
          icon={DollarSign}
          colorClass="bg-blue-50 text-primary dark:bg-blue-900/30"
          highlight
        />
        <KPICard 
          title="Google Sheets" 
          value={backendOnline ? "Connected" : "Disconnected"} 
          sub={backendOnline ? "Data cloud sinkron" : "Periksa URL AppScript"}
          icon={Server} 
          colorClass={backendOnline ? "bg-indigo-50 text-secondary" : "bg-red-50 text-red-500"}
        />
        <KPICard 
          title="Critical Stock" 
          value={lowStockItems.length} 
          icon={AlertTriangle}
          colorClass={lowStockItems.length > 0 ? "bg-red-50 text-red-500 dark:bg-red-900/30" : "bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30"}
          sub={lowStockItems.length > 0 ? "Butuh pengadaan segera" : "Stok aman"}
        />
        <KPICard 
          title="Sync Mode" 
          value="Real-time" 
          icon={RefreshCw} 
          colorClass="bg-cyan-50 text-accent dark:bg-cyan-900/30"
          sub="Push on change"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-card-border dark:border-slate-800 shadow-soft">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-lg font-bold text-navy dark:text-white">Alokasi Stok (SKU Terbanyak)</h3>
               <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">Laporan Lengkap <ArrowRight size={14} /></button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94A3B8'}} dy={10} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94A3B8'}} />
                  <Tooltip 
                    cursor={{fill: '#F1F5F9'}}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', backgroundColor: '#fff', padding: '12px' }}
                    itemStyle={{ color: '#1F2937', fontWeight: 700 }}
                  />
                  <Bar dataKey="stock" fill="#4F8CFF" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {lastError && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
              <AlertTriangle className="text-red-500" />
              <p className="text-xs font-bold text-red-700">Sync Error: {lastError}</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-card-border dark:border-slate-800 shadow-soft overflow-hidden">
            <div className="p-6 border-b border-card-border dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-navy dark:text-white">Log Aktivitas Terbaru</h3>
              <Activity size={16} className="text-primary" />
            </div>
            <div>
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-muted-gray text-xs font-bold uppercase tracking-widest opacity-40">Belum ada transaksi</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.slice(0, 5).map((trx) => (
                    <div key={trx.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm ${
                        trx.type === 'Inbound' 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-primary' 
                          : 'bg-indigo-50 dark:bg-indigo-900/30 text-secondary'
                      }`}>
                        {trx.type === 'Inbound' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-navy dark:text-white truncate uppercase tracking-tight">
                          {trx.transactionId}
                        </p>
                        <p className="text-[10px] text-muted-gray font-bold uppercase mt-0.5">
                          {trx.totalItems} Items &bull; {trx.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
