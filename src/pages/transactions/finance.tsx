// src/pages/transactions/Finance.tsx
import React, { useState, useEffect, useCallback, type JSX } from 'react';
import {
  Wallet,
  DollarSign,
  Receipt,
  RotateCcw,
  Download,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTransactions,
  getRefunds,
  getPayouts,
  approveRefund,
  rejectRefund,
  createPayout,
  approvePayout,
  rejectPayout,
  completePayout,
  getFinancialSummary,
  exportFinanceData,
  type Transaction,
  type Refund,
  type Payout,
} from '../../services/financeService';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Tab = 'transactions' | 'refunds' | 'payouts';

const PAGE_SIZE = 20;

const formatKES = (amount: number | string | undefined | null) =>
  `KES ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { icon: JSX.Element; cls: string }> = {
    completed: { icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    approved: { icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    processing: { icon: <RefreshCw className="w-3.5 h-3.5" />, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    pending: { icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    failed: { icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    rejected: { icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    refunded: { icon: <RotateCcw className="w-3.5 h-3.5" />, cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  };
  const conf = map[status] || { icon: <AlertCircle className="w-3.5 h-3.5" />, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${conf.cls}`}>
      {conf.icon}
      {status}
    </span>
  );
};

const Pagination: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Finance: React.FC = () => {
  const [tab, setTab] = useState<Tab>('transactions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(30);

  const [summary, setSummary] = useState<{
    totalRevenue: number;
    totalRefunds: number;
    totalPayouts: number;
    totalCommission: number;
    netRevenue: number;
    pendingRefunds: number;
    pendingPayouts: number;
  } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [txType, setTxType] = useState('all');
  const [txStatus, setTxStatus] = useState('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refundPage, setRefundPage] = useState(1);
  const [refundTotalPages, setRefundTotalPages] = useState(1);
  const [refundStatus, setRefundStatus] = useState('all');
  const [refundActionId, setRefundActionId] = useState<string | null>(null);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);
  const [payoutStatus, setPayoutStatus] = useState('all');
  const [payoutEntityType, setPayoutEntityType] = useState('all');
  const [payoutActionId, setPayoutActionId] = useState<string | null>(null);
  const [showCreatePayout, setShowCreatePayout] = useState(false);

  const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];

  const loadSummary = useCallback(async () => {
    try {
      const res = await getFinancialSummary({ start_date: startDate, end_date: endDate });
      setSummary(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load financial summary');
    }
  }, [startDate, endDate]);

  const loadTransactions = useCallback(async () => {
    try {
      const filters: any = { start_date: startDate, end_date: endDate };
      if (txType !== 'all') filters.type = txType;
      if (txStatus !== 'all') filters.status = txStatus;
      if (txSearch.trim()) filters.search = txSearch.trim();
      const res = await getTransactions(txPage, PAGE_SIZE, filters);
      setTransactions((res.data as Transaction[]) || []);
      setTxTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load transactions');
    }
  }, [txPage, txType, txStatus, txSearch, startDate, endDate]);

  const loadRefunds = useCallback(async () => {
    try {
      const filters: any = {};
      if (refundStatus !== 'all') filters.status = refundStatus;
      const res = await getRefunds(refundPage, PAGE_SIZE, filters);
      setRefunds((res.data as Refund[]) || []);
      setRefundTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load refunds');
    }
  }, [refundPage, refundStatus]);

  const loadPayouts = useCallback(async () => {
    try {
      const filters: any = {};
      if (payoutStatus !== 'all') filters.status = payoutStatus;
      if (payoutEntityType !== 'all') filters.entity_type = payoutEntityType;
      const res = await getPayouts(payoutPage, PAGE_SIZE, filters);
      setPayouts((res.data as Payout[]) || []);
      setPayoutTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load payouts');
    }
  }, [payoutPage, payoutStatus, payoutEntityType]);

  const loadAll = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      await Promise.all([loadSummary(), loadTransactions(), loadRefunds(), loadPayouts()]);
      setLoading(false);
      setRefreshing(false);
    },
    [loadSummary, loadTransactions, loadRefunds, loadPayouts]
  );

  useEffect(() => {
    loadAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txPage, txType, txStatus, txSearch]);

  useEffect(() => {
    if (!loading) loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundPage, refundStatus]);

  useEffect(() => {
    if (!loading) loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutPage, payoutStatus, payoutEntityType]);

  useEffect(() => {
    if (!loading) {
      loadSummary();
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleRefresh = () => loadAll(false);

  const handleApproveRefund = async (refund: Refund) => {
    setRefundActionId(refund.refund_id);
    try {
      await approveRefund(refund.refund_id);
      toast.success('Refund approved and wallet credited');
      await loadRefunds();
      await loadSummary();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve refund');
    } finally {
      setRefundActionId(null);
    }
  };

  const handleRejectRefund = async (refund: Refund) => {
    const reason = window.prompt('Reason for rejecting this refund:');
    if (!reason) return;
    setRefundActionId(refund.refund_id);
    try {
      await rejectRefund(refund.refund_id, reason);
      toast.success('Refund rejected');
      await loadRefunds();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject refund');
    } finally {
      setRefundActionId(null);
    }
  };

  const handleApprovePayout = async (payout: Payout) => {
    setPayoutActionId(payout.payout_id);
    try {
      await approvePayout(payout.payout_id);
      toast.success('Payout approved');
      await loadPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payout');
    } finally {
      setPayoutActionId(null);
    }
  };

  const handleRejectPayout = async (payout: Payout) => {
    const reason = window.prompt('Reason for rejecting this payout:');
    if (!reason) return;
    setPayoutActionId(payout.payout_id);
    try {
      await rejectPayout(payout.payout_id, reason);
      toast.success('Payout rejected');
      await loadPayouts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject payout');
    } finally {
      setPayoutActionId(null);
    }
  };

  const handleCompletePayout = async (payout: Payout) => {
    setPayoutActionId(payout.payout_id);
    try {
      await completePayout(payout.payout_id);
      toast.success('Payout marked completed');
      await loadPayouts();
      await loadSummary();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete payout');
    } finally {
      setPayoutActionId(null);
    }
  };

  const handleExport = async () => {
    try {
      const type = tab;
      const res = await exportFinanceData(type, { start_date: startDate, end_date: endDate });
      const rows: any[] = res.data || [];
      if (rows.length === 0) {
        toast('Nothing to export for the selected range', { icon: 'ℹ️' });
        return;
      }
      if (type === 'transactions') {
        downloadCsv(
          `transactions_${startDate}_${endDate}.csv`,
          ['Transaction Ref', 'Type', 'Amount', 'Status', 'Gateway', 'Customer', 'Initiated At'],
          rows.map((t) => [
            t.transaction_ref,
            t.transaction_type,
            t.amount,
            t.status,
            t.payment_gateway,
            t.user ? `${t.user.first_name} ${t.user.last_name}` : '',
            formatDate(t.initiated_at),
          ])
        );
      } else if (type === 'refunds') {
        downloadCsv(
          `refunds_${startDate}_${endDate}.csv`,
          ['Refund ID', 'Transaction Ref', 'Amount', 'Reason', 'Status', 'Requested At'],
          rows.map((r) => [r.refund_id, r.transaction?.transaction_ref || '', r.amount, r.reason, r.status, formatDate(r.requested_at)])
        );
      } else {
        downloadCsv(
          `payouts_${startDate}_${endDate}.csv`,
          ['Payout Ref', 'Entity Type', 'Amount', 'Method', 'Status', 'Created At'],
          rows.map((p) => [p.payout_ref, p.entity_type, p.amount, p.method, p.status, formatDate(p.created_at)])
        );
      }
      toast.success('Export downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export data');
    }
  };

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
    { key: 'refunds', label: 'Refunds', icon: <RotateCcw className="w-4 h-4" /> },
    { key: 'payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4" /> },
  ];

  const statusBreakdownChart = summary
    ? {
        labels: ['Revenue', 'Refunds', 'Payouts', 'Commission'],
        datasets: [
          {
            label: 'KES',
            data: [summary.totalRevenue, summary.totalRefunds, summary.totalPayouts, summary.totalCommission],
            backgroundColor: ['#22c55e', '#ef4444', '#a855f7', '#3b82f6'],
            borderRadius: 6,
          },
        ],
      }
    : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Transactions & Finance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform-wide payments, refunds, payouts and revenue performance.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
            <option value={365}>Last 12 months</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Export {tab}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatKES(summary?.totalRevenue)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed payments in range</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatKES(summary?.netRevenue)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue − refunds − payouts</p>
            </div>
            <Receipt className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Refunds</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary?.pendingRefunds ?? 0}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Awaiting review</p>
            </div>
            <RotateCcw className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary?.pendingPayouts ?? 0}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Awaiting approval</p>
            </div>
            <Wallet className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {statusBreakdownChart && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Revenue Breakdown</h3>
          <Bar
            data={statusBreakdownChart}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => `KES ${Number(v).toLocaleString()}` } } },
            }}
          />
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">All Transactions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search ref / gateway ID..."
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={txType}
                onChange={(e) => {
                  setTxType(e.target.value);
                  setTxPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
                <option value="payout">Payout</option>
                <option value="fee">Fee</option>
                <option value="commission">Commission</option>
              </select>
              <select
                value={txStatus}
                onChange={(e) => {
                  setTxStatus(e.target.value);
                  setTxPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
              <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Gateway</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      No transactions found for this filter.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.transaction_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-mono text-xs">{t.transaction_ref}</td>
                      <td className="px-6 py-4 capitalize">{t.transaction_type}</td>
                      <td className="px-6 py-4 font-medium">{formatKES(t.amount)}</td>
                      <td className="px-6 py-4">{t.user ? `${t.user.first_name} ${t.user.last_name}` : '—'}</td>
                      <td className="px-6 py-4 capitalize">{t.payment_gateway}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(t.initiated_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTx(t)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={txPage} totalPages={txTotalPages} onChange={setTxPage} />
        </div>
      )}

      {tab === 'refunds' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Refund Requests</h3>
            <select
              value={refundStatus}
              onChange={(e) => {
                setRefundStatus(e.target.value);
                setRefundPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
              <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Requested</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      No refund requests found.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => (
                    <tr key={r.refund_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">{r.user ? `${r.user.first_name} ${r.user.last_name}` : '—'}</td>
                      <td className="px-6 py-4">{r.order?.order_number || '—'}</td>
                      <td className="px-6 py-4 font-medium">{formatKES(r.amount)}</td>
                      <td className="px-6 py-4 max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(r.requested_at)}</td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={refundActionId === r.refund_id}
                              onClick={() => handleApproveRefund(r)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={refundActionId === r.refund_id}
                              onClick={() => handleRejectRefund(r)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">{formatDate(r.processed_at)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={refundPage} totalPages={refundTotalPages} onChange={setRefundPage} />
        </div>
      )}

      {tab === 'payouts' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Vendor & Rider Payouts</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={payoutEntityType}
                onChange={(e) => {
                  setPayoutEntityType(e.target.value);
                  setPayoutPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Vendors & Riders</option>
                <option value="vendor">Vendors</option>
                <option value="rider">Riders</option>
              </select>
              <select
                value={payoutStatus}
                onChange={(e) => {
                  setPayoutStatus(e.target.value);
                  setPayoutPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={() => setShowCreatePayout(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
              >
                New Payout
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
              <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Recipient</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      No payouts found.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.payout_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-mono text-xs">{p.payout_ref}</td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-xs text-gray-500 dark:text-gray-400 block">{p.entity_type}</span>
                        {p.entity_name || `#${p.entity_id}`}
                      </td>
                      <td className="px-6 py-4 font-medium">{formatKES(p.amount)}</td>
                      <td className="px-6 py-4 capitalize">{p.method.replace('_', ' ')}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(p.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status === 'pending' && (
                            <>
                              <button
                                disabled={payoutActionId === p.payout_id}
                                onClick={() => handleApprovePayout(p)}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={payoutActionId === p.payout_id}
                                onClick={() => handleRejectPayout(p)}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(p.status === 'approved' || p.status === 'processing') && (
                            <button
                              disabled={payoutActionId === p.payout_id}
                              onClick={() => handleCompletePayout(p)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={payoutPage} totalPages={payoutTotalPages} onChange={setPayoutPage} />
        </div>
      )}

      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTx(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ['Reference', selectedTx.transaction_ref],
                ['Type', selectedTx.transaction_type],
                ['Amount', formatKES(selectedTx.amount)],
                ['Gateway', selectedTx.payment_gateway],
                ['Gateway Transaction ID', selectedTx.gateway_transaction_id || '—'],
                ['Status', selectedTx.status],
                ['Customer', selectedTx.user ? `${selectedTx.user.first_name} ${selectedTx.user.last_name} (${selectedTx.user.phone_number})` : '—'],
                ['Order', selectedTx.order?.order_number || '—'],
                ['Initiated', formatDate(selectedTx.initiated_at)],
                ['Completed', formatDate(selectedTx.completed_at)],
                ['Failure Reason', selectedTx.failure_reason || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {showCreatePayout && (
        <CreatePayoutModal
          onClose={() => setShowCreatePayout(false)}
          onCreated={() => {
            setShowCreatePayout(false);
            loadPayouts();
          }}
        />
      )}
    </div>
  );
};

const CreatePayoutModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [entityType, setEntityType] = useState<'vendor' | 'rider'>('vendor');
  const [entityId, setEntityId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'mpesa' | 'bank_transfer'>('mpesa');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId || !amount || Number(amount) <= 0) {
      toast.error('Please enter a valid recipient ID and amount');
      return;
    }
    setSubmitting(true);
    try {
      await createPayout({
        entity_type: entityType,
        entity_id: entityId,
        amount: Number(amount),
        method,
        description: description || undefined,
      });
      toast.success('Payout created');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">New Payout</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as 'vendor' | 'rider')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="vendor">Vendor</option>
              <option value="rider">Rider</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {entityType === 'vendor' ? 'Vendor ID' : 'Rider ID'}
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g. 14"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (KES)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'mpesa' | 'bank_transfer')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Payout'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Finance;
