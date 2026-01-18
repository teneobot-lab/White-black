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
  ArrowUpRight 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { items, transactions } = useAppStore();

  // Calculations
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.currentStock), 0);
  const totalUnits = items.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockItems = items.filter(item => item.currentStock <= item.minLevel);
  
  // Category Data for Pie Chart
  const categoryData = Object.entries(items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  // Top Products for Bar Chart
  const topProducts = items
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(item => ({ name: item.name, stock: item.currentStock }));

  const COLORS = ['#18181b', '#52525b', '#a1a1aa', '#e4e4e7', '#f4f4f5'];
  const DARK_COLORS = ['#fafafa', '#d4d4d8', '#a1a1aa', '#52525b', '#27272a'];

  const recentTransactions = transactions.slice(0, 5);

  const KPICard = ({ title, value, sub, icon: Icon, alert }: any) => (
    <div className={`bg-white dark:bg-zinc-900 p-6 rounded-xl border ${alert ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10' : 'border-zinc-200 dark:border-zinc-800'} shadow-sm transition-colors`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <h3 className={`text-2xl font-bold mt-2 ${alert ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${alert ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Inventory Value" 
          value={`Rp ${totalValue.toLocaleString('id-ID')}`} 
          icon={DollarSign}
        />
        <KPICard 
          title="Total Units" 
          value={totalUnits.toLocaleString()} 
          sub={`${items.length} Unique SKUs`}
          icon={Package} 
        />
        <KPICard 
          title="Low Stock Items" 
          value={lowStockItems.length} 
          icon={AlertTriangle}
          alert={lowStockItems.length > 0}
          sub={lowStockItems.length > 0 ? "Action required" : "Healthy levels"}
        />
        <KPICard 
          title="Categories" 
          value={categoryData.length} 
          icon={TrendingUp} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Stock Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#71717a'}} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#71717a'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#18181b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="stock" fill="#71717a" radius={[4, 4, 0, 0]} barSize={40} className="dark:fill-zinc-400" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Low Stock Alert List */}
          {lowStockItems.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden transition-colors">
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-900 dark:text-red-300">Low Stock Alerts</h3>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lowStockItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">SKU: {item.sku} • Min: {item.minLevel}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Categories</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="dark:opacity-80" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#18181b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    {entry.name}
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">No activity yet.</div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentTransactions.map((trx) => (
                    <div key={trx.id} className="p-4 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <div className={`p-2 rounded-lg mt-0.5 ${
                        trx.type === 'Inbound' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      }`}>
                        {trx.type === 'Inbound' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {trx.type} &middot; {trx.totalItems} Items
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {trx.transactionId}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          {new Date(trx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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