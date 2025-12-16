// src/pages/AdminHome.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardStats} from "../../services/api";
import { listOrders, getOrderDetails} from "../../services/orderService";

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

// ========================= Helpers =========================
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
    const next =  
      Math.round(  
        (fromRef.current + (value - fromRef.current) * pct) * 100  
      ) / 100;  
    setDisplay(next);  
  
    if (pct < 1) {  
      rafRef.current = requestAnimationFrame(step);  
    }  
  };  
  
  rafRef.current = requestAnimationFrame(step);  
  
  // ✅ Proper cleanup function — fully type safe  
  return () => {  
    if (rafRef.current) {  
      cancelAnimationFrame(rafRef.current);  
    }  
  };  
  
  // eslint-disable-next-line react-hooks/exhaustive-deps  
}, [value]);  
  
return display;

};

const Sparkline = ({ points }: { points?: number[] }) => {
if (!points || points.length === 0) return <div className="opacity-40 text-xs">—</div>;
const w = 96;
const h = 28;
const min = Math.min(...points);
const max = Math.max(...points);
const range = max - min || 1;
const path = points
.map((p, i) => {
const x = (i / (points.length - 1)) * w;
const y = h - ((p - min) / range) * h;
return ${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)};
})
.join(" ");
return (
<svg width={w} height={h} viewBox={0 0 ${w} ${h}}>
<path  
d={path}  
fill="none"  
stroke="currentColor"  
strokeWidth={1.5}  
strokeLinecap="round"  
strokeLinejoin="round"  
className="opacity-60"  
/>
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
onClick={() => value !== undefined && navigator.clipboard?.writeText(String(value))}
className={w-full text-left rounded-xl p-5 border ${accentMap[accent]} hover:shadow-lg focus:ring-2}
>
<div className="flex items-start justify-between">
<div>
<div className="text-xs font-medium uppercase text-gray-500">{title}</div>
<div className="mt-2 flex items-baseline gap-2">
<div className="text-2xl font-bold">{typeof value === "number" ? animated.toLocaleString() : "—"}</div>
{subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
</div>
</div>
{spark && <Sparkline points={spark} />}
</div>
</button>
);
};

const onManualRefresh = () => {
fetchStats();
fetchOrders();
};

const ErrorBanner = ({ message }: { message: string }) => (
<div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md" role="alert">
<div className="flex items-start gap-3">
<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<div>
<div className="font-semibold text-red-700">Unable to load dashboard</div>
<div className="text-sm text-red-600">{message}</div>
<div className="mt-3 flex gap-2">
<button onClick={onManualRefresh} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
Retry
</button>
<button
onClick={() => setAutoRefresh((s) => !s)}
className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
>
{autoRefresh ? "Stop auto-refresh" : "Enable auto-refresh"}
</button>
</div>
</div>
</div>
</div>
);

const StatSkeleton = () => (
<div className="rounded-xl p-5 border from-gray-50 to-gray-100 animate-pulse">
<div className="h-4 w-28 bg-gray-200 rounded mb-3" />
<div className="h-8 w-36 bg-gray-200 rounded mb-2" />
<div className="h-3 w-20 bg-gray-200 rounded" />
</div>
);

// ========================= Orders Table =========================
const StatusBadge = ({ status }: { status: string }) => {
const colorMap: Record<string, string> = {
pending: "bg-yellow-100 text-yellow-800",
completed: "bg-green-100 text-green-800",
cancelled: "bg-red-100 text-red-800",
};
return (
<span className={px-2 py-1 text-xs font-medium rounded ${colorMap[status] || "bg-gray-100 text-gray-700"}}>
{status.toUpperCase()}
</span>
);
};

