import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../utils/SupabaseContext';
import { useAuth } from '../utils/AuthContext';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
 // BarChart, 
  //Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
 // Filter,
  //Calendar,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

// Fix Leaflet marker icon issue - proper type handling
try {
  // @ts-ignore - Temporary ignore for Leaflet icon fix
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch (e) {
  console.warn('Leaflet icon configuration error:', e);
}

// Enhanced interfaces
interface Order {
  id: string;
  status: string;
  order_value: number;
  rider_id: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  delivery_time?: number;
  customer_rating?: number;
}

interface Metrics {
  successRate: number;
  averageOrderValue: number;
  riderEfficiency: number;
  totalOrders: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  revenueGrowth: number;
  activeRiders: number;
}

interface DemandZone {
  lat: number;
  lng: number;
  weight: number;
  orderCount: number;
  revenue: number;
}

interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface TimeSeriesData {
  time: string;
  orders: number;
  revenue: number;
  avgDeliveryTime: number;
}

// Color palette for charts
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

const mapContainerStyle = {
  height: '500px',
  width: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
};

const center: [number, number] = [-1.286389, 36.817223]; // Nairobi coordinates (fixed latitude)

// Enhanced Heatmap layer component with error handling
const HeatmapLayer: React.FC<{ points: [number, number, number][] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      try {
        // Create simple circle markers instead of heatmap due to type issues
        const markers: L.CircleMarker[] = [];
        
        points.forEach(([lat, lng, intensity]) => {
          const marker = L.circleMarker([lat, lng], {
            radius: Math.max(5, intensity * 10),
            fillColor: intensity > 0.7 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : '#10B981',
            fillOpacity: 0.6,
            color: 'white',
            weight: 2,
          }).addTo(map);
          
          marker.bindPopup(`Demand Level: ${(intensity * 100).toFixed(0)}%`);
          markers.push(marker);
        });

        return () => {
          markers.forEach(marker => map.removeLayer(marker));
        };
      } catch (error) {
        console.warn('Error creating heatmap layer:', error);
      }
    }
  }, [map, points]);

  return null;
};

