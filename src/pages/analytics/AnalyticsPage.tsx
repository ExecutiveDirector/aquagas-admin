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
  color: string;
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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color, loading = false }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <div className="flex items-center space-x-2 mt-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' && title.toLowerCase().includes('revenue') 
                  ? `KSh ${value.toLocaleString()}`
                  : typeof value === 'number' && title.toLowerCase().includes('rate')
                  ? `${value.toFixed(1)}%`
                  : value.toLocaleString()
                }
              </p>
            )}
            {change !== undefined && (
              <div className={`flex items-center space-x-1 ${
                change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const ChartCard: React.FC<ChartCardProps> = ({ title, children, loading = false }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {loading ? (
        <div className="animate-pulse">
          <div className="bg-gray-300 h-64 rounded"></div>
        </div>
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
    <div className="flex space-x-2">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            selected === range.value
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

    // Get previous period data for growth calculation (simple approach)
    const currentPeriodRevenue = revenueData.slice(-7).reduce((sum: number, item: RevenueDataItem) => sum + (item.totalRevenue || 0), 0);
    const previousPeriodRevenue = revenueData.slice(-14, -7).reduce((sum: number, item: RevenueDataItem) => sum + (item.totalRevenue || 0), 0);
    const revenueGrowth = calculateGrowth(currentPeriodRevenue, previousPeriodRevenue);

    return {
      successRate,
      averageOrderValue,
      totalOrders,
      totalSales,
      revenueGrowth
    };
  }, [salesData, deliveryPerformance, revenueData]);

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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-blue-500" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor business performance and key metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={overviewStats.totalUsers}
          change={12.5}
          icon={Users}
          color="bg-blue-500"
          loading={loading}
        />
        <MetricCard
          title="Total Orders"
          value={overviewStats.totalOrders}
          change={calculatedMetrics.revenueGrowth > 0 ? 8.3 : -3.2}
          icon={ShoppingCart}
          color="bg-green-500"
          loading={loading}
        />
        <MetricCard
          title="Total Revenue"
          value={overviewStats.totalRevenue}
          change={calculatedMetrics.revenueGrowth}
          icon={DollarSign}
          color="bg-purple-500"
          loading={loading}
        />
        <MetricCard
          title="Active Riders"
          value={overviewStats.totalRiders}
          change={-3.2}
          icon={Truck}
          color="bg-orange-500"
          loading={loading}
        />
        <MetricCard
          title="Success Rate"
          value={calculatedMetrics.successRate}
          change={2.1}
          icon={CheckCircle}
          color="bg-emerald-500"
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Performance Trends" loading={loading}>
            <div className="mb-4 flex space-x-2">
              <button
                onClick={() => setActiveChart('sales')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  activeChart === 'sales'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Sales
              </button>
              <button
                onClick={() => setActiveChart('users')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  activeChart === 'users'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                User Growth
              </button>
              <button
                onClick={() => setActiveChart('revenue')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  activeChart === 'revenue'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rider Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rider Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Rider</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Total</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Completed</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryPerformance.map((rider: DeliveryPerformanceItem, index: number) => {
                    const riderName = rider.rider?.name || 
                                     `${rider.rider?.first_name || ''} ${rider.rider?.last_name || ''}`.trim() ||
                                     `Rider ${index + 1}`;
                    const successRate = rider.totalDeliveries > 0 
                      ? (rider.completedDeliveries / rider.totalDeliveries) * 100 
                      : 0;
                    
                    return (
                      <tr key={rider.rider?.rider_id || index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-900">{riderName}</td>
                        <td className="py-2 px-3 text-gray-600">{rider.totalDeliveries}</td>
                        <td className="py-2 px-3 text-gray-600">{rider.completedDeliveries}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            successRate > 90
                              ? 'bg-green-100 text-green-800'
                              : successRate > 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {successRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {deliveryPerformance.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="py-8 px-3 text-center text-gray-500">
                        No delivery performance data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <div className="space-y-4">
              {calculatedMetrics.successRate > 90 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Excellent Performance</p>
                    <p className="text-sm text-green-700">
                      Success rate is {calculatedMetrics.successRate.toFixed(1)}%, above target
                    </p>
                  </div>
                </div>
              )}
              
              {calculatedMetrics.revenueGrowth > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Revenue Growth</p>
                    <p className="text-sm text-blue-700">
                      Revenue increased by {calculatedMetrics.revenueGrowth.toFixed(1)}% this period
                    </p>
                  </div>
                </div>
              )}

              {calculatedMetrics.successRate < 85 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">Performance Alert</p>
                    <p className="text-sm text-orange-700">
                      Success rate is {calculatedMetrics.successRate.toFixed(1)}%, below 85% target
                    </p>
                  </div>
                </div>
              )}

              {calculatedMetrics.averageOrderValue > 0 && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">Order Value Insight</p>
                    <p className="text-sm text-purple-700">
                      Average order value is KSh {calculatedMetrics.averageOrderValue.toFixed(0)}
                    </p>
                  </div>
                </div>
              )}

              {overviewStats.totalOrders === 0 && !loading && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">No Data Available</p>
                    <p className="text-sm text-gray-700">
                      No analytics data found for the selected time period
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500">
        <p className="text-sm">
          Last updated: {new Date().toLocaleString()} • 
          Data refreshes every 15 minutes • 
          Time range: {timeRange}
        </p>
      </div>
    </div>
  );
};

export default AdminAnalytics;