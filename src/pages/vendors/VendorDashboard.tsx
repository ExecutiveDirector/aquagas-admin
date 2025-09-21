import { Users, Store, Truck, DollarSign, Clock, TrendingUp, Package } from 'lucide-react';

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
}

interface VendorDashboardProps {
  stats: DashboardStats;
  loading?: boolean;
}

export default function VendorDashboard({ stats, loading }: VendorDashboardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dashboard Stats</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.toLocaleString(),
      icon: Users,
      bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-900 dark:text-blue-100',
    },
    {
      title: 'Total Vendors',
      value: stats.vendors.toLocaleString(),
      icon: Store,
      bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      textColor: 'text-green-600 dark:text-green-400',
      valueColor: 'text-green-900 dark:text-green-100',
    },
    {
      title: 'Total Riders',
      value: stats.riders.toLocaleString(),
      icon: Truck,
      bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-900 dark:text-purple-100',
    },
    {
      title: 'Today\'s Revenue',
      value: `$${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
      textColor: 'text-orange-600 dark:text-orange-400',
      valueColor: 'text-orange-900 dark:text-orange-100',
    },
  ];

  // Add conditional stats if available
  if (stats.totalRevenue) {
    statCards.push({
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      bgColor: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20',
      textColor: 'text-teal-600 dark:text-teal-400',
      valueColor: 'text-teal-900 dark:text-teal-100',
    });
  }

  if (stats.pendingOrders !== undefined) {
    statCards.push({
      title: 'Pending Orders',
      value: stats.pendingOrders.toLocaleString(),
      icon: Clock,
      bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      valueColor: 'text-yellow-900 dark:text-yellow-100',
    });
  }

  if (stats.completedOrders !== undefined) {
    statCards.push({
      title: 'Completed Orders',
      value: stats.completedOrders.toLocaleString(),
      icon: Package,
      bgColor: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-900 dark:text-emerald-100',
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Dashboard Stats</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${card.bgColor} rounded-lg p-4 transform hover:scale-105 transition-transform duration-200`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${card.textColor} uppercase tracking-wider`}>
                    {card.title}
                  </h4>
                  <p className={`text-2xl font-bold ${card.valueColor} mt-2`}>
                    {card.value}
                  </p>
                </div>
                <div className={`${card.textColor} opacity-80`}>
                  <Icon className="w-8 h-8" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {((stats.completedOrders || 0) / Math.max(stats.orders, 1) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Order Completion Rate</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(stats.todayRevenue / Math.max(stats.vendors, 1)).toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue per Vendor</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats.orders / Math.max(stats.users, 1)).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Orders per User</p>
          </div>
        </div>
      </div>
    </div>
  );
}