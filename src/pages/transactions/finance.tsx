// src/pages/transactions/Finance.tsx
import React, { useState, useMemo, useEffect, type JSX } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Download,
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTransactions,
  getRefunds,
  isAdmin,
} from '../../services/adminService';
import type { ApiResponse } from '../../services/adminService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Interfaces for database entities
interface Transaction {
  id: string;
  type: 'revenue' | 'expense' | 'commission' | 'payout';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  date: string;
  vendor?: string;
  rider?: string;
  mpesa_code?: string;
  order_id?: string;
  category: string;
}

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayouts: number;
  monthlyGrowth: number;
  transactionCount: number;
  averageOrderValue: number;
  commissionEarned: number;
}

// Date utility functions
const formatDate = (date: Date, formatStr: string) => {
  if (formatStr === 'PPP') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } else if (formatStr === 'MMM dd') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
    });
  } else if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  return date.toLocaleDateString();
};

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const eachDayOfInterval = (interval: { start: Date; end: Date }) => {
  const days = [];
  const current = new Date(interval.start);
  while (current <= interval.end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

// Transaction Table Component
const TransactionTable: React.FC<{
  transactions: Transaction[];
  search: string;
  setSearch: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  formatDate: (date: Date, formatStr: string) => string;
  getStatusIcon: (status: Transaction['status']) => JSX.Element | null;
  getTypeColor: (type: Transaction['type']) => string;
}> = ({
  transactions,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  pageSize,
  selectedTransaction,
  setSelectedTransaction,
  formatDate,
  getStatusIcon,
  getTypeColor,
}) => {
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const searchMatch =
        transaction.id.toLowerCase().includes(search.toLowerCase()) ||
        transaction.description.toLowerCase().includes(search.toLowerCase()) ||
        (transaction.vendor && transaction.vendor.toLowerCase().includes(search.toLowerCase())) ||
        (transaction.rider && transaction.rider.toLowerCase().includes(search.toLowerCase()));
      const typeMatch = typeFilter === 'all' || transaction.type === typeFilter;
      const statusMatch = statusFilter === 'all' || transaction.status === statusFilter;
      return searchMatch && typeMatch && statusMatch;
    });
  }, [transactions, search, typeFilter, statusFilter]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
      <div className="p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Recent Transactions</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                aria-label="Search transactions"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              aria-label="Filter by transaction type"
            >
              <option value="all">All Types</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
              <option value="commission">Commission</option>
              <option value="payout">Payout</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              aria-label="Filter by transaction status"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
          <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">M-PESA</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 font-medium font-mono">{transaction.id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <span className={transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                      {transaction.type === 'expense' ? '-' : '+'}KSH {transaction.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate">{transaction.description}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transaction.status)}
                      <span>{transaction.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{formatDate(new Date(transaction.date), 'PPP')}</td>
                  <td className="px-6 py-4 font-mono text-xs">{transaction.mpesa_code || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition"
                      aria-label={`View transaction ${transaction.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="mb-2 sm:mb-0">
          Showing {paginatedTransactions.length} of {filteredTransactions.length} transaction(s)
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md disabled:opacity-50 transition"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md disabled:opacity-50 transition"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setSelectedTransaction(null)}
              className="absolute top-3 right-3 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Close transaction details"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Transaction Details</h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>ID:</strong> {selectedTransaction.id}</p>
              <p>
                <strong>Type:</strong>{' '}
                <span className={`inline-block text-xs px-2 py-1 rounded-full ${getTypeColor(selectedTransaction.type)}`}>
                  {selectedTransaction.type}
                </span>
              </p>
              <p>
                <strong>Amount:</strong>{' '}
                <span className={selectedTransaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                  {selectedTransaction.type === 'expense' ? '-' : '+'}KSH {selectedTransaction.amount.toLocaleString()}
                </span>
              </p>
              <p><strong>Description:</strong> {selectedTransaction.description}</p>
              <p>
                <strong>Status:</strong>{' '}
                <span className="inline-flex items-center gap-2">
                  {getStatusIcon(selectedTransaction.status)}
                  {selectedTransaction.status}
                </span>
              </p>
              <p><strong>Date:</strong> {formatDate(new Date(selectedTransaction.date), 'PPP')}</p>
              <p><strong>M-PESA Code:</strong> {selectedTransaction.mpesa_code || '-'}</p>
              <p><strong>Vendor:</strong> {selectedTransaction.vendor || '-'}</p>
              <p><strong>Rider:</strong> {selectedTransaction.rider || '-'}</p>
              <p><strong>Order ID:</strong> {selectedTransaction.order_id || '-'}</p>
              <p><strong>Category:</strong> {selectedTransaction.category || '-'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateRange, setDateRange] = useState(30);

  // Fetch transactions from adminService
  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin()) {
        toast.error('Please log in as an admin to view financial data.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response: ApiResponse<Transaction[]> = await getTransactions(1, 100, {
          start_date: formatDate(subDays(new Date(), dateRange), 'yyyy-MM-dd'),
          end_date: formatDate(new Date(), 'yyyy-MM-dd'),
        });
        setTransactions(response.data || []);
      } catch (error: any) {
        console.error('Failed to fetch financial data:', error);
        toast.error(error.message || 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const financialStats = useMemo((): FinancialStats => {
    const completedTransactions = transactions.filter((t) => t.status === 'completed');
    const totalRevenue = completedTransactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = completedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const commissionEarned = completedTransactions
      .filter((t) => t.type === 'commission')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingPayouts = transactions
      .filter((t) => t.type === 'payout' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalRevenue + commissionEarned - totalExpenses;
    const transactionCount = completedTransactions.filter((t) => t.type === 'revenue').length;
    const averageOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    const currentMonth = completedTransactions.filter((t) =>
      new Date(t.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const currentRevenue = currentMonth
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
    const lastMonth = completedTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= lastMonthStart && tDate <= lastMonthEnd;
    });
    const lastRevenue = lastMonth
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingPayouts,
      monthlyGrowth,
      transactionCount,
      averageOrderValue,
      commissionEarned,
    };
  }, [transactions]);

  const revenueChartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), dateRange),
      end: new Date(),
    });

    const dailyRevenue = days.map((day) => {
      const dayTransactions = transactions.filter(
        (t) =>
          t.type === 'revenue' &&
          t.status === 'completed' &&
          formatDate(new Date(t.date), 'yyyy-MM-dd') === formatDate(day, 'yyyy-MM-dd')
      );
      return dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return {
      labels: days.map((day) => formatDate(day, 'MMM dd')),
      datasets: [
        {
          label: 'Revenue (KSH)',
          data: dailyRevenue,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [transactions, dateRange]);

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'revenue':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'commission':
        return 'bg-blue-100 text-blue-800';
      case 'payout':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportFinancialData = () => {
    const csvContent = [
      ['Transaction ID', 'Type', 'Amount', 'Description', 'Status', 'Date', 'Vendor', 'Rider', 'M-PESA Code'].join(
        ','
      ),
      ...transactions.map((t) =>
        [
          t.id,
          t.type,
          t.amount,
          `"${t.description}"`,
          t.status,
          formatDate(new Date(t.date), 'yyyy-MM-dd'),
          t.vendor || '',
          t.rider || '',
          t.mpesa_code || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Financial data exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <svg
          className="animate-spin h-8 w-8 text-green-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-label="Loading financial data"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Financial Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor revenue, expenses, and financial performance metrics.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label="Select date range"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
          </select>
          <button
            onClick={exportFinancialData}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition shadow-md"
            aria-label="Export financial data as CSV"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                KSH {financialStats.totalRevenue.toLocaleString()}
              </p>
              <p
                className={`text-sm ${financialStats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}
              >
                {financialStats.monthlyGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {Math.abs(financialStats.monthlyGrowth).toFixed(1)}% from last month
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                KSH {financialStats.netProfit.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue - Expenses</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Commission Earned</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                KSH {financialStats.commissionEarned.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform fees</p>
            </div>
            <Receipt className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                KSH {financialStats.pendingPayouts.toLocaleString()}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Awaiting payment</p>
            </div>
            <Wallet className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Revenue Trend</h3>
        {revenueChartData.datasets[0].data.length > 0 ? (
          <Line
            data={revenueChartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Revenue Trend (KSH)',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `KSH ${value.toLocaleString()}`,
                  },
                },
              },
            }}
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No revenue data available
          </div>
        )}
      </div>

      <TransactionTable
        transactions={transactions}
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        selectedTransaction={selectedTransaction}
        setSelectedTransaction={setSelectedTransaction}
        formatDate={formatDate}
        getStatusIcon={getStatusIcon}
        getTypeColor={getTypeColor}
      />
    </div>
  );
};

export default Finance;