// ========================= Render =========================
return (
<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<div>
<h1 className="text-3xl font-bold">Admin Dashboard</h1>
<p className="text-sm text-gray-600 mt-1">Welcome back — overview of platform activity.</p>
</div>
<div className="flex items-center gap-3">
<div className="text-xs text-gray-500 text-right">
<div>{isPolling ? "Auto refresh on" : "Auto refresh off"}</div>
<div className="mt-1">
{lastUpdated ? Last updated: ${new Date(lastUpdated).toLocaleString()} : "Not updated yet"}
</div>
</div>
<button  
onClick={onManualRefresh}  
disabled={loading}  
className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"  
>
Refresh
</button>
<button
onClick={() => setAutoRefresh((s) => !s)}
className={px-3 py-2 rounded border ${autoRefresh ? "border-green-400" : "border-gray-300"}}
>
{autoRefresh ? "Auto" : "Manual"}
</button>
</div>
</div>

{error && <ErrorBanner message={error} />}  

  {/* Stats Section */}  
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">  
    {loading && !stats ? (  
      <>  
        <StatSkeleton /> <StatSkeleton /> <StatSkeleton /> <StatSkeleton />  
      </>  
    ) : (  
      <>  
        <StatCard title="Total Users" value={stats?.users} subtitle="All registered users" spark={stats?.sparklines?.users} accent="blue" />  
        <StatCard title="Total Vendors" value={stats?.vendors} subtitle="Active vendors" spark={stats?.sparklines?.vendors} accent="green" />  
        <StatCard title="Total Riders" value={stats?.riders} subtitle="Delivery riders" spark={stats?.sparklines?.riders} accent="purple" />  
        <StatCard title="Today's Revenue" value={stats?.todayRevenue} subtitle="USD" spark={stats?.sparklines?.todayRevenue} accent="orange" />  
      </>  
    )}  
  </div>  

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">  
    {loading && !stats ? (  
      <>  
        <StatSkeleton /> <StatSkeleton /> <StatSkeleton />  
      </>  
    ) : (  
      <>  
        {stats?.totalRevenue !== undefined && <StatCard title="Total Revenue" value={stats.totalRevenue} subtitle="USD total" accent="teal" />}  
        {stats?.pendingOrders !== undefined && (  
          <StatCard title="Pending Orders" value={stats.pendingOrders} subtitle="Waiting" accent="yellow" />  
        )}  
        {stats?.completedOrders !== undefined && (  
          <StatCard title="Completed Orders" value={stats.completedOrders} subtitle="Delivered" accent="green" />  
        )}  
      </>  
    )}  
  </div>  

  {/* Orders List */}  
  <div className="bg-white shadow rounded-lg p-6">  
    <div className="flex items-center justify-between mb-4">  
      <h2 className="text-lg font-semibold">Recent Orders</h2>  
      <button onClick={fetchOrders} className="text-sm text-blue-600 hover:underline">  
        Refresh Orders  
      </button>  
    </div>  

    {orderLoading ? (  
      <div className="text-gray-500">Loading orders...</div>  
    ) : orders.length === 0 ? (  
      <div className="text-gray-500">No recent orders available.</div>  
    ) : (  
      <div className="overflow-x-auto">  
        <table className="min-w-full text-sm text-left border-t border-gray-200">  
          <thead>  
            <tr className="bg-gray-50 text-gray-600">  
              <th className="py-2 px-3">Order ID</th>  
              <th className="py-2 px-3">Customer</th>  
              <th className="py-2 px-3">Vendor</th>  
              <th className="py-2 px-3">Total</th>  
              <th className="py-2 px-3">Status</th>  
              <th className="py-2 px-3">Date</th>  
            </tr>  
          </thead>  
          <tbody>  
            {orders.map((o) => (  
              <tr key={o.id} className="border-b hover:bg-gray-50">  
                <td className="py-2 px-3 font-mono">{o.id}</td>  
                <td className="py-2 px-3">{o.customerName}</td>  
                <td className="py-2 px-3">{o.vendorName}</td>  
                <td className="py-2 px-3 font-semibold">${o.totalAmount.toFixed(2)}</td>  
                <td className="py-2 px-3">  
                  <StatusBadge status={o.status.toLowerCase()} />  
                </td>  
                <td className="py-2 px-3 text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>  
              </tr>  
            ))}  
          </tbody>  
        </table>  
      </div>  
    )}  
  </div>  
</div>

);
}
