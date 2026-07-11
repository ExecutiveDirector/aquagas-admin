// src/components/dashboard/types.ts
// Shared types + formatting helpers used across the dashboard components.
// Extracted from the original AdminHome.tsx — no logic changed.

export interface DashboardStats {
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

export interface Order {
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

export type Tab = "all" | "pending" | "confirmed" | "delivered" | "cancelled";

export const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-violet-100 text-violet-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  canceled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export const PIE_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Confirmed: "#6366f1",
  Delivered: "#10b981",
  Cancelled: "#ef4444",
};

export const fmtKES = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(1)}K`
    : v.toLocaleString("en-KE");

export const shortDay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });
};

export const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
