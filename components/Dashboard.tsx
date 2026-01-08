import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Users, BarChart3, ArrowRight } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  membersCount: number;
  unpaidMembersCount: number;
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, membersCount, unpaidMembersCount }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions.forEach(t => {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + t.amount);
    });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const monthlyData = useMemo(() => {
     return [
        { name: 'Global', Recettes: stats.income, Depenses: stats.expense }
     ];
  }, [stats]);

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-8">
        
      {/* Header */}
      <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">Tableau de bord</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Aperçu en temps réel de la trésorerie.</p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 group border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Wallet size={24} />
            </div>
            {stats.balance >= 0 ? (
                <span className="text-xs font-bold px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">+Positif</span>
            ) : (
                <span className="text-xs font-bold px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">Négatif</span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Solde Actuel</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{stats.balance.toLocaleString()} <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">FCFA</span></h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 group border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Recettes Totales</p>
          <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{stats.income.toLocaleString()} <span className="text-sm text-emerald-200 dark:text-emerald-800 font-normal">FCFA</span></h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 group border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <TrendingDown size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Dépenses Totales</p>
          <h3 className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">-{stats.expense.toLocaleString()} <span className="text-sm text-red-200 dark:text-red-800 font-normal">FCFA</span></h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.1)] transition-all duration-300 group border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            {unpaidMembersCount > 0 && (
                <span className="text-xs font-bold px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{unpaidMembersCount} Impayés</span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Membres Actifs</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{membersCount}</h3>
        </div>
      </div>

      {/* Charts Section */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-700 h-96 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Répartition par Catégorie</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    cornerRadius={8}
                    stroke="none"
                    >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value: number) => `${value.toLocaleString()} FCFA`} 
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.2)', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {chartData.slice(0, 4).map((entry, index) => (
                    <div key={index} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {entry.name}
                    </div>
                ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-700 h-96 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Balance Financière</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                        formatter={(value: number) => `${value.toLocaleString()} FCFA`}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.2)', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="Recettes" fill="#10B981" radius={[6, 6, 6, 6]} barSize={60} />
                    <Bar dataKey="Depenses" fill="#EF4444" radius={[6, 6, 6, 6]} barSize={60} />
                </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center h-96">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-500 mb-6">
            <BarChart3 size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aucune donnée financière</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
            L'application est prête ! Commencez par ajouter des opérations dans le menu "Opérations" pour visualiser les graphiques.
          </p>
          <div className="mt-6 flex gap-2 text-blue-600 dark:text-blue-400 font-medium items-center cursor-pointer hover:gap-3 transition-all">
             <span>Aller aux opérations</span> <ArrowRight size={16} />
          </div>
        </div>
      )}
    </div>
  );
};