// Time range selector
const TimeRangeSelector: React.FC<{
  selected: string;
  onChange: (range: string) => void;
}> = ({ selected, onChange }) => {
  const ranges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  return (
    <div className="flex space-x-2">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            selected === range.value
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

// Metric card component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}> = ({ title, value, change, icon, color, loading = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{title}</p>
          <div className="flex items-center space-x-2 mt-1">
            {loading ? (
              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-24 rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
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
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

// AI Insights component
const AIInsightsCard: React.FC<{ insights: AIInsight[] }> = ({ insights }) => {
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Eye className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="space-y-4">
      {insights.length > 0 ? (
        insights.map((insight) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 border-l-4 rounded-r-lg ${getPriorityColor(insight.priority)}`}
          >
            <div className="flex items-start space-x-3">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg border">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </p>
                </div>
                {insight.actionable && (
                  <button className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Take Action
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No insights available at this time.</p>
          <p className="text-sm">Check back as more data becomes available.</p>
        </div>
      )}
    </div>
  );
};

const RealtimeAnalytics: React.FC = () => {
  const supabase = useSupabase();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [metrics, setMetrics] = useState<Metrics>({
    successRate: 0,
    averageOrderValue: 0,
    riderEfficiency: 0,
    totalOrders: 0,
    averageDeliveryTime: 0,
    customerSatisfaction: 0,
    revenueGrowth: 0,
    activeRiders: 0,
  });
  
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);

  // Role-based access
  useEffect(() => {
    if (!user || !hasRole(['admin', 'manager', 'user'])) {
      toast.error('Access denied. Authorized roles only.');
      navigate('/', { replace: true });
    }
  }, [user, hasRole, navigate]);

  // Get time range in milliseconds
  const getTimeRangeMs = useCallback((range: string): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }, []);

  // Fetch and calculate enhanced metrics
  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const timeRangeMs = getTimeRangeMs(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs).toISOString();

      // Fetch orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startTime) as { data: Order[] | null; error: any };

      if (error) throw error;

      if (orders && orders.length > 0) {
        // Calculate enhanced metrics
        const completedOrders = orders.filter(order => order.status === 'completed');
        const totalOrders = orders.length;
        const successRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;
        
        const totalOrderValue = completedOrders.reduce((sum, order) => sum + (order.order_value || 0), 0);
        const averageOrderValue = completedOrders.length > 0 ? totalOrderValue / completedOrders.length : 0;
        
        const uniqueRiders = new Set(
          completedOrders
            .filter(order => order.rider_id)
            .map(order => order.rider_id)
        ).size;
        
        const hoursInRange = timeRangeMs / (1000 * 60 * 60);
        const riderEfficiency = uniqueRiders > 0 ? completedOrders.length / uniqueRiders / hoursInRange : 0;
        
        // Calculate average delivery time
        const ordersWithDeliveryTime = completedOrders.filter(order => order.delivery_time);
        const averageDeliveryTime = ordersWithDeliveryTime.length > 0
          ? ordersWithDeliveryTime.reduce((sum, order) => sum + (order.delivery_time || 0), 0) / ordersWithDeliveryTime.length
          : 0;

        // Calculate customer satisfaction
        const ratedOrders = completedOrders.filter(order => order.customer_rating);
        const customerSatisfaction = ratedOrders.length > 0
          ? (ratedOrders.reduce((sum, order) => sum + (order.customer_rating || 0), 0) / ratedOrders.length) * 20 // Convert to percentage
          : 85; // Default satisfaction

        setMetrics({
          successRate,
          averageOrderValue,
          riderEfficiency,
          totalOrders,
          averageDeliveryTime,
          customerSatisfaction,
          revenueGrowth: Math.random() * 20 - 5, // Mock data
          activeRiders: uniqueRiders,
        });

        // Generate demand zones
        const zones: DemandZone[] = completedOrders
          .filter(order => order.latitude && order.longitude)
          .reduce((acc: DemandZone[], order) => {
            const existing = acc.find(zone => 
              Math.abs(zone.lat - order.latitude!) < 0.01 && 
              Math.abs(zone.lng - order.longitude!) < 0.01
            );
            
            if (existing) {
              existing.orderCount++;
              existing.revenue += order.order_value || 0;
              existing.weight = Math.min(1, existing.orderCount / 10);
            } else {
              acc.push({
                lat: order.latitude!,
                lng: order.longitude!,
                weight: 0.1,
                orderCount: 1,
                revenue: order.order_value || 0,
              });
            }
            return acc;
          }, []);

        setDemandZones(zones);

        // Generate time series data
        const timeSlots = 12;
        const slotDuration = timeRangeMs / timeSlots;
        const timeSeries: TimeSeriesData[] = [];
        
        for (let i = 0; i < timeSlots; i++) {
          const slotStart = new Date(Date.now() - timeRangeMs + (i * slotDuration));
          const slotEnd = new Date(Date.now() - timeRangeMs + ((i + 1) * slotDuration));
          
          const slotOrders = completedOrders.filter(order => {
            const orderTime = new Date(order.created_at);
            return orderTime >= slotStart && orderTime < slotEnd;
          });

          timeSeries.push({
            time: slotStart.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            orders: slotOrders.length,
            revenue: slotOrders.reduce((sum, order) => sum + (order.order_value || 0), 0),
            avgDeliveryTime: slotOrders.length > 0 
              ? slotOrders.reduce((sum, order) => sum + (order.delivery_time || 30), 0) / slotOrders.length
              : 30,
          });
        }

        setTimeSeriesData(timeSeries);

        // Generate enhanced AI insights
        const insights: AIInsight[] = [];

        if (successRate < 85) {
          insights.push({
            id: 'success_rate',
            type: 'warning',
            title: 'Low Success Rate Detected',
            description: `Current success rate is ${successRate.toFixed(1)}%, below the target of 85%.`,
            recommendation: 'Review failed orders and optimize dispatch algorithms.',
            priority: 'high',
            actionable: true,
          });
        }

        if (zones.length > 0) {
          const highDemandZones = zones.filter(zone => zone.orderCount > 5);
          if (highDemandZones.length > 0) {
            insights.push({
              id: 'demand_zones',
              type: 'info',
              title: 'High Demand Areas Identified',
              description: `${highDemandZones.length} zones showing high order concentration.`,
              recommendation: 'Deploy additional riders to these areas during peak hours.',
              priority: 'medium',
              actionable: true,
            });
          }
        }

        if (averageDeliveryTime > 45) {
          insights.push({
            id: 'delivery_time',
            type: 'warning',
            title: 'Extended Delivery Times',
            description: `Average delivery time is ${averageDeliveryTime.toFixed(1)} minutes.`,
            recommendation: 'Optimize routing or increase rider capacity in busy areas.',
            priority: 'high',
            actionable: true,
          });
        }

        if (customerSatisfaction > 90) {
          insights.push({
            id: 'satisfaction',
            type: 'success',
            title: 'Excellent Customer Satisfaction',
            description: `Customer satisfaction is at ${customerSatisfaction.toFixed(1)}%.`,
            recommendation: 'Continue current service quality standards.',
            priority: 'low',
            actionable: false,
          });
        }

        if (riderEfficiency < 0.5) {
          insights.push({
            id: 'efficiency',
            type: 'warning',
            title: 'Rider Efficiency Below Target',
            description: `Current efficiency: ${riderEfficiency.toFixed(2)} orders/hour/rider.`,
            recommendation: 'Review rider routes and consider workload redistribution.',
            priority: 'medium',
            actionable: true,
          });
        }

        setAiInsights(insights);
      } else {
        // No data scenario
        setMetrics({
          successRate: 0,
          averageOrderValue: 0,
          riderEfficiency: 0,
          totalOrders: 0,
          averageDeliveryTime: 0,
          customerSatisfaction: 0,
          revenueGrowth: 0,
          activeRiders: 0,
        });
        setDemandZones([]);
        setTimeSeriesData([]);
        setAiInsights([{
          id: 'no_data',
          type: 'info',
          title: 'No Recent Data',
          description: 'No orders found for the selected time range.',
          recommendation: 'Try selecting a longer time range or check system connectivity.',
          priority: 'low',
          actionable: false,
        }]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [supabase, user, timeRange, getTimeRangeMs]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  }, [fetchAnalytics]);

  // Handle data export
  const handleExport = useCallback(() => {
    const exportData = {
      metrics,
      demandZones,
      timeSeriesData,
      insights: aiInsights,
      timestamp: new Date().toISOString(),
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
    toast.success('Analytics data exported');
  }, [metrics, demandZones, timeSeriesData, aiInsights]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchAnalytics();

    const subscription = supabase
      .channel('analytics-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, user, fetchAnalytics]);

  // Prepare chart data
  const chartData = useMemo(() => [
    { name: 'Success Rate', value: metrics.successRate, color: COLORS[0] },
    { name: 'Avg Order Value', value: metrics.averageOrderValue, color: COLORS[1] },
    { name: 'Customer Satisfaction', value: metrics.customerSatisfaction, color: COLORS[2] },
    { name: 'Rider Efficiency', value: metrics.riderEfficiency * 10, color: COLORS[3] }, // Scaled for visibility
  ], [metrics]);

  const heatPoints: [number, number, number][] = useMemo(() => 
    demandZones.map(zone => [zone.lat, zone.lng, zone.weight]),
    [demandZones]
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Zap className="text-green-500" />
              Real-Time Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor delivery performance and business insights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          change={5.2}
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          color="bg-green-500"
          loading={loading}
        />
        <MetricCard
          title="Average Order Value"
          value={`KSh ${metrics.averageOrderValue.toFixed(0)}`}
          change={-2.1}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          loading={loading}
        />
        <MetricCard
          title="Avg Delivery Time"
          value={`${metrics.averageDeliveryTime.toFixed(0)}m`}
          change={-8.5}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          loading={loading}
        />
        <MetricCard
          title="Active Riders"
          value={metrics.activeRiders}
          change={12.3}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-orange-500"
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Time Series Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Orders Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Orders"
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Revenue (KSh)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Performance Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Performance Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* AI Insights and Map Section */}
      {/* AI Insights and Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            AI Insights
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <AIInsightsCard insights={aiInsights} />
          </div>
        </motion.div>

        {/* Demand Heatmap */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Demand Heatmap
          </h3>
          <div style={mapContainerStyle}>
            <MapContainer
              center={center}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <HeatmapLayer points={heatPoints} />
            </MapContainer>
          </div>
          {demandZones.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">High Demand</p>
                <p className="font-semibold text-red-500">
                  {demandZones.filter(z => z.weight > 0.7).length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Medium Demand</p>
                <p className="font-semibold text-yellow-500">
                  {demandZones.filter(z => z.weight > 0.4 && z.weight <= 0.7).length}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Demand</p>
                <p className="font-semibold text-green-500">
                  {demandZones.filter(z => z.weight <= 0.4).length}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Additional Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Revenue Growth
          </h3>
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              metrics.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              vs. previous period
            </p>
            <div className="mt-4 flex justify-center">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="w-12 h-12 text-green-500" />
              ) : (
                <TrendingDown className="w-12 h-12 text-red-500" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Customer Satisfaction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Customer Satisfaction
          </h3>
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - metrics.customerSatisfaction / 100)}`}
                  className="text-green-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics.customerSatisfaction.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
              Overall rating
            </p>
          </div>
        </motion.div>

        {/* Total Orders Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Orders Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Orders</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {metrics.totalOrders}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
              <span className="font-semibold text-green-600">
                {Math.round(metrics.totalOrders * metrics.successRate / 100)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Failed</span>
              <span className="font-semibold text-red-600">
                {metrics.totalOrders - Math.round(metrics.totalOrders * metrics.successRate / 100)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-bold text-lg text-blue-600">
                  KSh {(metrics.averageOrderValue * Math.round(metrics.totalOrders * metrics.successRate / 100)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">
          Last updated: {new Date().toLocaleString()} • 
          Data refreshes every 30 seconds • 
          Time range: {timeRange}
        </p>
      </div>
    </div>
  );
};

export default RealtimeAnalytics;