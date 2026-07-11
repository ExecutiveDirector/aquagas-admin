// src/components/dashboard/DashboardHeader.tsx
import { RefreshCw, AlertCircle, Calendar } from "lucide-react";

interface DashboardHeaderProps {
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  error: string | null;
}

export default function DashboardHeader({ lastUpdated, refreshing, onRefresh, error }: DashboardHeaderProps) {
  return (
    <div className="space-y-4">
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
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={onRefresh} className="ml-auto text-red-600 hover:underline font-medium">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
