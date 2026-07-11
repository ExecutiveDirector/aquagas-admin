// src/pages/home/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats } from "../../services/api";
import { listOrders } from "../../services/orderService";
import { Users, Store, Truck, DollarSign } from "lucide-react";

import {
  DashboardHeader,
  StatCard,
  RevenueChart,
  OrderBreakdown,
  RecentOrders,
  QuickStats,
  ActivityFeed,
  QuickActions,
  type DashboardStats,
  type Order,
  type Tab,
  TABS,
  PIE_COLORS,
  fmtKES,
  shortDay,
} from "../../components/dashboard";

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
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
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
    } catch {
      /* non-fatal */
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
    { name: "Pending", value: tabCounts.pending, fill: PIE_COLORS.Pending },
    { name: "Confirmed", value: tabCounts.confirmed, fill: PIE_COLORS.Confirmed },
    { name: "Delivered", value: tabCounts.delivered, fill: PIE_COLORS.Delivered },
    { name: "Cancelled", value: tabCounts.cancelled, fill: PIE_COLORS.Cancelled },
  ].filter((d) => d.value > 0);

  const completionRate = stats?.orders
    ? Math.round(((stats.completedOrders ?? tabCounts.delivered) / stats.orders) * 100)
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={refresh} error={error} />

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <QuickActions />

        <QuickStats stats={stats} tabCounts={tabCounts} completionRate={completionRate} statsLoading={statsLoading} />

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <RevenueChart
            data={revenueData}
            loading={statsLoading && !stats}
            hasRealRevenue={hasRealRevenue}
            totalRevenue={totalChartRevenue}
            peakRevenue={peakRevenue}
          />
          <OrderBreakdown data={orderStatusData} totalOrders={orders.length} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentOrders
              orders={orders}
              filteredOrders={filteredOrders}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabCounts={tabCounts}
              ordersLoading={ordersLoading}
              onRefresh={fetchOrders}
            />
          </div>
          <ActivityFeed orders={orders} loading={ordersLoading && orders.length === 0} />
        </div>
      </div>
    </div>
  );
}
