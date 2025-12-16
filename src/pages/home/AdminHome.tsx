import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Users, Store, Bike, DollarSign, Package, CheckCircle, Clock, RefreshCw, Bell, Search, Filter, MoreVertical, ArrowUpRight, Calendar } from "lucide-react";

// Import your actual services
import { getDashboardStats } from "../../services/api";
import { listOrders } from "../../services/orderService";

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  sparklines?: {
    users?: number[];
    vendors?: number[];
    riders?: number[];
    orders?: number[];
    todayRevenue?: number[];
  };
}

interface Order {
  id: string;
  customerName: string;
  vendorName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [orderLoading, setOrderLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ========================= Fetch Stats =========================
  const fetchStats = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getDashboardStats({ signal: controller.signal } as any);
      if (!mountedRef.current) return;
      setStats(data);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("AdminHome fetch error:", err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load dashboard stats";
      setError(message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ========================= Fetch Orders =========================
  const fetchOrders = useCallback(async () => {
    setOrderLoading(true);
    try {
      const res = await listOrders(1, 5, { status: 'pending' });
      if (!mountedRef.current) return;
      setOrders(res?.data || res || []);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, [fetchStats, fetchOrders]);

  // Poll every 60s if auto refresh enabled
  useEffect(() => {
    if (!autoRefresh) return;
    let interval: number | undefined;
    setIsPolling(true);
    interval = window.setInterval(() => {
      fetchStats();
      fetchOrders();
    }, 60_000);
    return () => {
      if (interval) window.clearInterval(interval);
      setIsPolling(false);
    };
  }, [autoRefresh, fetchStats, fetchOrders]);

  const useCountUp = (value?: number, duration = 1000) => {
    const [display, setDisplay] = useState<number>(value ?? 0);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef<number>(0);
    
    useEffect(() => {
      if (value === undefined || value === null) {
        setDisplay(0);
        return;
      }
      
      const start = performance.now();
      startRef.current = start;
      fromRef.current = display;
      
      const step = (t: number) => {
        const elapsed = t - (startRef.current ?? 0);
        const pct = Math.min(1, elapsed / duration);
        const easeOutQuart = 1 - Math.pow(1 - pct, 4);
        const next = Math.round((fromRef.current + (value - fromRef.current) * easeOutQuart) * 100) / 100;
        setDisplay(next);
        
        if (pct < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };
      
      rafRef.current = requestAnimationFrame(step);
      
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, [value]);
    
    return display;
  };

  const Sparkline = ({ points, trend }: { points?: number[]; trend?: "up" | "down" }) => {
    if (!points?.length) return <div className="opacity-40 text-xs">—</div>;
    
    const w = 80;
    const h = 32;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const path = points.map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");

    return (
      <div className="flex items-center gap-2">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60">
          <defs>
            <linearGradient id={`gradient-${trend}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={trend === "up" ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={trend === "up" ? "#10b981" : "#ef4444"} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#gradient-${trend})`} />
          <path d={path} fill="none" stroke={trend === "up" ? "#10b981" : "#ef4444"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {trend && points.length >= 2 && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
            {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {(((points[points.length - 1] - points[0]) / points[0]) * 100).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, spark, accent, trend }: any) => {
    const animated = useCountUp(value);
    const accentMap: Record<string, any> = {
      blue: { bg: "bg-gradient-to-br from-blue-500 to-blue-600", light: "bg-blue-50", ring: "ring-blue-500/20" },
      green: { bg: "bg-gradient-to-br from-green-500 to-green-600", light: "bg-green-50", ring: "ring-green-500/20" },
      purple: { bg: "bg-gradient-to-br from-purple-500 to-purple-600", light: "bg-purple-50", ring: "ring-purple-500/20" },
      orange: { bg: "bg-gradient-to-br from-orange-500 to-orange-600", light: "bg-orange-50", ring: "ring-orange-500/20" },
      emerald: { bg: "bg-gradient-to-br from-emerald-500 to-emerald-600", light: "bg-emerald-50", ring: "ring-emerald-500/20" },
      rose: { bg: "bg-gradient-to-br from-rose-500 to-rose-600", light: "bg-rose-50", ring: "ring-rose-500/20" },
    };

    return (
      <div className={`group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1 ${accentMap[accent].ring} ring-0 hover:ring-4`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`${accentMap[accent].bg} p-3 rounded-xl shadow-lg`}>
            <Icon className="text-white" size={24} />
          </div>
          <MoreVertical size={18} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {typeof value === "number" ? animated.toLocaleString() : "—"}
            </p>
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
        </div>

        {spark && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Sparkline points={spark} trend={trend} />
          </div>
        )}
      </div>
    );
  };

  const QuickAction = ({ icon: Icon, label, color }: any) => (
    <button className={`flex items-center gap-3 px-4 py-3 rounded-xl ${color} hover:scale-105 transition-transform duration-200 shadow-sm hover:shadow-md`}>
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, any> = {
      pending: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock },
      completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle },
      cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: Clock },
    };
    const style = styles[status.toLowerCase()] || styles.pending;
    const Icon = style.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        <Icon size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const ErrorBanner = ({ message }: { message: string }) => (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl shadow-sm" role="alert">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <div className="font-semibold text-red-700">Unable to load dashboard</div>
          <div className="text-sm text-red-600 mt-1">{message}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { fetchStats(); fetchOrders(); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Retry
            </button>
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {autoRefresh ? "Stop auto-refresh" : "Enable auto-refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const StatSkeleton = () => (
    <div className="rounded-2xl p-6 bg-white border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-36 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  );

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || order.status.toLowerCase() === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Show loading skeleton on initial load
  if (loading && !stats && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatSkeleton /> <StatSkeleton /> <StatSkeleton /> <StatSkeleton />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatSkeleton /> <StatSkeleton /> <StatSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-gray-500 mt-2 flex items-center gap-2">
              <Calendar size={16} />
              {lastUpdated 
                ? new Date(lastUpdated).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : "Not updated yet"
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            
            <button
              onClick={() => { fetchStats(); fetchOrders(); }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="font-medium">Refresh</span>
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                autoRefresh 
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30" 
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {autoRefresh ? "Auto ON" : "Auto OFF"}
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading && !stats ? (
            <>
              <StatSkeleton /> <StatSkeleton /> <StatSkeleton /> <StatSkeleton />
            </>
          ) : stats ? (
            <>
              <StatCard 
                icon={Users} 
                title="Total Users" 
                value={stats.users} 
                spark={stats.sparklines?.users} 
                accent="blue" 
                trend={stats.sparklines?.users && stats.sparklines.users.length >= 2 && stats.sparklines.users[stats.sparklines.users.length - 1] > stats.sparklines.users[0] ? "up" : "down"} 
              />
              <StatCard 
                icon={Store} 
                title="Active Vendors" 
                value={stats.vendors} 
                spark={stats.sparklines?.vendors} 
                accent="green" 
                trend={stats.sparklines?.vendors && stats.sparklines.vendors.length >= 2 && stats.sparklines.vendors[stats.sparklines.vendors.length - 1] > stats.sparklines.vendors[0] ? "up" : "down"} 
              />
              <StatCard 
                icon={Bike} 
                title="Delivery Riders" 
                value={stats.riders} 
                spark={stats.sparklines?.riders} 
                accent="purple" 
                trend={stats.sparklines?.riders && stats.sparklines.riders.length >= 2 && stats.sparklines.riders[stats.sparklines.riders.length - 1] > stats.sparklines.riders[0] ? "up" : "down"} 
              />
              <StatCard 
                icon={DollarSign} 
                title="Today's Revenue" 
                value={stats.todayRevenue} 
                subtitle="USD" 
                spark={stats.sparklines?.todayRevenue} 
                accent="orange" 
                trend={stats.sparklines?.todayRevenue && stats.sparklines.todayRevenue.length >= 2 && stats.sparklines.todayRevenue[stats.sparklines.todayRevenue.length - 1] > stats.sparklines.todayRevenue[0] ? "up" : "down"} 
              />
            </>
          ) : (
            <div className="col-span-4 text-center py-12">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading && !stats ? (
            <>
              <StatSkeleton /> <StatSkeleton /> <StatSkeleton />
            </>
          ) : stats ? (
            <>
              {stats.totalRevenue !== undefined && (
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign size={32} className="opacity-80" />
                    <ArrowUpRight size={24} />
                  </div>
                  <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Total Revenue</h3>
                  <p className="text-4xl font-bold mt-2">${useCountUp(stats.totalRevenue).toLocaleString()}</p>
                  <p className="text-emerald-100 text-sm mt-2">All-time earnings</p>
                </div>
              )}

              {stats.pendingOrders !== undefined && (
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <Clock size={32} className="opacity-80" />
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">Live</span>
                  </div>
                  <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Pending Orders</h3>
                  <p className="text-4xl font-bold mt-2">{useCountUp(stats.pendingOrders)}</p>
                  <p className="text-amber-100 text-sm mt-2">Awaiting processing</p>
                </div>
              )}

              {stats.completedOrders !== undefined && (
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle size={32} className="opacity-80" />
                    <TrendingUp size={24} />
                  </div>
                  <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Completed Orders</h3>
                  <p className="text-4xl font-bold mt-2">{useCountUp(stats.completedOrders)}</p>
                  <p className="text-green-100 text-sm mt-2">Successfully delivered</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package size={20} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Users} label="Add User" color="bg-blue-50 text-blue-700" />
            <QuickAction icon={Store} label="New Vendor" color="bg-green-50 text-green-700" />
            <QuickAction icon={Bike} label="Add Rider" color="bg-purple-50 text-purple-700" />
            <QuickAction icon={Package} label="View Orders" color="bg-orange-50 text-orange-700" />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package size={24} />
                Recent Orders
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <Filter size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {["all", "pending", "completed", "cancelled"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeFilter === filter
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {orderLoading ? (
            <div className="text-center py-12">
              <RefreshCw size={48} className="mx-auto text-gray-300 mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No orders available</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here once you have data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">{order.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {order.customerName.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{order.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{order.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">${order.totalAmount.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={16} className="text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!orderLoading && filteredOrders.length === 0 && orders.length > 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}