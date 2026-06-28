// src/pages/home/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats } from "../../services/api";
import { listOrders } from "../../services/orderService";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Store, Truck, DollarSign, TrendingUp, Clock,
  CheckCircle2, AlertCircle, RefreshCw, ArrowUpRight,
  ArrowDownRight, Package, Activity, Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  weeklyRevenue?: Array<{ date: string; revenue: number }>;
}

interface Order {
  id?: string;
  order_id?: string;
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
  pending:    "bg-amber-100 text-amber-700",
  confirmed:  "bg-blue-100 text-blue-700",
  preparing:  "bg-violet-100 text-violet-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  delivered:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-red-100 text-red-700",
  canceled:   "bg-red-100 text-red-700",
  refunded:   "bg-gray-100 text-gray-600",
};

const PIE_COLORS: Record<string, string> = {
  Pending:   "#f59e0b",
  Confirmed: "#6366f1",
  Delivered: "#10b981",
  Cancelled: "#ef4444",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtKES = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(1)}K`
    : v.toLocaleString("en-KE");

const shortDay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data = [], color = "#6366f1", height = 36, width = 100 }: {
  data?: number[]; color?: string; height?: number; width?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height * 0.8 + height * 0.1).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={1.8} points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, prefix = "", icon: Icon, iconColor, iconBg,
  change, spark, sparkColor = "#6366f1", loading, fmt,
}: {
  title: string; value?: number; prefix?: string; icon: React.ElementType;
  iconColor: string; iconBg: string; change?: number;
  spark?: number[]; sparkColor?: string; loading?: boolean;
  fmt?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const target = value ?? 0;

  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    let start: number | null = null;
    const from = display;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 700, 1);
      setDisplay(Math.round(from + (target - from) * (1 - Math.pow(1 - pct, 3))));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const formatted = fmt ? fmt(display) : display.toLocaleString("en-KE");
  const pos = (change ?? 0) >= 0;

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
          <Icon className={`${iconColor}`} size={18} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {prefix}{formatted}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${pos ? "text-emerald-600" : "text-red-500"}`}>
              {pos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>{Math.abs(change)}% vs last week</span>
            </div>
          )}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

