// src/components/dashboard/QuickStats.tsx
import { Package, Clock, CheckCircle2, Activity } from "lucide-react";
import type { DashboardStats, Tab } from "./types";

interface QuickStatsProps {
  stats: DashboardStats | null;
  tabCounts: Record<Tab, number>;
  completionRate: number;
  statsLoading: boolean;
}

export default function QuickStats({ stats, tabCounts, completionRate, statsLoading }: QuickStatsProps) {
  const items = [
    { label: "Total Orders", val: stats?.orders, icon: Package, color: "text-gray-400" },
    { label: "Pending", val: stats?.pendingOrders ?? tabCounts.pending, icon: Clock, color: "text-amber-400" },
    { label: "Completed", val: stats?.completedOrders ?? tabCounts.delivered, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Completion Rate", val: completionRate, suffix: "%", icon: Activity, color: "text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, val, suffix, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="mb-2 flex items-center gap-2">
            <Icon size={15} className={color} />
            <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {statsLoading && !stats ? "—" : `${(val ?? 0).toLocaleString("en-KE")}${suffix ?? ""}`}
          </p>
        </div>
      ))}
    </div>
  );
}
