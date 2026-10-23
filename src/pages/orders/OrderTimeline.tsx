// Order timeline, durations and audit trail for the order detail panel.
import { useEffect, useState } from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { getOrderTimeline, type OrderTimeline as Timeline } from '../../services/adminService';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const DUR: Record<string, string> = { vendor_acceptance: 'Vendor acceptance', preparation: 'Preparation', rider_pickup: 'Rider pickup', delivery: 'Delivery', total: 'Total' };

export default function OrderTimeline({ orderId, version, onLoaded }: { orderId: string; version: number; onLoaded?: (t: Timeline) => void }) {
  const [t, setT] = useState<Timeline | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    getOrderTimeline(orderId)
      .then((r) => { if (alive) { setT(r); setErr(false); onLoaded?.(r); } })
      .catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [orderId, version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p className="text-xs text-gray-400">Timeline unavailable (backend update pending).</p>;
  if (!t) return <p className="text-xs text-gray-400">Loading timeline…</p>;

  const trail = t.history.length
    ? t.history.map((h) => ({ at: h.at, text: `${h.kind === 'order' ? '' : h.kind + ': '}${h.from ?? '—'} → ${h.to}`, who: h.actor_type, reason: h.reason, override: h.override }))
    : t.legacy_audit.map((h) => ({ at: h.at, text: `${h.from ?? '—'} → ${h.to ?? h.action}`, who: h.actor_type, reason: h.reason, override: false }));
  const durations = Object.entries(t.durations_min).filter(([, v]) => v !== null);

  return (
    <div className="space-y-5">
      <ol className="space-y-2">
        {t.steps.map((s) => (
          <li key={s.label} className="flex items-start gap-2 text-sm">
            {s.done ? <CheckCircle size={15} className="text-emerald-500 mt-0.5" /> : <Circle size={15} className="text-gray-300 mt-0.5" />}
            <span className={s.done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{s.label}</span>
            <span className="ml-auto text-xs text-gray-400">{s.done ? fmt(s.at) : 'pending'}</span>
          </li>
        ))}
      </ol>

      {durations.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {durations.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">
              <p className="text-[11px] text-gray-400">{DUR[k] ?? k}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{v} min</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Audit trail</h4>
        {trail.length === 0 ? <p className="text-xs text-gray-400">No changes recorded yet.</p> : (
          <ul className="space-y-2">
            {trail.map((a, i) => (
              <li key={i} className="text-xs border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                <p className="text-gray-800 dark:text-gray-200">
                  {a.text} {a.override && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">override</span>}
                </p>
                <p className="text-gray-400">{fmt(a.at)} · {a.who ?? 'system'}{a.reason ? ` · ${a.reason}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
