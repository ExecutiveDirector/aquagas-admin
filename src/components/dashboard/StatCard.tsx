// src/components/dashboard/StatCard.tsx
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatCardSkeleton } from "./DashboardSkeleton";

// ─── Sparkline ────────────────────────────────────────────────────────────────

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
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height * 0.8 + height * 0.1).toFixed(1)}`
    )
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
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  change?: number;
  spark?: number[];
  sparkColor?: string;
  loading?: boolean;
  fmt?: (n: number) => string;
}

export default function StatCard({
  title,
  value,
  prefix = "",
  icon: Icon,
  iconColor,
  iconBg,
  change,
  spark,
  sparkColor = "#6366f1",
  loading,
  fmt,
}: StatCardProps) {
  const [display, setDisplay] = useState(0);
  const target = value ?? 0;

  useEffect(() => {
    if (!target) {
      setDisplay(0);
      return;
    }
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

  if (loading) return <StatCardSkeleton />;

  const formatted = fmt ? fmt(display) : display.toLocaleString("en-KE");
  const pos = (change ?? 0) >= 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900">
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400 uppercase">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shadow-sm transition-transform group-hover:scale-110`}>
          <Icon className={iconColor} size={18} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {prefix}
            {formatted}
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

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-700 to-transparent" />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">Updated just now</span>
        <ArrowUpRight size={13} className="text-blue-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>
    </div>
  );
}
