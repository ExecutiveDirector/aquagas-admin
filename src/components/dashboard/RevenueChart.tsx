// src/components/dashboard/RevenueChart.tsx
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { ChartSkeleton } from "./DashboardSkeleton";
import EmptyState from "./EmptyState";

interface RevenuePoint {
  day: string;
  revenue: number;
  date: string;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  loading: boolean;
  hasRealRevenue: boolean;
  totalRevenue: number;
  peakRevenue: number;
}

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

export default function RevenueChart({ data, loading, hasRealRevenue, totalRevenue, peakRevenue }: RevenueChartProps) {
  return (
    <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue — Last 7 Days</h3>
          <p className="text-xs text-gray-400 mt-0.5">Cumulative order value in KES</p>
          {!loading && (
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[11px] text-gray-400">
                Total: <span className="font-semibold text-gray-700 dark:text-gray-300">KES {totalRevenue.toLocaleString("en-KE")}</span>
              </span>
              <span className="text-[11px] text-gray-400">
                Peak: <span className="font-semibold text-gray-700 dark:text-gray-300">KES {peakRevenue.toLocaleString("en-KE")}</span>
              </span>
            </div>
          )}
        </div>
        {hasRealRevenue ? (
          <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
            <TrendingUp size={12} />
            Live
          </span>
        ) : (
          <span className="rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-400">No data yet</span>
        )}
      </div>

      {loading ? (
        <ChartSkeleton height={220} />
      ) : !hasRealRevenue ? (
        <EmptyState
          icon={DollarSign}
          title="No revenue recorded in the last 7 days"
          description="Orders will appear here once completed"
        />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
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
  );
}
