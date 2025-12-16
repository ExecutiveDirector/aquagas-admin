// src/pages/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
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
      const res = await listOrders(1, 5, { status: "pending" });
      if (!mountedRef.current) return;
      setOrders(res?.data || res || []);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
    } finally {
      setOrderLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, [fetchStats, fetchOrders]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    setIsPolling(true);
    const interval = window.setInterval(() => {
      fetchStats();
      fetchOrders();
    }, 60_000);
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [autoRefresh, fetchStats, fetchOrders]);

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

        if (pct < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };

      rafRef.current = requestAnimationFrame(step);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return display;
  };

  // ========================= Sparkline Component =========================
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

    const colorMap = {
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

  // ========================= StatCard Component =========================
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
    const accentMap = {
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

  // ========================= Skeleton =========================
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
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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

  // ========================= Error Banner =========================
  const ErrorBanner = ({ message }: { message: string }) => (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg" role="alert">
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
          <div className="font-semibold text-red-800 dark:text-red-300">Unable to load dashboard</div>
          <div className="text-sm text-red-700 dark:text-red-400">{message}</div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                fetchStats();
                fetchOrders();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              {autoRefresh ? "Stop auto-refresh" : "Enable auto-refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ========================= Manual Refresh =========================
  const onManualRefresh = () => {
    fetchStats();
    fetchOrders();
  };

  // ========================= Render =========================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Platform overview • Real-time insights</p>
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
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
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

        {error && <ErrorBanner message={error} />}

        {/* Primary Stats Grid */}
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
                <StatCard title="Total Revenue" value={stats.totalRevenue} subtitle="All time • USD" accent="teal" icon="📈" />
              )}
              {stats?.pendingOrders !== undefined && (
                <StatCard title="Pending Orders" value={stats.pendingOrders} subtitle="Awaiting action" accent="yellow" icon="⏳" />
              )}
              {stats?.completedOrders !== undefined && (
                <StatCard
                  title="Completed Orders"
                  value={stats.completedOrders}
                  subtitle="Delivered today"
                  accent="green"
                  icon="✅"
                />
              )}
            </>
          )}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Pending Orders</h2>
            <button onClick={fetchOrders} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Refresh {orderLoading && "• Loading..."}
            </button>
          </div>

          <div className="overflow-x-auto">
            {orderLoading ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">No pending orders.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Order ID</th>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Vendor</th>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="py-4 px-6 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="py-4 px-6 font-mono text-gray-900 dark:text-white">
                        {o.id.slice(0, 10)}...
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {o.customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{o.customerName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-700 dark:text-gray-300">{o.vendorName}</td>
                      <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        ${o.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={o.status.toLowerCase()} />
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}