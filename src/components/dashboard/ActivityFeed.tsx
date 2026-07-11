// src/components/dashboard/ActivityFeed.tsx
// New addition (recommendation #1 "Recent Activity" timeline). Derived entirely
// from the orders already fetched for the dashboard — no new API calls, so it
// can't introduce new failure modes.
import { PackagePlus, CheckCircle2, XCircle, Clock } from "lucide-react";
import EmptyState from "./EmptyState";
import { timeAgo, type Order } from "./types";

interface ActivityFeedProps {
  orders: Order[];
  loading: boolean;
}

interface ActivityItem {
  key: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  time: string;
}

function buildActivity(orders: Order[]): ActivityItem[] {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return sorted.slice(0, 8).map((o) => {
    const status = o.order_status?.toLowerCase() ?? "pending";
    const id = o.order_number ?? `#${String(o.order_id ?? o.id ?? "").slice(0, 8).toUpperCase()}`;
    const name = o.customer?.full_name ?? "Guest";

    let icon = PackagePlus;
    let iconColor = "text-indigo-600";
    let iconBg = "bg-indigo-50";
    let label = `New order ${id} from ${name}`;

    if (status === "delivered") {
      icon = CheckCircle2;
      iconColor = "text-emerald-600";
      iconBg = "bg-emerald-50";
      label = `Order ${id} delivered to ${name}`;
    } else if (status === "cancelled" || status === "canceled") {
      icon = XCircle;
      iconColor = "text-red-600";
      iconBg = "bg-red-50";
      label = `Order ${id} cancelled`;
    } else if (status === "pending") {
      icon = Clock;
      iconColor = "text-amber-600";
      iconBg = "bg-amber-50";
      label = `Order ${id} awaiting confirmation`;
    }

    return {
      key: String(o.order_id ?? o.id),
      icon,
      iconColor,
      iconBg,
      label,
      time: timeAgo(o.created_at),
    };
  });
}

export default function ActivityFeed({ orders, loading }: ActivityFeedProps) {
  const items = buildActivity(orders);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      <p className="mb-4 text-xs text-gray-400">Latest order events</p>

      {loading && items.length === 0 ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-gray-100 dark:bg-gray-700/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Clock} title="No recent activity" />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                <item.icon size={15} className={item.iconColor} />
              </div>
              <p className="min-w-0 flex-1 truncate text-xs text-gray-600 dark:text-gray-300">{item.label}</p>
              <span className="flex-shrink-0 text-[11px] text-gray-400">{item.time}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
