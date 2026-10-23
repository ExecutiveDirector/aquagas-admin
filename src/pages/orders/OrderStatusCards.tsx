// Dashboard cards: operational groups of the detailed order statuses.
import { useEffect, useState, useCallback } from 'react';
import { getOrderStatusSummary, type OrderStatusSummary } from '../../services/adminService';

const CARDS: { key: keyof OrderStatusSummary['cards']; label: string; hint: string; cls: string }[] = [
  { key: 'new',        label: 'New',               hint: 'Orders requiring attention',        cls: 'text-amber-600' },
  { key: 'preparing',  label: 'Preparing',         hint: 'Accepted, being prepared, awaiting rider', cls: 'text-violet-600' },
  { key: 'active',     label: 'Active Deliveries', hint: 'Riders assigned or on the road',    cls: 'text-indigo-600' },
  { key: 'completed',  label: 'Completed',         hint: 'Delivered/closed, last 24h',        cls: 'text-emerald-600' },
  { key: 'delayed',    label: 'Delayed',           hint: 'Orders exceeding time limits',      cls: 'text-red-600' },
  { key: 'exceptions', label: 'Exceptions',        hint: 'Failed, rejected or disputed, last 24h', cls: 'text-fuchsia-600' },
];

export default function OrderStatusCards({ active, onPick, refreshKey }: {
  active: string; onPick: (group: string) => void; refreshKey?: number;
}) {
  const [data, setData] = useState<OrderStatusSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getOrderStatusSummary()); setFailed(false); } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  if (failed && !data) return null; // backend not updated yet — hide rather than show zeros

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {CARDS.map((c) => {
        const selected = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onPick(selected ? '' : c.key)}
            title={c.hint}
            className={`text-left rounded-2xl border p-4 bg-white dark:bg-gray-800 shadow-sm transition-colors ${
              selected ? 'border-indigo-400 ring-1 ring-indigo-400/30' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.cls}`}>{data ? data.cards[c.key].toLocaleString() : '—'}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-tight">{c.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
