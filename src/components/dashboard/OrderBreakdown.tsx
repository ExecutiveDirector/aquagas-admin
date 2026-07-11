// src/components/dashboard/OrderBreakdown.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import EmptyState from "./EmptyState";
import { PieChart as PieChartIcon } from "lucide-react";

interface OrderStatusDatum {
  name: string;
  value: number;
  fill: string;
}

interface OrderBreakdownProps {
  data: OrderStatusDatum[];
  totalOrders: number;
}

export default function OrderBreakdown({ data, totalOrders }: OrderBreakdownProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Order Breakdown</h3>
      <p className="mb-4 text-xs text-gray-400">Distribution by status</p>

      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-xs text-gray-500">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${((d.value / (totalOrders || 1)) * 100).toFixed(0)}%`,
                        backgroundColor: d.fill,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={PieChartIcon} title="No orders yet" />
      )}
    </div>
  );
}
