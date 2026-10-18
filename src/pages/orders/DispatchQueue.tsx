// src/pages/orders/DispatchQueue.tsx
// Orders the vendor has accepted that no rider has accepted yet. The admin can send them to automatic
// matching, or hand one to a specific rider (a rider may hold up to `limit` jobs, so busy riders can queue).
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Truck, RefreshCw } from 'lucide-react';
import api from '../../services/api';

interface QueueOrder {
  order_id: number | string;
  order_number: string;
  order_status: string;
  total_amount: number;
  cod_amount?: number | null;
  delivery_address?: string | null;
  schedule_type?: string | null;
  scheduled_at?: string | null;
  vendor_name?: string | null;
  queue_state: 'unassigned' | 'offered';
  rider_name?: string | null;
  waiting_minutes: number;
}
interface QueueRider {
  rider_id: number | string;
  name: string;
  current_status: string;
  active_orders: number;
  full: boolean;
}

const kes = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export default function DispatchQueue({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [riders, setRiders] = useState<QueueRider[]>([]);
  const [limit, setLimit] = useState(2);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/admin/orders/dispatch-queue');
      setOrders(res.data?.orders || []);
      setRiders(res.data?.riders || []);
      setLimit(res.data?.limit || 2);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load the dispatch queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const autoDispatch = async (o: QueueOrder) => {
    setBusy(String(o.order_id));
    try {
      const res = await api.post(`/v1/admin/orders/${o.order_id}/dispatch`);
      res.data?.assigned ? toast.success(res.data.message) : toast(res.data?.message || 'No rider available');
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Dispatch failed');
    } finally {
      setBusy(null);
    }
  };

  const assign = async (o: QueueOrder) => {
    const riderId = pick[String(o.order_id)];
    if (!riderId) return;
    setBusy(String(o.order_id));
    try {
      try {
        await api.post(`/v1/admin/orders/${o.order_id}/assign-rider`, { rider_id: riderId });
      } catch (err: any) {
        const d = err?.response?.data;
        if (err?.response?.status === 409 && d?.code === 'RIDER_AT_CAPACITY') {
          if (!window.confirm(`${d.error}\n\nAssign anyway? It will queue behind their current orders.`)) return;
          await api.post(`/v1/admin/orders/${o.order_id}/assign-rider`, { rider_id: riderId, force: true });
        } else throw err;
      }
      toast.success('Order sent to the rider');
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Assignment failed');
    } finally {
      setBusy(null);
    }
  };

  const unassigned = orders.filter((o) => o.queue_state === 'unassigned').length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm">
          <Truck className={`w-4 h-4 ${orders.length ? 'text-indigo-600' : 'text-gray-400'}`} />
          Dispatch queue {orders.length ? `(${orders.length})` : '— empty'}
        </span>
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {unassigned} need a rider · {orders.length - unassigned} offered, waiting
          <RefreshCw onClick={(e) => { e.stopPropagation(); load(); }} className={`w-4 h-4 cursor-pointer ${loading ? 'animate-spin' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">Every accepted order already has a rider.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.map((o) => (
                <li key={String(o.order_id)} className="py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-sm">
                  <div className="text-gray-900 dark:text-gray-100">
                    <strong>{o.order_number}</strong> · {kes(o.total_amount)}
                    {o.cod_amount ? <span className="ml-1 text-amber-700">(cash)</span> : null}
                    <span className="ml-2 capitalize text-gray-500">{o.order_status}</span>
                    <span className="block text-xs text-gray-500">
                      {o.vendor_name || 'Vendor'} → {o.delivery_address || 'address not set'}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {o.queue_state === 'offered' ? `Offered to ${o.rider_name || 'a rider'}, not accepted` : 'No rider yet'}
                      {' · waiting '}{o.waiting_minutes} min
                      {o.schedule_type === 'scheduled' && o.scheduled_at ? ` · scheduled ${new Date(o.scheduled_at).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={busy === String(o.order_id)}
                      onClick={() => autoDispatch(o)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50">
                      {o.queue_state === 'offered' ? 'Re-dispatch' : 'Find rider'}
                    </button>
                    <select
                      value={pick[String(o.order_id)] || ''}
                      onChange={(e) => setPick((p) => ({ ...p, [String(o.order_id)]: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-100">
                      <option value="">Choose rider…</option>
                      {riders.map((r) => (
                        <option key={String(r.rider_id)} value={String(r.rider_id)}>
                          {r.name} — {r.current_status.replace('_', ' ')} · {r.active_orders}/{limit}{r.full ? ' (full)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busy === String(o.order_id) || !pick[String(o.order_id)]}
                      onClick={() => assign(o)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50">
                      Assign
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
