// src/pages/transactions/RiderCashTab.tsx
// Finance: review rider cash-on-delivery remittances (riders pay collected cash
// to AquaGas by M-Pesa and submit the confirmation code) and see who is holding cash.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, X, RefreshCw } from 'lucide-react';
import api from '../../services/api';

interface Remittance {
  remittance_id: number | string;
  rider_id: number | string;
  rider_name: string;
  amount: number;
  mpesa_code: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}
interface Holder { rider_id: number | string; rider_name: string; cash_in_hand: number }

const kes = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '—');
const badge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export default function RiderCashTab() {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected' | 'all'>('pending');
  const [rows, setRows] = useState<Remittance[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/riders/cash-remittances', { params: status === 'all' ? {} : { status } });
      setRows(res.data?.data || []);
      setHolders(res.data?.riders_holding_cash || []);
      setLimit(Number(res.data?.cash_limit || 0));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load rider cash');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const review = async (r: Remittance, action: 'confirm' | 'reject') => {
    let reason: string | null = '';
    if (action === 'reject') {
      reason = window.prompt(`Why reject ${r.mpesa_code}? (shown to the rider)`);
      if (!reason?.trim()) return;
    } else if (!window.confirm(`Confirm ${kes(r.amount)} from ${r.rider_name}?\nCheck M-Pesa code ${r.mpesa_code} in your paybill/till statement first.`)) {
      return;
    }
    setBusy(String(r.remittance_id));
    try {
      await api.put(`/v1/riders/cash-remittances/${r.remittance_id}/${action}`, action === 'reject' ? { reason } : {});
      toast.success(action === 'confirm' ? 'Remittance confirmed' : 'Remittance rejected');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || `Failed to ${action}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Riders holding cash</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Cash collected on delivery minus confirmed remittances{limit > 0 ? ` · limit ${kes(limit)} per rider` : ''}.
        </p>
        {holders.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No rider is holding company cash.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {holders.map((h) => (
              <li key={String(h.rider_id)} className="py-2 flex justify-between text-sm">
                <span className="text-gray-800 dark:text-gray-200">{h.rider_name}</span>
                <span className={limit > 0 && h.cash_in_hand >= limit ? 'font-semibold text-red-600' : 'font-medium text-gray-800 dark:text-gray-200'}>
                  {kes(h.cash_in_hand)}{limit > 0 && h.cash_in_hand >= limit ? ' · over limit' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Cash remittances</h3>
          <div className="flex gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <button onClick={load} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Rider</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">M-Pesa code</th>
                <th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{loading ? 'Loading…' : 'No remittances.'}</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r.remittance_id)} className="text-gray-800 dark:text-gray-200">
                  <td className="px-4 py-3">{r.rider_name}</td>
                  <td className="px-4 py-3 font-medium">{kes(r.amount)}</td>
                  <td className="px-4 py-3 font-mono">{r.mpesa_code}</td>
                  <td className="px-4 py-3">{when(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${badge[r.status]}`}>{r.status}</span>
                    {r.rejection_reason && <span className="block text-xs text-gray-500 mt-1">{r.rejection_reason}</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.status === 'pending' && (
                      <>
                        <button disabled={busy === String(r.remittance_id)} onClick={() => review(r, 'confirm')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 mr-2 rounded-md bg-green-600 text-white disabled:opacity-50">
                          <Check className="w-4 h-4" /> Confirm
                        </button>
                        <button disabled={busy === String(r.remittance_id)} onClick={() => review(r, 'reject')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white disabled:opacity-50">
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
