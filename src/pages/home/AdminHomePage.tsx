import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useSupabase } from '../utils/SupabaseContext';
import { useAuth } from '../utils/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Truck,
  Users2,
  PackageCheck,
  Settings,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Eye,
  Activity,
  DollarSign,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface DashboardData {
  totalOrders: number;
  activeVendors: number;
  pendingDeliveries: number;
  totalRevenue: number;
  weeklyRevenue: { name: string; revenue: number; orders: number }[];
  revenueGrowth: number;
  ordersGrowth: number;
  completedOrders: number;
  averageOrderValue: number;
  recentActivities: Activity[];
}

interface Activity {
  id: string;
  type: 'order' | 'vendor' | 'delivery';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

interface DateRangeOption {
  value: string;
  label: string;
  days: number;
}

interface Order {
  created_at: string;
  order_value: number | null;
  status: string;
}

const DATE_RANGES: DateRangeOption[] = [
  { value: 'today', label: 'Today', days: 1 },
  { value: 'last7days', label: 'Last 7 Days', days: 7 },
  { value: 'last30days', label: 'Last 30 Days', days: 30 },
  { value: 'last90days', label: 'Last 90 Days', days: 90 },
  { value: 'last365days', label: '1 year', days: 365 },

];

const Dashboard: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalOrders: 0,
    activeVendors: 0,
    pendingDeliveries: 0,
    totalRevenue: 0,
    weeklyRevenue: [],
    revenueGrowth: 0,
    ordersGrowth: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    recentActivities: [],
  });
  const [dateRange, setDateRange] = useState('last7days');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [showFilters, setShowFilters] = useState(false);

  // Date range calculations
  const dateRangeData = useMemo(() => {
    const range = DATE_RANGES.find(r => r.value === dateRange);
    const endDate = new Date();
    const startDate = new Date(Date.now() - (range?.days || 7) * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(Date.now() - 2 * (range?.days || 7) * 24 * 60 * 60 * 1000);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      prevStartDate: prevStartDate.toISOString(),
      days: range?.days || 7,
    };
  }, [dateRange]);

  // Generate chart data
  const generateChartData = useCallback((orders: Order[], days: number) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayName = days <= 7
        ? date.toLocaleString('en-US', { weekday: 'short' })
        : days <= 30
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short' });

      const dayOrders = orders.filter(
        order => new Date(order.created_at).toDateString() === date.toDateString()
      );

      const dayRevenue = dayOrders
        .filter(order => order.status === 'completed')
        .reduce((sum: number, order: Order) => sum + (order.order_value || 0), 0);

      data.push({
        name: dayName,
        revenue: dayRevenue,
        orders: dayOrders.length,
        date: date.toISOString().split('T')[0],
      });
    }
    return data;
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const { startDate, endDate, prevStartDate, days } = dateRangeData;

      const [
        ordersResult,
        vendorsResult,
        pendingDeliveriesResult,
        completedOrdersResult,
        revenueResult,
        chartDataResult,
        prevPeriodResult,
      ] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('vendors')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('orders')
          .select('order_value, created_at')
          .eq('status', 'completed')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('orders')
          .select('created_at, order_value, status')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('orders')
          .select('order_value, created_at')
          .eq('status', 'completed')
          .gte('created_at', prevStartDate)
          .lt('created_at', startDate),
      ]);

      const totalOrders = ordersResult.status === 'fulfilled' ? ordersResult.value.count ?? 0 : 0;
      const activeVendors = vendorsResult.status === 'fulfilled' ? vendorsResult.value.count ?? 0 : 0;
      const pendingDeliveries = pendingDeliveriesResult.status === 'fulfilled' ? pendingDeliveriesResult.value.count ?? 0 : 0;
      const completedOrders = completedOrdersResult.status === 'fulfilled' ? completedOrdersResult.value.count ?? 0 : 0;

      const currentRevenue = revenueResult.status === 'fulfilled'
        ? (revenueResult.value.data as Order[] || []).reduce((sum: number, order: Order) => sum + (order.order_value || 0), 0)
        : 0;

      const prevRevenue = prevPeriodResult.status === 'fulfilled'
        ? (prevPeriodResult.value.data as Order[] || []).reduce((sum: number, order: Order) => sum + (order.order_value || 0), 0)
        : 0;

      const prevOrders = prevPeriodResult.status === 'fulfilled'
        ? (prevPeriodResult.value.data as Order[] || []).length
        : 0;

      const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;
      const averageOrderValue = completedOrders > 0 ? currentRevenue / completedOrders : 0;

      const chartData = chartDataResult.status === 'fulfilled' ? (chartDataResult.value.data as Order[] || []) : [];
      const weeklyRevenue = generateChartData(chartData, days);

      const recentActivities: Activity[] = [
        {
          id: '1',
          type: 'order',
          title: 'New Order Received',
          description: `Order #${Math.floor(Math.random() * 10000)} placed`,
          timestamp: new Date().toISOString(),
          status: 'success'
        },
        {
          id: '2',
          type: 'delivery',
          title: 'Delivery Completed',
          description: 'Package delivered to customer',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'success'
        },
        {
          id: '3',
          type: 'vendor',
          title: 'Vendor Registration',
          description: 'New vendor account activated',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'info'
        }
      ];

      setDashboardData({
        totalOrders,
        activeVendors,
        pendingDeliveries,
        completedOrders,
        totalRevenue: currentRevenue,
        weeklyRevenue,
        revenueGrowth,
        ordersGrowth,
        averageOrderValue,
        recentActivities,
      });

      const failedRequests = [ordersResult, vendorsResult, pendingDeliveriesResult, revenueResult, chartDataResult, prevPeriodResult]
        .filter(result => result.status === 'rejected');

      if (failedRequests.length > 0) {
        console.warn('Some dashboard requests failed:', failedRequests);
        toast.error(`${failedRequests.length} data sources temporarily unavailable`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      toast.error('Failed to load dashboard data.');
    }
  }, [supabase, user, dateRangeData, generateChartData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    loadData();

    const ordersSubscription = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Orders updated:', payload);
          fetchDashboardData();
          if (payload.eventType === 'INSERT') {
            toast.success('New order received!', { duration: 3000 });
          }
        }
      )
      .subscribe();

    const vendorsSubscription = supabase
      .channel('vendors-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendors' },
        (payload) => {
          console.log('Vendors updated:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(vendorsSubscription);
    };
  }, [supabase, user, fetchDashboardData]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success('Dashboard refreshed successfully', { duration: 2000 });
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  // Export functionality
  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const csvContent = [
      'Metric,Value,Date Range',
      `Total Orders,${dashboardData.totalOrders},${dateRange}`,
      `Completed Orders,${dashboardData.completedOrders},${dateRange}`,
      `Active Vendors,${dashboardData.activeVendors},Current`,
      `Pending Deliveries,${dashboardData.pendingDeliveries},Current`,
      `Total Revenue (KSH),${dashboardData.totalRevenue},${dateRange}`,
      `Average Order Value (KSH),${dashboardData.averageOrderValue.toFixed(2)},${dateRange}`,
      `Revenue Growth,${dashboardData.revenueGrowth.toFixed(2)}%,vs Previous Period`,
      `Orders Growth,${dashboardData.ordersGrowth.toFixed(2)}%,vs Previous Period`,
      '',
      'Daily Breakdown:',
      'Date,Revenue,Orders',
      ...dashboardData.weeklyRevenue.map(d => `${d.name},${d.revenue},${d.orders}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${timestamp}-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Dashboard data exported successfully');
  }, [dashboardData, dateRange]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-green-300 rounded-full animate-spin" style={{ animationDelay: '0.15s' }}></div>
          </div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-lg font-medium text-gray-200 mb-2">Loading Dashboard</p>
            <p className="text-sm text-gray-400">Fetching your latest data...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center p-8 max-w-md"
        >
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              transition: { duration: 0.5, delay: 0.2 }
            }}
          >
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-100 mb-3">Dashboard Unavailable</h2>
          <p className="text-gray-300 mb-8 leading-relaxed">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Retrying...' : 'Try Again'}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-all duration-300">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                Dashboard Overview
              </h1>
              <p className="text-gray-400 text-lg">
                Real-time insights and performance analytics
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-10 pr-4 py-3 text-sm bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 shadow-lg"
                />
              </div>

              {/* Date Range Selector */}
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-10 pr-8 py-3 text-sm bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 shadow-lg appearance-none"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {DATE_RANGES.map(range => (
                    <option key={range.value} value={range.value} className="bg-gray-800">
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-all duration-200 shadow-lg ${
                  showFilters
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600'
                }`}
              >
                <Filter size={16} />
                Filters
              </motion.button>

              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-3 text-sm bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </motion.button>

              {/* Export Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-200 shadow-lg"
              >
                <Download size={16} />
                Export
              </motion.button>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl"
              >
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300">Chart Type:</label>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as 'area' | 'line' | 'bar')}
                      className="px-3 py-1 text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-1 focus:ring-green-500 outline-none"
                    >
                      <option value="area">Area</option>
                      <option value="line">Line</option>
                      <option value="bar">Bar</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <EnhancedStatsCard
            title="Total Orders"
            value={dashboardData.totalOrders}
            icon={<ShoppingCart size={24} />}
            color="from-blue-500 to-blue-600"
            growth={dashboardData.ordersGrowth}
            delay={0}
          />
          <EnhancedStatsCard
            title="Active Vendors"
            value={dashboardData.activeVendors}
            icon={<Users2 size={24} />}
            color="from-emerald-500 to-emerald-600"
            delay={0.1}
          />
          <EnhancedStatsCard
            title="Pending Deliveries"
            value={dashboardData.pendingDeliveries}
            icon={<Clock size={24} />}
            color="from-amber-500 to-amber-600"
            delay={0.2}
          />
          <EnhancedStatsCard
            title="Total Revenue"
            value={dashboardData.totalRevenue}
            icon={<DollarSign size={24} />}
            color="from-green-500 to-green-600"
            growth={dashboardData.revenueGrowth}
            delay={0.3}
            isRevenue={true}
          />
        </motion.div>

        {/* Additional Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          <EnhancedStatsCard
            title="Completed Orders"
            value={dashboardData.completedOrders}
            icon={<PackageCheck size={24} />}
            color="from-green-500 to-green-600"
            delay={0}
          />
          <EnhancedStatsCard
            title="Average Order Value"
            value={dashboardData.averageOrderValue}
            icon={<TrendingUp size={24} />}
            color="from-purple-500 to-purple-600"
            delay={0.1}
            isRevenue={true}
          />
          <EnhancedStatsCard
            title="Success Rate"
            value={Math.round((dashboardData.completedOrders / (dashboardData.totalOrders || 1)) * 100)}
            icon={<Activity size={24} />}
            color="from-indigo-500 to-indigo-600"
            delay={0.2}
            suffix="%"
          />
        </motion.div>

        {/* Charts and Activities Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="xl:col-span-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-100 mb-1">Revenue Analytics</h2>
                <p className="text-gray-400 text-sm">Track your revenue performance over time</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Revenue
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Orders
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  if (chartType === 'area') {
                    return (
                      <AreaChart data={dashboardData.weeklyRevenue}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `KSH ${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? `KSH ${value.toLocaleString()}` : value,
                            name === 'revenue' ? 'Revenue' : 'Orders'
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#22c55e"
                          strokeWidth={3}
                          fill="url(#revenueGradient)"
                        />
                      </AreaChart>
                    );
                  }

                  if (chartType === 'line') {
                    return (
                      <LineChart data={dashboardData.weeklyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `KSH ${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? `KSH ${value.toLocaleString()}` : value,
                            name === 'revenue' ? 'Revenue' : 'Orders'
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    );
                  }

                  if (chartType === 'bar') {
                    return (
                      <BarChart data={dashboardData.weeklyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `KSH ${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? `KSH ${value.toLocaleString()}` : value,
                            name === 'revenue' ? 'Revenue' : 'Orders'
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    );
                  }

                  return (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p>Chart type not supported</p>
                    </div>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-100 mb-1">Recent Activity</h2>
                <p className="text-gray-400 text-sm">Latest system updates</p>
              </div>
              <Link
                to="/activities"
                className="text-green-400 hover:text-green-300 transition-colors duration-200"
              >
                <Eye size={18} />
              </Link>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {dashboardData.recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'success' ? 'bg-green-500/20 text-green-400' :
                      activity.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {activity.type === 'order' && <ShoppingCart size={14} />}
                      {activity.type === 'delivery' && <Truck size={14} />}
                      {activity.type === 'vendor' && <Users2 size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-100 mb-1">Quick Actions</h2>
            <p className="text-gray-400 text-sm">Manage your platform efficiently</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <QuickActionCard
              icon={<Users2 size={24} />}
              title="Manage Vendors"
              href="/vendors"
              color="from-blue-500 to-blue-600"
            />
            <QuickActionCard
              icon={<ShoppingCart size={24} />}
              title="View Orders"
              href="/orders"
              color="from-green-500 to-green-600"
            />
            <QuickActionCard
              icon={<Truck size={24} />}
              title="Deliveries"
              href="/deliveries"
              color="from-purple-500 to-purple-600"
            />
            <QuickActionCard
              icon={<DollarSign size={24} />}
              title="Payments"
              href="/Finance"
              color="from-yellow-500 to-yellow-600"
            />
            <QuickActionCard
              icon={<BarChart3 size={24} />}
              title="Analytics"
              href="/analytics"
              color="from-indigo-500 to-indigo-600"
            />
            <QuickActionCard
              icon={<Settings size={24} />}
              title="Settings"
              href="/profile"
              color="from-gray-500 to-gray-600"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Enhanced Stats Card Component
interface EnhancedStatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  growth?: number;
  delay: number;
  isRevenue?: boolean;
  suffix?: string;
}

const EnhancedStatsCard: React.FC<EnhancedStatsCardProps> = memo(({
  title,
  value,
  icon,
  color,
  growth,
  delay,
  isRevenue = false,
  suffix = ''
}) => {
  const formatValue = (val: number) => {
    if (isRevenue) {
      return `KSH ${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {growth !== undefined && (
          <div className={`flex items-center text-sm font-medium ${
            growth >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="ml-1">{Math.abs(growth).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-100 group-hover:text-white transition-colors duration-200">
          {formatValue(value)}{suffix}
        </p>
        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
          {title}
        </p>
      </div>
    </motion.div>
  );
});

// Quick Action Card Component
interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  href: string;
  color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = memo(({
  icon,
  title,
  href,
  color
}) => {
  return (
    <Link to={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200 group cursor-pointer"
      >
        <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center text-white mb-3 mx-auto group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-200 text-center">
          {title}
        </p>
      </motion.div>
    </Link>
  );
});

export default Dashboard;