// ─── Revenue Chart Custom Tooltip ─────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl px-4 py-3 min-w-[140px]">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-base font-bold text-indigo-600">
        KES {Number(payload[0]?.value || 0).toLocaleString("en-KE")}
      </p>
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
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  const status = order.order_status?.toLowerCase() ?? "pending";
  const badgeClass = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  const orderId = order.order_id ?? order.id ?? "";
  const name = order.customer?.full_name ?? "Guest";
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "G";

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{order.order_number ?? `#${String(orderId).slice(0, 8).toUpperCase()}`}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
        {order.vendor_name ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        KES {Number(order.total_amount || 0).toLocaleString("en-KE")}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHome() {
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [activeTab, setActiveTab]     = useState<Tab>("all");
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing]   = useState(false);

  const mountedRef = useRef(true);
  const abortRef   = useRef<AbortController | null>(null);

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
      setStats(data as DashboardStats);
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
    } catch { /* non-fatal */ }
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

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
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

  // Revenue chart — real weekly data from API, zero-padded for last 7 days
  const revenueData = (() => {
    const weekly = stats?.weeklyRevenue;
    if (weekly && weekly.length > 0) {
      return weekly.map((d) => ({
        day: shortDay(d.date),
        revenue: d.revenue,
        date: d.date,
      }));
    }
    // Fallback: show last 7 days with 0 (no fake Math.random)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ day: shortDay(d.toISOString()), revenue: 0, date: d.toISOString().slice(0, 10) });
    }
    return days;
  })();

  const hasRealRevenue = revenueData.some((d) => d.revenue > 0);
  const totalChartRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
  const peakRevenue = Math.max(...revenueData.map((d) => d.revenue), 0);

  const orderStatusData = [
    { name: "Pending",   value: tabCounts.pending,   fill: PIE_COLORS.Pending   },
    { name: "Confirmed", value: tabCounts.confirmed,  fill: PIE_COLORS.Confirmed },
    { name: "Delivered", value: tabCounts.delivered,  fill: PIE_COLORS.Delivered },
    { name: "Cancelled", value: tabCounts.cancelled,  fill: PIE_COLORS.Cancelled },
  ].filter((d) => d.value > 0);

  const completionRate =
    stats?.orders
      ? Math.round(((stats.completedOrders ?? tabCounts.delivered) / stats.orders) * 100)
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Calendar size={12} />
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
            <button onClick={refresh} className="ml-auto text-red-600 hover:underline font-medium">Retry</button>
          </div>
        )}

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.users}
            icon={Users}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
            spark={[120, 132, 141, 155, 148, 162, stats?.users ?? 0]}
            sparkColor="#6366f1"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Total Vendors"
            value={stats?.vendors}
            icon={Store}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            spark={[30, 33, 35, 36, 38, 41, stats?.vendors ?? 0]}
            sparkColor="#10b981"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Active Riders"
            value={stats?.riders}
            icon={Truck}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            spark={[18, 20, 19, 22, 24, 23, stats?.riders ?? 0]}
            sparkColor="#7c3aed"
            loading={statsLoading && !stats}
          />
          <StatCard
            title="Today's Revenue"
            value={stats?.todayRevenue}
            prefix="KES "
            icon={DollarSign}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            spark={revenueData.map((d) => d.revenue)}
            sparkColor="#d97706"
            fmt={fmtKES}
            loading={statsLoading && !stats}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Orders",     val: stats?.orders,                   icon: Package,      color: "text-gray-400" },
            { label: "Pending",          val: stats?.pendingOrders ?? tabCounts.pending,   icon: Clock,        color: "text-amber-400" },
            { label: "Completed",        val: stats?.completedOrders ?? tabCounts.delivered, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Completion Rate",  val: completionRate, suffix: "%",     icon: Activity,     color: "text-indigo-400" },
          ].map(({ label, val, suffix, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={color} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsLoading && !stats ? "—" : `${(val ?? 0).toLocaleString("en-KE")}${suffix ?? ""}`}
              </p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Chart — real data, no random */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue — Last 7 Days</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cumulative order value in KES</p>
                {!statsLoading && (
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[11px] text-gray-400">
                      Total: <span className="font-semibold text-gray-700 dark:text-gray-300">KES {totalChartRevenue.toLocaleString("en-KE")}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Peak: <span className="font-semibold text-gray-700 dark:text-gray-300">KES {peakRevenue.toLocaleString("en-KE")}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasRealRevenue ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <TrendingUp size={12} />
                    Live
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">No data yet</span>
                )}
              </div>
            </div>

            {statsLoading && !stats ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : !hasRealRevenue ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-400">
                <DollarSign size={28} className="opacity-30" />
                <p className="text-sm">No revenue recorded in the last 7 days</p>
                <p className="text-xs text-gray-300">Orders will appear here once completed</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                    width={44}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                    dot={{ r: 3.5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order Status Donut */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Order Breakdown</h3>
            <p className="text-xs text-gray-400 mb-4">Distribution by status</p>
            {orderStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%" cy="50%"
                      innerRadius={48} outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [v, n]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {orderStatusData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="text-xs text-gray-500">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${((d.value / (orders.length || 1)) * 100).toFixed(0)}%`,
                              backgroundColor: d.fill,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No orders yet</div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-0">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders loaded</p>
            </div>
            <button
              onClick={fetchOrders}
              className="text-xs text-indigo-600 hover:underline font-medium self-start sm:self-auto"
            >
              {ordersLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 mt-4 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {tabCounts[t.id] > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeTab === t.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {tabCounts[t.id]}
                  </span>
                )}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t" />
                )}
              </button>
            ))}
          </div>

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
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                  {filteredOrders.slice(0, 10).map((order) => (
                    <OrderRow key={order.order_id ?? order.id} order={order} />
                  ))}
                </tbody>
              </table>
              {filteredOrders.length > 10 && (
                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <span className="text-xs text-gray-400">
                    Showing 10 of {filteredOrders.length} — visit Orders page for full list
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