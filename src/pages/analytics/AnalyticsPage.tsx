import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  type LucideIcon
} from 'lucide-react';
import { EmptyState } from '../../components/dashboard';

// Type definitions
interface OverviewStats {
  totalUsers: number;
  totalVendors: number;
  totalRiders: number;
  totalOrders: number;
  totalRevenue: number;
}

interface SalesDataItem {
  date: string;
  totalSales: number;
  totalOrders: number;
}

interface UserGrowthItem {
  date: string;
  totalUsers: number;
}

interface RevenueDataItem {
  date: string;
  totalRevenue: number;
}

interface RiderInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  rider_id?: number;
}

interface DeliveryPerformanceItem {
  rider: RiderInfo;
  totalDeliveries: number;
  completedDeliveries: number;
}

interface ChartDataItem {
  date: string;
  value: number;
  orders?: number;
}

interface DeliveryPieDataItem {
  name: string;
  value: number;
  total: number;
  color: string;
}

interface CalculatedMetrics {
  successRate: number;
  averageOrderValue: number;
  totalOrders: number;
  totalSales: number;
  revenueGrowth: number;
}

interface ApiResponse<T> {
  data?: T;
  [key: string]: any;
}

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  loading?: boolean;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
}

interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
}

// Production API service using your existing backend endpoints
const api = {
  get: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

// Utility functions for data processing
const formatCurrency = (amount: number): string => `KSh ${amount.toLocaleString()}`;

const calculateGrowth = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Splits a time series in half and compares the second half's total against
// the first half's — adapts automatically to whatever granularity/range the
// backend returns (daily, weekly, monthly buckets). Returns 0 (no badge shown)
// when there isn't enough data to support a real comparison.
const calcTrend = (series: number[]): number | undefined => {
  if (series.length < 4) return undefined;
  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid).reduce((a, b) => a + b, 0);
  const secondHalf = series.slice(mid).reduce((a, b) => a + b, 0);
  if (firstHalf === 0) return undefined;
  return calculateGrowth(secondHalf, firstHalf);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatMonth = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short',
    year: '2-digit'
  });
};

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, iconColor, iconBg, loading = false }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shadow-sm transition-transform group-hover:scale-110`}>
          <Icon className={iconColor} size={18} />
        </div>
      </div>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-gray-900">
          {typeof value === 'number' && title.toLowerCase().includes('revenue')
            ? `KSh ${value.toLocaleString()}`
            : typeof value === 'number' && title.toLowerCase().includes('rate')
            ? `${value.toFixed(1)}%`
            : value.toLocaleString()
          }
        </p>
      )}

      {change !== undefined && !loading && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{Math.abs(change).toFixed(1)}% vs prior period</span>
        </div>
      )}
    </div>
  );
};

const ChartCard: React.FC<ChartCardProps> = ({ title, children, loading = false }) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        children
      )}
    </div>
  );
};

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onChange }) => {
  const ranges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '1y', label: 'Last Year' },
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === range.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

const AdminAnalytics: React.FC = () => {
  // State management
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalUsers: 0,
    totalVendors: 0,
    totalRiders: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  
  const [salesData, setSalesData] = useState<SalesDataItem[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthItem[]>([]);
  const [deliveryPerformance, setDeliveryPerformance] = useState<DeliveryPerformanceItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [activeChart, setActiveChart] = useState<string>('sales');
  
  // Fetch overview statistics using your existing endpoint
  const fetchOverviewStats = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<OverviewStats>(`/v1/analytics/overview?range=${timeRange}`);
      // Handle both nested data structure and direct response
      const data = response.data || response;
      setOverviewStats({
        totalUsers: data.totalUsers || 0,
        totalVendors: data.totalVendors || 0,
        totalRiders: data.totalRiders || 0,
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      // Set fallback data to prevent UI breaking
      setOverviewStats({
        totalUsers: 0,
        totalVendors: 0,
        totalRiders: 0,
        totalOrders: 0,
        totalRevenue: 0
      });
    }
  }, [timeRange]);

  // Fetch sales analytics using your existing endpoint
  const fetchSalesData = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<SalesDataItem[]>(`/v1/analytics/sales?range=${timeRange}`);
      // Your backend returns data with date, totalSales, totalOrders structure
      const data = Array.isArray(response) ? response : (response.data || []);
      
      setSalesData(data.map((item: any) => ({
        date: item.date,
        totalSales: parseFloat(item.totalSales) || 0,
        totalOrders: parseInt(item.totalOrders) || 0
      })));
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSalesData([]);
    }
  }, [timeRange]);

  // Fetch user growth data using your existing endpoint
  const fetchUserGrowthData = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<UserGrowthItem[]>(`/v1/analytics/users?range=${timeRange}`);
      // Your backend returns data with date, totalUsers structure
      const data = Array.isArray(response) ? response : (response.data || []);
      
      setUserGrowthData(data.map((item: any) => ({
        date: item.date,
        totalUsers: parseInt(item.totalUsers) || 0
      })));
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      setUserGrowthData([]);
    }
  }, [timeRange]);

  // Fetch delivery performance using your existing endpoint
  const fetchDeliveryPerformance = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<DeliveryPerformanceItem[]>(`/v1/analytics/delivery-performance?range=${timeRange}`);
      // Your backend returns performance data with rider details
      const data = Array.isArray(response) ? response : (response.data || []);
      
      setDeliveryPerformance(data.map((item: any) => ({
        rider: item.rider || {},
        totalDeliveries: parseInt(item.totalDeliveries) || 0,
        completedDeliveries: parseInt(item.completedDeliveries) || 0
      })));
    } catch (error) {
      console.error('Error fetching delivery performance:', error);
      setDeliveryPerformance([]);
    }
  }, [timeRange]);

  // Fetch revenue data using your existing endpoint
  const fetchRevenueData = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<RevenueDataItem[]>(`/v1/analytics/revenue?range=${timeRange}`);
      // Your backend returns data with date, totalRevenue structure
      const data = Array.isArray(response) ? response : (response.data || []);
      
      setRevenueData(data.map((item: any) => ({
        date: item.date,
        totalRevenue: parseFloat(item.totalRevenue) || 0
      })));
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setRevenueData([]);
    }
  }, [timeRange]);

  // Fetch all analytics data
  const fetchAllData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverviewStats(),
        fetchSalesData(),
        fetchUserGrowthData(),
        fetchDeliveryPerformance(),
        fetchRevenueData()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchOverviewStats, fetchSalesData, fetchUserGrowthData, fetchDeliveryPerformance, fetchRevenueData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, timeRange]);

  // Prepare chart data with proper formatting from your backend
  const chartData = useMemo((): ChartDataItem[] => {
    switch (activeChart) {
      case 'sales':
        return salesData.map((item: SalesDataItem) => ({
          date: formatDate(item.date),
          value: item.totalSales,
          orders: item.totalOrders
        }));
      
      case 'users':
        return userGrowthData.map((item: UserGrowthItem) => ({
          date: formatDate(item.date),
          value: item.totalUsers
        }));
      
      case 'revenue':
        return revenueData.map((item: RevenueDataItem) => ({
          date: formatMonth(item.date),
          value: item.totalRevenue
        }));
      
      default:
        return [];
    }
  }, [activeChart, salesData, userGrowthData, revenueData]);

  // Delivery performance pie chart data with better error handling
  const deliveryPieData = useMemo((): DeliveryPieDataItem[] => {
    if (!Array.isArray(deliveryPerformance) || deliveryPerformance.length === 0) return [];
    
    return deliveryPerformance.slice(0, 5).map((rider: DeliveryPerformanceItem, index: number) => ({
      name: rider.rider?.name || rider.rider?.first_name || `Rider ${index + 1}`,
      value: rider.completedDeliveries,
      total: rider.totalDeliveries,
      color: COLORS[index % COLORS.length]
    }));
  }, [deliveryPerformance]);

  // Calculate metrics with better error handling
  const calculatedMetrics = useMemo((): CalculatedMetrics => {
    const totalDeliveries = deliveryPerformance.reduce((sum: number, rider: DeliveryPerformanceItem) => sum + (rider.totalDeliveries || 0), 0);
    const totalCompleted = deliveryPerformance.reduce((sum: number, rider: DeliveryPerformanceItem) => sum + (rider.completedDeliveries || 0), 0);
    const successRate = totalDeliveries > 0 ? (totalCompleted / totalDeliveries) * 100 : 0;

    const totalOrders = salesData.reduce((sum: number, item: SalesDataItem) => sum + (item.totalOrders || 0), 0);
    const totalSales = salesData.reduce((sum: number, item: SalesDataItem) => sum + (item.totalSales || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // First half of the selected range vs second half — same underlying
    // buckets the charts already show, so the badge never claims a number
    // that isn't backed by fetched data.
    const revenueGrowth = calcTrend(revenueData.map((item) => item.totalRevenue)) ?? 0;

    return {
      successRate,
      averageOrderValue,
      totalOrders,
      totalSales,
      revenueGrowth
    };
  }, [salesData, deliveryPerformance, revenueData]);

  // Real period-over-period trends for the KPI cards. `undefined` means there
  // isn't enough data to support a claim, in which case the card simply omits
  // the trend badge rather than showing a made-up number.
  const usersTrend = useMemo(() => calcTrend(userGrowthData.map((item) => item.totalUsers)), [userGrowthData]);
  const ordersTrend = useMemo(() => calcTrend(salesData.map((item) => item.totalOrders)), [salesData]);
  const revenueTrend = useMemo(() => calcTrend(revenueData.map((item) => item.totalRevenue)), [revenueData]);

  const handleExport = (): void => {
    const exportData = {
      overview: overviewStats,
      sales: salesData,
      userGrowth: userGrowthData,
      deliveryPerformance: deliveryPerformance,
      revenue: revenueData,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <BarChart3 className="text-indigo-600" size={26} />
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor business performance and key metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Total Users"
            value={overviewStats.totalUsers}
            change={usersTrend}
            icon={Users}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
            loading={loading}
          />
          <MetricCard
            title="Total Orders"
            value={overviewStats.totalOrders}
            change={ordersTrend}
            icon={ShoppingCart}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            loading={loading}
          />
          <MetricCard
            title="Total Revenue"
            value={overviewStats.totalRevenue}
            change={revenueTrend}
            icon={DollarSign}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            loading={loading}
          />
          <MetricCard
            title="Active Riders"
            value={overviewStats.totalRiders}
            icon={Truck}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            loading={loading}
          />
          <MetricCard
            title="Success Rate"
            value={calculatedMetrics.successRate}
            icon={CheckCircle}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-50"
            loading={loading}
          />
        </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Performance Trends" loading={loading}>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setActiveChart('sales')}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  activeChart === 'sales'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sales
              </button>
              <button
                onClick={() => setActiveChart('users')}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  activeChart === 'users'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                User Growth
              </button>
              <button
                onClick={() => setActiveChart('revenue')}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  activeChart === 'revenue'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Revenue
              </button>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              {activeChart === 'sales' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'value' ? `KSh ${value.toLocaleString()}` : value,
                      name === 'value' ? 'Sales' : 'Orders'
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                    name="Sales"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Orders"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [
                      activeChart === 'revenue' ? `KSh ${value.toLocaleString()}` : value,
                      activeChart === 'users' ? 'New Users' : 'Revenue'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Delivery Performance Pie Chart */}
        <div>
          <ChartCard title="Delivery Performance" loading={loading}>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={deliveryPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                >
                  {deliveryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Rider Performance Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Rider Performance</h3>
            {deliveryPerformance.length === 0 && !loading ? (
              <EmptyState icon={Truck} title="No delivery performance data available" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rider</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Total</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Completed</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deliveryPerformance.map((rider: DeliveryPerformanceItem, index: number) => {
                      const riderName = rider.rider?.name ||
                                       `${rider.rider?.first_name || ''} ${rider.rider?.last_name || ''}`.trim() ||
                                       `Rider ${index + 1}`;
                      const successRate = rider.totalDeliveries > 0
                        ? (rider.completedDeliveries / rider.totalDeliveries) * 100
                        : 0;

                      return (
                        <tr key={rider.rider?.rider_id || index} className="transition-colors hover:bg-gray-50">
                          <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{riderName}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-500">{rider.totalDeliveries}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-500">{rider.completedDeliveries}</td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              successRate > 90
                                ? 'bg-emerald-100 text-emerald-700'
                                : successRate > 80
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {successRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Key Insights */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Key Insights</h3>
            <div className="space-y-3">
              {calculatedMetrics.successRate > 90 && (
                <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Excellent Performance</p>
                    <p className="text-xs text-emerald-700">
                      Success rate is {calculatedMetrics.successRate.toFixed(1)}%, above target
                    </p>
                  </div>
                </div>
              )}

              {calculatedMetrics.revenueGrowth > 0 && (
                <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3">
                  <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Revenue Growth</p>
                    <p className="text-xs text-indigo-700">
                      Revenue increased by {calculatedMetrics.revenueGrowth.toFixed(1)}% this period
                    </p>
                  </div>
                </div>
              )}

              {calculatedMetrics.successRate < 85 && calculatedMetrics.successRate > 0 && (
                <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Performance Alert</p>
                    <p className="text-xs text-orange-700">
                      Success rate is {calculatedMetrics.successRate.toFixed(1)}%, below 85% target
                    </p>
                  </div>
                </div>
              )}

              {calculatedMetrics.averageOrderValue > 0 && (
                <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-3">
                  <Eye className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-500" />
                  <div>
                    <p className="text-sm font-medium text-violet-900">Order Value Insight</p>
                    <p className="text-xs text-violet-700">
                      Average order value is KSh {calculatedMetrics.averageOrderValue.toFixed(0)}
                    </p>
                  </div>
                </div>
              )}

              {overviewStats.totalOrders === 0 && !loading && (
                <EmptyState icon={AlertCircle} title="No analytics data found for the selected time period" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-2 text-center text-gray-400">
        <p className="text-xs">
          Last updated: {new Date().toLocaleString()} •
          Data refreshes every 15 minutes •
          Time range: {timeRange}
        </p>
      </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;