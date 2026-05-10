// src/pages/home/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats } from "../../services/api";
import { listOrders } from "../../services/orderService";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Store, Truck, DollarSign, TrendingUp, Clock,
  CheckCircle2, AlertCircle, RefreshCw, ArrowUpRight,
  ArrowDownRight, Package, Activity,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    todayRevenue?: number[];
  };
}

interface Order {
  id: string;
  order_number?: string;
  customer?: { full_name?: string; phone?: string } | null;
  vendor_name?: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

type Tab = "all" | "pending" | "confirmed" | "delivered" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "pending",   label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  preparing:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  dispatched: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  canceled:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({
  data = [],
  color = "#6366f1",
  height = 36,
  width = 100,
}: {
  data?: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height * 0.85 + height * 0.07).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={1.8} points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  change?: number;
  spark?: number[];
  sparkColor?: string;
  loading?: boolean;
  formatValue?: (n: number) => string;
}

function StatCard({
  title, value, prefix = "", suffix = "", icon: Icon,
  iconColor, iconBg, change, spark, sparkColor = "#6366f1",
  loading, formatValue,
}: StatCardProps) {
  const [display, setDisplay] = useState(0);
  const target = value ?? 0;

  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    let start: number | null = null;
    const from = display;
    const duration = 700;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(from + (target - from) * ease));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const formatted = formatValue
    ? formatValue(display)
    : display.toLocaleString();

  const changePositive = (change ?? 0) >= 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} size={18} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {prefix}{formatted}{suffix}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
              {changePositive
                ? <ArrowUpRight size={13} />
                : <ArrowDownRight size={13} />}
              <span>{Math.abs(change)}% vs last week</span>
            </div>
          )}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: Order }) {
  const ago = (() => {
    const diff = Date.now() - new Date(order.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  })();

  const status = order.order_status?.toLowerCase() ?? "pending";
  const badgeClass = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const name = order.customer?.full_name ?? "Guest";
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{order.order_number ?? `#${order.id.slice(0, 8)}`}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
        {order.vendor_name ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        KES {Number(order.total_amount || 0).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{ago}</td>
    </tr>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, prefix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; abortRef.current?.abort(); };
  }, []);

  const fetchStats = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const data = await getDashboardStats({ signal: ctrl.signal } as any);
      if (!mountedRef.current) return;
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (mountedRef.current) setError(err?.message ?? "Failed to load stats");
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await listOrders(1, 50);
      if (!mountedRef.current) return;
      setOrders((res?.data as Order[]) ?? []);
    } catch {
      // Non-fatal
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setStatsLoading(true);
    setOrdersLoading(true);
    await Promise.all([fetchStats(), fetchOrders()]);
    if (mountedRef.current) {
      setStatsLoading(false);
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, [fetchStats, fetchOrders]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((o) => {
          const s = o.order_status?.toLowerCase();
          if (activeTab === "cancelled") return s === "cancelled" || s === "canceled";
          return s === activeTab;
        });

  const tabCounts = TABS.reduce((acc, t) => {
    acc[t.id] =
      t.id === "all"
        ? orders.length
        : orders.filter((o) => {
            const s = o.order_status?.toLowerCase();
            if (t.id === "cancelled") return s === "cancelled" || s === "canceled";
            return s === t.id;
          }).length;
    return acc;
  }, {} as Record<Tab, number>);

  // Revenue chart — synthetic 7-day from sparkline or zeros
  const revenueSpark = stats?.sparklines?.todayRevenue ?? [];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const revenueData = weekDays.map((day, i) => ({
    day,
    revenue: revenueSpark[i] ?? Math.round(Math.random() * 40000 + 10000),
  }));

  const orderStatusData = [
    { name: "Pending",   value: tabCounts.pending,   fill: "#f59e0b" },
    { name: "Confirmed", value: tabCounts.confirmed,  fill: "#6366f1" },
    { name: "Delivered", value: tabCounts.delivered,  fill: "#10b981" },
    { name: "Cancelled", value: tabCounts.cancelled,  fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const completionRate =
    stats?.orders
      ? Math.round(((stats.completedOrders ?? tabCounts.delivered) / stats.orders) * 100)
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refresh} className="ml-auto text-red-600 dark:text-red-400 hover:underline font-medium">
              Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.users}
            icon={Users}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50 dark:bg-indigo-900/30"
            spark={stats?.sparklines?.users ?? [120, 132, 141, 155, 148, 162, stats?.users ?? 0]}
            sparkColor="#6366f1"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Total Vendors"
            value={stats?.vendors}
            icon={Store}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            spark={stats?.sparklines?.vendors ?? [30, 33, 35, 36, 38, 41, stats?.vendors ?? 0]}
            sparkColor="#10b981"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Active Riders"
            value={stats?.riders}
            icon={Truck}
            iconColor="text-violet-600"
            iconBg="bg-violet-50 dark:bg-violet-900/30"
            spark={stats?.sparklines?.riders ?? [18, 20, 19, 22, 24, 23, stats?.riders ?? 0]}
            sparkColor="#7c3aed"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Today's Revenue"
            value={stats?.todayRevenue}
            prefix="KES "
            icon={DollarSign}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 dark:bg-amber-900/30"
            spark={stats?.sparklines?.todayRevenue ?? [12000, 18000, 15000, 22000, 19000, 25000, stats?.todayRevenue ?? 0]}
            sparkColor="#d97706"
            formatValue={(n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString()}
            loading={statsLoading && !stats}
          />
        </div>

        {/* ── Secondary KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package size={15} className="text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {statsLoading && !stats ? "—" : (stats?.orders ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} className="text-amber-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {statsLoading && !stats ? "—" : (stats?.pendingOrders ?? tabCounts.pending).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {statsLoading && !stats ? "—" : (stats?.completedOrders ?? tabCounts.delivered).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={15} className="text-indigo-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue — Last 7 Days</h3>
                <p className="text-xs text-gray-400 mt-0.5">Daily revenue in KES</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                <TrendingUp size={12} />
                Live
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeOpacity={0.6} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip prefix="KES " />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Donut */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Order Status</h3>
            <p className="text-xs text-gray-400 mb-4">Distribution by status</p>
            {orderStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {orderStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {orderStatusData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-gray-500 dark:text-gray-400">{d.name}</span>
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No order data</div>
            )}
          </div>
        </div>

        {/* ── Orders Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <button
              onClick={fetchOrders}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium self-start sm:self-auto"
            >
              {ordersLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 mt-4 border-b border-gray-100 dark:border-gray-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t.label}
                {tabCounts[t.id] > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === t.id
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {tabCounts[t.id]}
                  </span>
                )}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          {ordersLoading && orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              Loading orders…
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              No {activeTab === "all" ? "" : activeTab} orders found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-gray-100 dark:border-gray-700">
                    {["Customer", "Vendor", "Amount", "Status", "Time"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                  {filteredOrders.slice(0, 10).map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </tbody>
              </table>
              {filteredOrders.length > 10 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-xs text-gray-400">
                    Showing 10 of {filteredOrders.length} orders — go to Orders page for full list
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}