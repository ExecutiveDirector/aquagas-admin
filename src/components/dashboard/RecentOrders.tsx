// src/components/dashboard/RecentOrders.tsx
import { ClipboardList } from "lucide-react";
import { TableSkeleton } from "./DashboardSkeleton";
import EmptyState from "./EmptyState";
import { STATUS_COLORS, TABS, timeAgo, type Order, type Tab } from "./types";

interface RecentOrdersProps {
  orders: Order[];
  filteredOrders: Order[];
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  tabCounts: Record<Tab, number>;
  ordersLoading: boolean;
  onRefresh: () => void;
}

function OrderRow({ order }: { order: Order }) {
  const ago = timeAgo(order.created_at);
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

export default function RecentOrders({
  orders,
  filteredOrders,
  activeTab,
  setActiveTab,
  tabCounts,
  ordersLoading,
  onRefresh,
}: RecentOrdersProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 pt-5 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders loaded</p>
        </div>
        <button onClick={onRefresh} className="text-xs text-indigo-600 hover:underline font-medium self-start sm:self-auto">
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
              activeTab === t.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {tabCounts[t.id] > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeTab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {tabCounts[t.id]}
              </span>
            )}
            {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t" />}
          </button>
        ))}
      </div>

      {ordersLoading && orders.length === 0 ? (
        <table className="w-full">
          <tbody>
            <TableSkeleton rows={5} columns={5} />
          </tbody>
        </table>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No ${activeTab === "all" ? "" : activeTab} orders found`}
        />
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
  );
}
