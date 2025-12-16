// src/pages/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats } from "../../services/api";
import { listOrders } from "../../services/orderService";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  sparklines?: {
    users?: number[];
    vendors?: number[];
    riders?: number[];
    todayRevenue?: number[];
  };
}

interface Order {
  id: string;
  customerName: string;
  vendorName: string;
  totalAmount: number;
  status: "pending" | "assigned" | "completed" | "cancelled";
  createdAt: string;
}

const ORDER_TABS = ["new", "pending", "assigned", "completed", "cancelled"] as const;
type OrderTab = typeof ORDER_TABS[number];

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<OrderTab, Order[]>>({
    new: [],
    pending: [],
    assigned: [],
    completed: [],
    cancelled: [],
  });
  const [activeTab, setActiveTab] = useState<OrderTab>("new");
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ========================= Fetch Dashboard Stats =========================
  const fetchStats = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getDashboardStats({ signal: controller.signal });
      if (!mountedRef.current) return;
      setStats(data);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Fetch stats error:", err);
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

  // ========================= Fetch All Orders by Status =========================
  const fetchAllOrders = useCallback(async () => {
    setOrderLoading(true);
    try {
      // Fetch multiple pages/statuses in parallel – adjust based on your actual API capabilities
      const [pendingRes, assignedRes, completedRes, cancelledRes] = await Promise.all([
        listOrders(1, 30, { status: "pending" }),
        listOrders(1, 30, { status: "assigned" }),
        listOrders(1, 30, { status: "completed" }),
        listOrders(1, 30, { status: "cancelled" }),
      ]);

      const allOrders: Order[] = [
        ...(pendingRes?.data || []),
        ...(assignedRes?.data || []),
        ...(completedRes?.data || []),
        ...(cancelledRes?.data || []),
      ];

      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      const categorized: Record<OrderTab, Order[]> = {
        new: [],
        pending: [],
        assigned: [],
        completed: [],
        cancelled: [],
      };

      allOrders.forEach((order) => {
        const createdTime = new Date(order.createdAt).getTime();

        if (createdTime > fiveMinutesAgo) {
          categorized.new.push(order);
        }

        if (order.status === "pending") categorized.pending.push(order);
        else if (order.status === "assigned") categorized.assigned.push(order);
        else if (order.status === "completed") categorized.completed.push(order);
        else if (order.status === "cancelled") categorized.cancelled.push(order);
      });

      if (mountedRef.current) {
        setOrdersByStatus(categorized);
      }
    } catch (err: any) {
      console.error("Failed to load orders:", err);
    } finally {
      if (mountedRef.current) setOrderLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchAllOrders();
  }, [fetchStats, fetchAllOrders]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    setIsPolling(true);
    const interval = setInterval(() => {
      fetchStats();
      fetchAllOrders();
    }, 60_000);
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [autoRefresh, fetchStats, fetchAllOrders]);

  // ========================= Count Up Animation =========================
  const useCountUp = (value?: number, duration = 600) => {
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
        const next = Math.round((fromRef.current + (value - fromRef.current) * pct) * 100) / 100;
        setDisplay(next);
        if (pct < 1) rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return display;
  };

  // ========================= Sparkline =========================
  const Sparkline = ({ points, color = "blue" }: { points?: number[]; color?: string }) => {
    if (!points || points.length === 0) return <div className="text-xs opacity-50">No data</div>;

    const w = 120;
    const h = 40;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const path = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * h + 4;
        return `\( {i === 0 ? "M" : "L"} \){x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    const fillPath = `\( {path} L \){w} \( {h} L 0 \){h} Z`;

    const colorMap: Record<string, string> = {
      blue: "text-blue-500",
      green: "text-green-500",
      purple: "text-purple-500",
      orange: "text-orange-500",
      teal: "text-teal-500",
      yellow: "text-yellow-500",
    };

    return (
      <svg width={w} height={h} viewBox={`0 0 \( {w} \){h}`} className="overflow-visible">
        <path d={fillPath} fill="currentColor" className={`${colorMap[color]} opacity-10`} />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`${colorMap[color]} opacity-70`}
          strokeLinecap="round"
        />
      </svg>
    );
  };

  // ========================= StatCard =========================
  const StatCard = ({
    title,
    value,
    subtitle,
    spark,
    accent = "blue",
    icon,
  }: {
    title: string;
    value?: number;
    subtitle?: string;
    spark?: number[];
    accent?: "blue" | "green" | "purple" | "orange" | "teal" | "yellow";
    icon: string;
  }) => {
    const animated = useCountUp(value);
    const accentMap: Record<string, string> = {
      blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20",
      green: "bg-green-500/10 text-green-600 dark:bg-green-500/20",
      purple: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20",
      orange: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20",
      teal: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20",
      yellow: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20",
    };

    return (
      <div
        className={`rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${accentMap[accent]}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {typeof value === "number" ? animated.toLocaleString() : "—"}
              </p>
              {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="p-3 rounded-xl bg-white/70 dark:bg-gray-900/50 shadow-sm">
              <span className="text-2xl">{icon}</span>
            </div>
            {spark && <Sparkline points={spark} color={accent} />}
          </div>
        </div>
      </div>
    );
  };

  const StatSkeleton = () => (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );

  // ========================= Status Badge =========================
  const StatusBadge = ({ status }: { status: string }) => {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      assigned: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-medium rounded-full ${
          colorMap[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800"
        }`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  // ========================= Order Card =========================
  const OrderCard = ({ order }: { order: Order }) => {
    const minsAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    const timeAgo = minsAgo < 60 ? `\( {minsAgo}m ago` : ` \){Math.floor(minsAgo / 60)}h ago`;

    return (
      <div className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-lg font-bold shadow">
              {order.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{order.vendorName}</p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${order.totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Order ID</p>
            <p className="font-mono text-xs text-gray-600 dark:text-gray-300">
              {order.id.slice(0, 10)}...
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ========================= Chart Data (Real from API) =========================
  const weeklyRevenueData = stats?.sparklines?.todayRevenue?.map((rev, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] || `Day ${i + 1}`,
    revenue: rev,
  })) || [];

  const ordersByStatusData = [
    { status: "Pending", count: ordersByStatus.pending.length },
    { status: "Assigned", count: ordersByStatus.assigned.length },
    { status: "Completed", count: ordersByStatus.completed.length },
    { status: "Cancelled", count: ordersByStatus.cancelled.length },
  ];

  const revenuePieData = [
    { name: "Today", value: stats?.todayRevenue || 0, fill: "#f97316" },
    {
      name: "Previous",
      value: stats?.totalRevenue ? stats.totalRevenue - (stats.todayRevenue || 0) : 0,
      fill: "#e2e8f0",
    },
  ];

  const onManualRefresh = () => {
    fetchStats();
    fetchAllOrders();
  };

  const newOrdersCount = ordersByStatus.new.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Platform overview • Real-time insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  autoRefresh
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                />
                {isPolling ? "Auto-refresh on" : "Auto-refresh off"}
              </div>
              {lastUpdated && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={onManualRefresh}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              Refresh
            </button>
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {autoRefresh ? "Auto" : "Manual"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-semibold text-red-800 dark:text-red-300">Unable to load data</div>
                <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading && !stats ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={stats?.users}
                subtitle="Registered"
                spark={stats?.sparklines?.users}
                accent="blue"
                icon="👥"
              />
              <StatCard
                title="Total Vendors"
                value={stats?.vendors}
                subtitle="Active"
                spark={stats?.sparklines?.vendors}
                accent="green"
                icon="🏪"
              />
              <StatCard
                title="Total Riders"
                value={stats?.riders}
                subtitle="Online"
                spark={stats?.sparklines?.riders}
                accent="purple"
                icon="🚀"
              />
              <StatCard
                title="Today's Revenue"
                value={stats?.todayRevenue}
                subtitle="USD"
                spark={stats?.sparklines?.todayRevenue}
                accent="orange"
                icon="💰"
              />
            </>
          )}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading && !stats ? (
            Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              {stats?.totalRevenue !== undefined && (
                <StatCard
                  title="Total Revenue"
                  value={stats.totalRevenue}
                  subtitle="All time • USD"
                  accent="teal"
                  icon="📈"
                />
              )}
              <StatCard
                title="Pending Orders"
                value={ordersByStatus.pending.length}
                subtitle="Awaiting action"
                accent="yellow"
                icon="⏳"
              />
              <StatCard
                title="Completed Today"
                value={ordersByStatus.completed.length}
                subtitle="Delivered"
                accent="green"
                icon="✅"
              />
            </>
          )}
        </div>

        {/* Performance Charts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Performance Overview
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                Revenue Trend (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => `\[ {Number(value).toFixed(2)}`} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                Orders by Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-3 flex justify-center">
              <div className="w-full max-w-xs">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 text-center">
                  Revenue Share
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={revenuePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenuePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => ` \]{Number(value).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Live Orders - Swipeable Tabs & Horizontal Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live Orders</h2>
              <button
                onClick={fetchAllOrders}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Refresh {orderLoading && "• Loading..."}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {ORDER_TABS.map((tab) => {
                const count = ordersByStatus[tab].length;
                const isActive = activeTab === tab;
                const hasNew = tab === "new" && count > 0;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-2.5 rounded-lg font-medium capitalize transition-all flex items-center gap-2 whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tab === "new" ? "New Orders" : tab}
                    {count > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          isActive ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {hasNew && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse ring-4 ring-red-500/30" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {orderLoading ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading orders...</div>
            ) : ordersByStatus[activeTab].length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {activeTab === "new" ? "No new orders right now" : `No ${activeTab} orders`}
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {ordersByStatus[activeTab].map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}