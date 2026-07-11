// src/components/dashboard/DashboardSkeleton.tsx
// Reusable skeleton placeholders — replaces ad-hoc spinners with content-shaped
// loading states (recommendation #16 in the UI/UX doc).

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-full w-full bg-gray-100 dark:bg-gray-700/60 rounded-xl" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 w-full max-w-[120px] bg-gray-100 dark:bg-gray-700 rounded" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  );
}
