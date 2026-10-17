// src/pages/orders/NeedsAttention.tsx
// Orders that need a human: stuck in the flow, or cancelled after the customer paid (refund due).
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw, Check } from 'lucide-react';
import api from '../../services/api';

interface Stuck {
  order_id: number | string;
  order_number: string;
  order_status: string;
  stuck_type: 'vendor_slow' | 'no_rider' | 'rider_no_show' | 'delivery_overdue';
  stuck_minutes: number;
  total_amount: number;
  admin_note?: string | null;
}
interface RefundDue {
  order_id: number | string;
  order_number: string;
  total_amount: number;
  payment_reference?: string | null;
  admin_note?: string | null;
  updated_at: string;
}

const kes = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const LABEL: Record<Stuck['stuck_type'], { text: string; hint: string }> = {
  vendor_slow: { text: 'Vendor not accepting', hint: 'Call the vendor, or cancel and refund.' },
  no_rider: { text: 'No rider found', hint: 'Assign a rider manually.' },
  rider_no_show: { text: 'Rider has not collected', hint: 'Call the rider or reassign.' },
  delivery_overdue: { text: 'Delivery overdue', hint: 'Call the rider and customer.' },
};

export default function NeedsAttention() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState<Stuck[]>([]);
  const [refunds, setRefunds] = useState<RefundDue[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get('/v1/admin/orders/stuck'),
        api.get('/v1/admin/orders/refunds-pending'),
      ]);
      setStuck(s.data?.data || []);
      setRefunds(r.data?.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load orders needing attention');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const markRefunded = async (o: RefundDue) => {
    const reference = window.prompt(
      `Record the refund of ${kes(o.total_amount)} for ${o.order_number}.\nEnter the M-Pesa / bank reference (send the money first):`);
    if (!reference?.trim()) return;
    setBusy(String(o.order_id));
    try {
      await api.post(`/v1/admin/orders/${o.order_id}/mark-refunded`, { reference: reference.trim() });
      toast.success('Refund recorded');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to record refund');
    } finally {
      setBusy(null);
    }
  };

  const count = stuck.length + refunds.length;
  return (
    <div className={`rounded-xl border shadow-sm ${count ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm">
          <AlertTriangle className={`w-4 h-4 ${count ? 'text-amber-600' : 'text-gray-400'}`} />
          Needs attention {count ? `(${count})` : '— all clear'}
        </span>
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {stuck.length} stuck · {refunds.length} refunds due
          <RefreshCw
            onClick={(e) => { e.stopPropagation(); load(); }}
            className={`w-4 h-4 cursor-pointer ${loading ? 'animate-spin' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Stuck orders</h3>
            {stuck.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing stuck.</p>
            ) : (
              <ul className="divide-y divide-amber-100 dark:divide-gray-700">
                {stuck.map((o) => (
                  <li key={`${o.order_id}-${o.stuck_type}`} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                    <span className="text-gray-900 dark:text-gray-100">
                      <strong>{o.order_number}</strong> · {kes(o.total_amount)} · <span className="capitalize">{o.order_status}</span>
                    </span>
                    <span className="text-amber-800 dark:text-amber-300">
                      {LABEL[o.stuck_type]?.text} · {o.stuck_minutes} min
                      <span className="text-gray-500 dark:text-gray-400"> — {LABEL[o.stuck_type]?.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Refunds due (cancelled after payment)</h3>
            {refunds.length === 0 ? (
              <p className="text-sm text-gray-500">No refunds waiting.</p>
            ) : (
              <ul className="divide-y divide-amber-100 dark:divide-gray-700">
                {refunds.map((o) => (
                  <li key={String(o.order_id)} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                    <span className="text-gray-900 dark:text-gray-100">
                      <strong>{o.order_number}</strong> · {kes(o.total_amount)}
                      {o.payment_reference ? <span className="text-gray-500"> · ref {o.payment_reference}</span> : null}
                      <span className="block text-xs text-gray-500">{o.admin_note}</span>
                    </span>
                    <button
                      disabled={busy === String(o.order_id)}
                      onClick={() => markRefunded(o)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium disabled:opacity-50">
                      <Check className="w-3 h-3" /> Mark refunded
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500 mt-2">Send the money first (M-Pesa / Pesapal dashboard), then record the reference here.</p>
          </section>
        </div>
      )}
    </div>
  );
}
