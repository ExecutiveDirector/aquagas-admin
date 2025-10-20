// src/pages/AdminHome.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats } from "../../services/api"; // make sure path is correct

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  // optional place for small sparkline data per metric (fallback if not provided)
  sparklines?: {
    users?: number[];
    vendors?: number[];
    riders?: number[];
    orders?: number[];
    todayRevenue?: number[];
  };
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchStats = useCallback(async () => {
    // abort previous
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
      setError(null);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // aborted — ignore
        return;
      }
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

  // initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Polling (auto refresh every 60s)
  useEffect(() => {
    if (!autoRefresh) return;
    let interval: number | undefined;
    setIsPolling(true);
    interval = window.setInterval(() => {
      fetchStats();
    }, 60_000); // 60s
    return () => {
      if (interval) window.clearInterval(interval);
      setIsPolling(false);
    };
  }, [autoRefresh, fetchStats]);

  // Animated count-up hook (simple)
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

  // small sparkline renderer (SVG)
  const Sparkline = ({ points }: { points?: number[] }) => {
    if (!points || points.length === 0) {
      return <div className="opacity-40 text-xs">—</div>;
    }
    const w = 96;
    const h = 28;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const path = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * h;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block" aria-hidden>
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
      </svg>
    );
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    spark,
    accent = "blue",
  }: {
    title: string;
    value?: number;
    subtitle?: string;
    spark?: number[];
    accent?: "blue" | "green" | "purple" | "orange" | "teal" | "yellow";
  }) => {
    const animated = useCountUp(value);
    const accentMap: Record<string, string> = {
      blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
      green: "from-green-50 to-green-100 border-green-200 text-green-900",
      purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
      orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-900",
      teal: "from-teal-50 to-teal-100 border-teal-200 text-teal-900",
      yellow: "from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-900",
    };
    return (
      <button
        onClick={() => {
          // quick affordance: copy value to clipboard (if available)
          if (value !== undefined) {
            navigator.clipboard?.writeText(String(value));
          }
        }}
        className={`w-full text-left rounded-xl p-5 border ${accentMap[accent]} dark:from-black/10 dark:to-black/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2`}
        title="Click to copy value"
        aria-label={`${title} — ${value ?? "N/A"}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-300">{title}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold">{typeof value === "number" ? animated.toLocaleString() : "—"}</div>
              {subtitle && <div className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>}
            </div>
          </div>
          <div className="text-xs text-gray-400">{spark ? <Sparkline points={spark} /> : null}</div>
        </div>
      </button>
    );
  };

  const onManualRefresh = () => {
    fetchStats();
  };

  // nice error banner
  const ErrorBanner = ({ message }: { message: string }) => (
    <div role="alert" aria-live="assertive" className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <div className="font-semibold text-red-700">Unable to load dashboard</div>
          <div className="text-sm text-red-600">{message}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={onManualRefresh} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
              Retry
            </button>
            <button
              onClick={() => {
                setAutoRefresh((s) => !s);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
            >
              {autoRefresh ? "Stop auto-refresh" : "Enable auto-refresh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // skeleton loader for cards
  const StatSkeleton = () => (
    <div className="rounded-xl p-5 border from-gray-50 to-gray-100 dark:from-black/10 dark:to-black/10 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Welcome back — overview of platform activity.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            <div>{isPolling ? "Auto refresh on" : "Auto refresh off"}</div>
            <div className="mt-1">{lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : "Not updated yet"}</div>
          </div>

          <button
            onClick={onManualRefresh}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
            aria-label="Refresh dashboard"
          >
            Refresh
          </button>

          <button
            onClick={() => setAutoRefresh((s) => !s)}
            className={`px-3 py-2 rounded-md border ${autoRefresh ? "border-green-400" : "border-gray-300"}`}
            aria-pressed={autoRefresh}
            aria-label="Toggle auto refresh"
          >
            {autoRefresh ? "Auto" : "Manual"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Main content */}
      <div>
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {loading && !stats ? (
            // show 4 skeletons
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={stats?.users}
                subtitle="All registered users"
                spark={stats?.sparklines?.users}
                accent="blue"
              />
              <StatCard
                title="Total Vendors"
                value={stats?.vendors}
                subtitle="Active vendors"
                spark={stats?.sparklines?.vendors}
                accent="green"
              />
              <StatCard
                title="Total Riders"
                value={stats?.riders}
                subtitle="Delivery riders"
                spark={stats?.sparklines?.riders}
                accent="purple"
              />
              <StatCard
                title="Today's Revenue"
                value={stats?.todayRevenue}
                subtitle="USD"
                spark={stats?.sparklines?.todayRevenue}
                accent="orange"
              />
            </>
          )}
        </div>

        {/* Additional stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {loading && !stats ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              {typeof stats?.totalRevenue !== "undefined" && (
                <StatCard title="Total Revenue" value={stats!.totalRevenue} subtitle="USD total" accent="teal" />
              )}
              {typeof stats?.pendingOrders !== "undefined" && (
                <StatCard title="Pending Orders" value={stats!.pendingOrders} subtitle="Waiting fulfillment" accent="yellow" />
              )}
              {typeof stats?.completedOrders !== "undefined" && (
                <StatCard title="Completed Orders" value={stats!.completedOrders} subtitle="Successfully delivered" accent="green" />
              )}
            </>
          )}
        </div>

        {/* No data fallback */}
        {!loading && !error && !stats && (
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">No Data Available</h2>
            <p className="text-gray-600">Unable to load dashboard data.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={onManualRefresh} className="px-4 py-2 bg-blue-500 text-white rounded">
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
