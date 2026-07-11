import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Truck,
  Store,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  BadgeCheck,
  Sparkles,
  FileBarChart,
  Wallet,
  PieChart as PieChartIcon,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import api from '../../services/api';

// ============================================================
// Type definitions
// ============================================================

interface OverviewStats {
  totalUsers: number;
  totalVendors: number;
  totalRiders: number;
  totalOrders: number;
  totalRevenue: number;
  periodOrders: number;
  periodRevenue: number;
}

interface SalesDataItem {
  date: string;
  totalSales: number;
  totalOrders: number;
}

interface UserGrowthItem {
  date: string;
  totalUsers: number;
}

interface RevenueDataItem {
  date: string;
  totalRevenue: number;
  totalDeliveryFees: number;
  totalDiscounts: number;
}

interface OrderStatusItem {
  status: string;
  count: number;
}

interface CommissionItem {
  date: string;
  totalCommission: number;
  transactionCount: number;
  estimated: boolean;
  rate?: number;
}

interface RiderInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  rider_id?: number;
}

interface DeliveryPerformanceItem {
  rider: RiderInfo;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  avgDurationMinutes: number;
  totalEarnings: number;
}

interface RiderPerformanceRow {
  rider_id: number | string;
  rider_name: string;
  vehicle_type: string | null;
  rating: number | string | null;
  total_reviews: number | string | null;
  total_deliveries: number | string | null;
  current_status: string | null;
  is_verified: boolean | number;
  is_active: boolean | number;
  deliveries_today: number | string | null;
  avg_delivery_time: number | string | null;
  earnings_today: number | string | null;
}

interface VendorPerformanceRow {
  vendor_id: number | string;
  business_name: string;
  brand: string | null;
  rating: number | string | null;
  total_reviews: number | string | null;
  is_verified: boolean | number;
  is_featured: boolean | number;
  total_outlets: number | string | null;
  completed_orders: number | string | null;
  total_revenue: number | string | null;
  avg_order_value: number | string | null;
  orders_today: number | string | null;
}

interface ChartDataItem {
  date: string;
  value: number;
  orders?: number;
  compareValue?: number;
}

interface DeliveryPieDataItem {
  name: string;
  value: number;
  total: number;
  color: string;
}

interface CalculatedMetrics {
  successRate: number;
  averageOrderValue: number;
  totalOrders: number;
  totalSales: number;
  revenueGrowth: number;
}

type RangeKey = '7d' | '30d' | '90d' | '12m' | 'custom';
type ActiveChart = 'sales' | 'users' | 'revenue';
type TabKey = 'overview' | 'sales' | 'riders' | 'vendors' | 'reports';
type SortDir = 'asc' | 'desc';

interface DateBounds {
  start: Date;
  end: Date;
}

// ============================================================
// Constants
// ============================================================

const RANGE_DAYS: Record<Exclude<RangeKey, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16'];

const ORDER_STATUS_COLORS: Record<string, string> = {
  delivered: '#10B981',
  pending: '#F59E0B',
  confirmed: '#6366F1',
  preparing: '#8B5CF6',
  out_for_delivery: '#06B6D4',
  cancelled: '#EF4444',
  rejected: '#F87171',
  refunded: '#F97316',
};

const REPORTABLE_MODELS: Record<string, { label: string; groupable: { value: string; label: string }[]; fields: { value: string; label: string }[] }> = {
  orders: {
    label: 'Orders',
    groupable: [
      { value: 'order_status', label: 'Order status' },
      { value: 'payment_status', label: 'Payment status' },
      { value: 'delivery_type', label: 'Delivery type' },
      { value: 'vendor_id', label: 'Vendor' },
    ],
    fields: [
      { value: 'total_amount', label: 'Total amount' },
      { value: 'order_id', label: 'Order ID' },
      { value: 'subtotal', label: 'Subtotal' },
      { value: 'delivery_fee', label: 'Delivery fee' },
    ],
  },
  transactions: {
    label: 'Transactions',
    groupable: [
      { value: 'transaction_type', label: 'Transaction type' },
      { value: 'status', label: 'Status' },
      { value: 'payment_gateway', label: 'Payment gateway' },
    ],
    fields: [
      { value: 'amount', label: 'Amount' },
      { value: 'transaction_id', label: 'Transaction ID' },
    ],
  },
  users: {
    label: 'Users',
    groupable: [
      { value: 'preferred_language', label: 'Preferred language' },
      { value: 'is_premium', label: 'Premium status' },
    ],
    fields: [{ value: 'user_id', label: 'User ID' }],
  },
};

const AGGREGATE_FNS = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'] as const;

// ============================================================
// Utility functions
// ============================================================

const toISODate = (d: Date): string => d.toISOString().split('T')[0];

const formatCurrency = (amount: number): string => `KSh ${Math.round(amount).toLocaleString()}`;

const calculateGrowth = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Splits a time series in half and compares the second half's total against
// the first half's — adapts automatically to whatever granularity/range the
// backend returns (daily, weekly, monthly buckets). Returns undefined (no
// badge shown) when there isn't enough data to support a real comparison.
const calcTrend = (series: number[]): number | undefined => {
  if (series.length < 4) return undefined;
  const mid = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, mid).reduce((a, b) => a + b, 0);
  const secondHalf = series.slice(mid).reduce((a, b) => a + b, 0);
  if (firstHalf === 0) return undefined;
  return calculateGrowth(secondHalf, firstHalf);
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

const bool = (v: unknown): boolean => v === true || v === 1 || v === '1';

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getRangeBounds = (range: RangeKey, customStart: string, customEnd: string): DateBounds => {
  if (range === 'custom' && customStart && customEnd) {
    return { start: new Date(customStart), end: new Date(customEnd) };
  }
  const days = RANGE_DAYS[range as Exclude<RangeKey, 'custom'>] ?? 30;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
};

const getPreviousBounds = (bounds: DateBounds): DateBounds => {
  const durationMs = bounds.end.getTime() - bounds.start.getTime();
  const prevEnd = new Date(bounds.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
};

const arrayToCSV = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\n');
};

const downloadFile = (content: string, filename: string, mime: string): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================
// Small UI atoms
// ============================================================

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return null;
  const w = 100;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full overflow-visible" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Badge: React.FC<{ tone: 'green' | 'amber' | 'red' | 'gray' | 'indigo'; children: ReactNode }> = ({ tone, children }) => {
  const tones: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

const EmptyState: React.FC<{ icon: LucideIcon; title: string; hint?: string }> = ({ icon: Icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <Icon className="h-10 w-10 text-gray-300" />
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const ErrorBanner: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-red-200 transition-colors hover:bg-red-50"
    >
      <RefreshCw className="h-3 w-3" />
      Retry
    </button>
  </div>
);

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  sparklineData?: number[];
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, iconColor, iconBg, sparklineData, loading = false }) => {
  const formattedValue =
    typeof value === 'number' && title.toLowerCase().includes('revenue')
      ? formatCurrency(value)
      : typeof value === 'number' && title.toLowerCase().includes('rate')
      ? `${value.toFixed(1)}%`
      : value.toLocaleString();

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} shadow-sm transition-transform group-hover:scale-110`}>
          <Icon className={iconColor} size={18} />
        </div>
      </div>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-gray-900">{formattedValue}</p>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {change !== undefined && !loading ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{Math.abs(change).toFixed(1)}% vs prior period</span>
          </div>
        ) : (
          <span />
        )}
      </div>

      {sparklineData && sparklineData.length > 1 && !loading && (
        <div className="mt-2">
          <Sparkline data={sparklineData} color={iconColor.replace('text-', '').startsWith('#') ? iconColor : '#94a3b8'} />
        </div>
      )}
    </div>
  );
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  actions?: ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, loading = false, actions }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {loading ? <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> : children}
  </div>
);

interface TimeRangeSelectorProps {
  selected: RangeKey;
  onChange: (range: RangeKey) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onChange, customStart, customEnd, onCustomChange }) => {
  const ranges: { value: RangeKey; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '3 Months' },
    { value: '12m', label: '12 Months' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected === range.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      {selected === 'custom' && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-sm">
          <input
            type="date"
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => onCustomChange(e.target.value, customEnd)}
            className="rounded-lg border-0 px-1 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            max={toISODate(new Date())}
            onChange={(e) => onCustomChange(customStart, e.target.value)}
            className="rounded-lg border-0 px-1 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      )}
    </div>
  );
};

const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-56"
    />
  </div>
);

const SortHeader: React.FC<{ label: string; sortKey: string; active: string; dir: SortDir; onClick: (key: string) => void }> = ({
  label,
  sortKey,
  active,
  dir,
  onClick,
}) => (
  <th
    onClick={() => onClick(sortKey)}
    className="cursor-pointer select-none px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-600"
  >
    <span className="flex items-center gap-1">
      {label}
      {active === sortKey ? dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-30" />}
    </span>
  </th>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: LucideIcon; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:shadow-sm'
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

// ============================================================
// Main component
// ============================================================

const AdminAnalytics: React.FC = () => {
  // Global filters
  const [timeRange, setTimeRange] = useState<RangeKey>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeChart, setActiveChart] = useState<ActiveChart>('sales');
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

  // Overview / sales tab data
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalUsers: 0,
    totalVendors: 0,
    totalRiders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    periodOrders: 0,
    periodRevenue: 0,
  });
  const [salesData, setSalesData] = useState<SalesDataItem[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataItem[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusItem[]>([]);
  const [commissionData, setCommissionData] = useState<CommissionItem[]>([]);
  const [deliveryPerformance, setDeliveryPerformance] = useState<DeliveryPerformanceItem[]>([]);
  const [compareSeries, setCompareSeries] = useState<number[]>([]);

  // Riders / vendors tab data
  const [riderRows, setRiderRows] = useState<RiderPerformanceRow[]>([]);
  const [vendorRows, setVendorRows] = useState<VendorPerformanceRow[]>([]);
  const [riderLoaded, setRiderLoaded] = useState(false);
  const [vendorLoaded, setVendorLoaded] = useState(false);
  const [riderSearch, setRiderSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [riderSort, setRiderSort] = useState<{ key: string; dir: SortDir }>({ key: 'total_deliveries', dir: 'desc' });
  const [vendorSort, setVendorSort] = useState<{ key: string; dir: SortDir }>({ key: 'total_revenue', dir: 'desc' });

  // Reports tab
  const [reportModel, setReportModel] = useState<string>('orders');
  const [reportGroupBy, setReportGroupBy] = useState<string>('order_status');
  const [reportAggFn, setReportAggFn] = useState<(typeof AGGREGATE_FNS)[number]>('SUM');
  const [reportAggField, setReportAggField] = useState<string>('total_amount');
  const [reportResults, setReportResults] = useState<Record<string, unknown>[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRan, setReportRan] = useState(false);

  // Loading / error state per section
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [riderError, setRiderError] = useState<string | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);

  const bounds = useMemo(() => getRangeBounds(timeRange, customStart, customEnd), [timeRange, customStart, customEnd]);
  const params = useMemo(() => ({ start_date: toISODate(bounds.start), end_date: toISODate(bounds.end) }), [bounds]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ---------------- Core fetchers ----------------

  const fetchOverviewStats = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/overview', { params });
    const data = res.data?.data ?? res.data;
    setOverviewStats({
      totalUsers: num(data.totalUsers),
      totalVendors: num(data.totalVendors),
      totalRiders: num(data.totalRiders),
      totalOrders: num(data.totalOrders),
      totalRevenue: num(data.totalRevenue),
      periodOrders: num(data.periodOrders),
      periodRevenue: num(data.periodRevenue),
    });
  }, [params]);

  const fetchSalesData = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/sales', { params });
    const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setSalesData(
      data.map((item) => {
        const row = item as Record<string, unknown>;
        return { date: String(row.date), totalSales: num(row.totalSales), totalOrders: num(row.totalOrders) };
      })
    );
  }, [params]);

  const fetchUserGrowthData = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/users', { params });
    const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setUserGrowthData(
      data.map((item) => {
        const row = item as Record<string, unknown>;
        return { date: String(row.date), totalUsers: num(row.totalUsers) };
      })
    );
  }, [params]);

  const fetchRevenueData = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/revenue', { params });
    const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setRevenueData(
      data.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          date: String(row.date),
          totalRevenue: num(row.totalRevenue),
          totalDeliveryFees: num(row.totalDeliveryFees),
          totalDiscounts: num(row.totalDiscounts),
        };
      })
    );
  }, [params]);

  const fetchOrderStatusData = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/orders', { params });
    const data = res.data?.data ?? res.data ?? {};
    const breakdown: unknown[] = Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [];
    setOrderStatusData(
      breakdown.map((item) => {
        const row = item as Record<string, unknown>;
        return { status: String(row.status ?? 'unknown'), count: num(row.count) };
      })
    );
  }, [params]);

  const fetchCommissionData = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/commissions', { params });
    const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setCommissionData(
      data.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          date: String(row.date),
          totalCommission: num(row.totalCommission),
          transactionCount: num(row.transactionCount),
          estimated: bool(row.estimated),
          rate: row.rate !== undefined ? num(row.rate) : undefined,
        };
      })
    );
  }, [params]);

  const fetchDeliveryPerformance = useCallback(async (): Promise<void> => {
    const res = await api.get('/v1/analytics/delivery-performance', { params });
    const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setDeliveryPerformance(
      data.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          rider: (row.rider as RiderInfo) ?? {},
          totalDeliveries: num(row.totalDeliveries),
          completedDeliveries: num(row.completedDeliveries),
          cancelledDeliveries: num(row.cancelledDeliveries),
          avgDurationMinutes: num(row.avgDurationMinutes),
          totalEarnings: num(row.totalEarnings),
        };
      })
    );
  }, [params]);

  const fetchCoreData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setOverviewError(null);
    try {
      await Promise.all([
        fetchOverviewStats(),
        fetchSalesData(),
        fetchUserGrowthData(),
        fetchRevenueData(),
        fetchOrderStatusData(),
        fetchCommissionData(),
        fetchDeliveryPerformance(),
      ]);
    } catch (error) {
      console.error('Error fetching analytics overview data:', error);
      if (isMounted.current) setOverviewError('Could not load analytics data. Check your connection and try again.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [fetchOverviewStats, fetchSalesData, fetchUserGrowthData, fetchRevenueData, fetchOrderStatusData, fetchCommissionData, fetchDeliveryPerformance]);

  const fetchRiderRows = useCallback(async (): Promise<void> => {
    setRiderError(null);
    try {
      const res = await api.get('/v1/analytics/rider-performance');
      const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setRiderRows(data as RiderPerformanceRow[]);
      setRiderLoaded(true);
    } catch (error) {
      console.error('Error fetching rider performance:', error);
      setRiderError('Could not load rider leaderboard.');
    }
  }, []);

  const fetchVendorRows = useCallback(async (): Promise<void> => {
    setVendorError(null);
    try {
      const res = await api.get('/v1/analytics/vendor-performance');
      const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setVendorRows(data as VendorPerformanceRow[]);
      setVendorLoaded(true);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      setVendorError('Could not load vendor leaderboard.');
    }
  }, []);

  // Compare-to-previous-period series for whichever chart is active
  const fetchCompareSeries = useCallback(async (): Promise<void> => {
    if (!compareEnabled) {
      setCompareSeries([]);
      return;
    }
    const prev = getPreviousBounds(bounds);
    const prevParams = { start_date: toISODate(prev.start), end_date: toISODate(prev.end) };
    try {
      const endpoint = activeChart === 'sales' ? '/v1/analytics/sales' : activeChart === 'users' ? '/v1/analytics/users' : '/v1/analytics/revenue';
      const res = await api.get(endpoint, { params: prevParams });
      const data: unknown[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const series = data.map((item) => {
        const row = item as Record<string, unknown>;
        if (activeChart === 'sales') return num(row.totalSales);
        if (activeChart === 'users') return num(row.totalUsers);
        return num(row.totalRevenue);
      });
      setCompareSeries(series);
    } catch (error) {
      console.error('Error fetching comparison series:', error);
      setCompareSeries([]);
    }
  }, [compareEnabled, bounds, activeChart]);

  // Initial + range-driven fetch
  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  useEffect(() => {
    fetchCompareSeries();
  }, [fetchCompareSeries]);

  useEffect(() => {
    if (activeTab === 'riders' && !riderLoaded) fetchRiderRows();
    if (activeTab === 'vendors' && !vendorLoaded) fetchVendorRows();
  }, [activeTab, riderLoaded, vendorLoaded, fetchRiderRows, fetchVendorRows]);

  // Auto-refresh every 60s when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchCoreData();
      if (riderLoaded) fetchRiderRows();
      if (vendorLoaded) fetchVendorRows();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchCoreData, fetchRiderRows, fetchVendorRows, riderLoaded, vendorLoaded]);

  const handleRefreshAll = (): void => {
    fetchCoreData();
    if (riderLoaded) fetchRiderRows();
    if (vendorLoaded) fetchVendorRows();
  };

  // ---------------- Derived data ----------------

  const chartData = useMemo((): ChartDataItem[] => {
    const base: ChartDataItem[] =
      activeChart === 'sales'
        ? salesData.map((item) => ({ date: formatDate(item.date), value: item.totalSales, orders: item.totalOrders }))
        : activeChart === 'users'
        ? userGrowthData.map((item) => ({ date: formatDate(item.date), value: item.totalUsers }))
        : revenueData.map((item) => ({ date: formatDate(item.date), value: item.totalRevenue }));

    if (compareEnabled && compareSeries.length) {
      return base.map((item, i) => ({ ...item, compareValue: compareSeries[i] }));
    }
    return base;
  }, [activeChart, salesData, userGrowthData, revenueData, compareEnabled, compareSeries]);

  const revenueCompositionData = useMemo(
    () =>
      revenueData.map((item) => ({
        date: formatDate(item.date),
        Revenue: item.totalRevenue,
        'Delivery Fees': item.totalDeliveryFees,
        Discounts: -item.totalDiscounts,
      })),
    [revenueData]
  );

  const commissionChartData = useMemo(
    () => commissionData.map((item) => ({ date: formatDate(item.date), value: item.totalCommission, transactions: item.transactionCount })),
    [commissionData]
  );
  const commissionIsEstimated = commissionData.length > 0 && commissionData.every((c) => c.estimated);

  const orderStatusPieData = useMemo(
    () =>
      orderStatusData.map((item, i) => ({
        name: titleCase(item.status),
        value: item.count,
        color: ORDER_STATUS_COLORS[item.status] ?? COLORS[i % COLORS.length],
      })),
    [orderStatusData]
  );

  const deliveryPieData = useMemo((): DeliveryPieDataItem[] => {
    if (!deliveryPerformance.length) return [];
    return deliveryPerformance
      .slice()
      .sort((a, b) => b.completedDeliveries - a.completedDeliveries)
      .slice(0, 5)
      .map((rider, index) => ({
        name: rider.rider?.name || rider.rider?.first_name || `Rider ${index + 1}`,
        value: rider.completedDeliveries,
        total: rider.totalDeliveries,
        color: COLORS[index % COLORS.length],
      }));
  }, [deliveryPerformance]);

  const calculatedMetrics = useMemo((): CalculatedMetrics => {
    const totalDeliveries = deliveryPerformance.reduce((sum, rider) => sum + rider.totalDeliveries, 0);
    const totalCompleted = deliveryPerformance.reduce((sum, rider) => sum + rider.completedDeliveries, 0);
    const successRate = totalDeliveries > 0 ? (totalCompleted / totalDeliveries) * 100 : 0;

    const totalOrders = salesData.reduce((sum, item) => sum + item.totalOrders, 0);
    const totalSales = salesData.reduce((sum, item) => sum + item.totalSales, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const revenueGrowth = calcTrend(revenueData.map((item) => item.totalRevenue)) ?? 0;

    return { successRate, averageOrderValue, totalOrders, totalSales, revenueGrowth };
  }, [salesData, deliveryPerformance, revenueData]);

  // Real period-over-period trends for the KPI cards. `undefined` means there
  // isn't enough data to support a claim, in which case the card simply omits
  // the trend badge rather than showing a made-up number.
  const usersTrend = useMemo(() => calcTrend(userGrowthData.map((item) => item.totalUsers)), [userGrowthData]);
  const ordersTrend = useMemo(() => calcTrend(salesData.map((item) => item.totalOrders)), [salesData]);
  const revenueTrend = useMemo(() => calcTrend(revenueData.map((item) => item.totalRevenue)), [revenueData]);

  const topVendor = useMemo(() => {
    if (!vendorRows.length) return null;
    return vendorRows.slice().sort((a, b) => num(b.total_revenue) - num(a.total_revenue))[0];
  }, [vendorRows]);

  const topRider = useMemo(() => {
    if (!riderRows.length) return null;
    return riderRows.slice().sort((a, b) => num(b.rating) - num(a.rating))[0];
  }, [riderRows]);

  const filteredSortedRiders = useMemo(() => {
    const q = riderSearch.trim().toLowerCase();
    const filtered = q ? riderRows.filter((r) => (r.rider_name ?? '').toLowerCase().includes(q)) : riderRows.slice();
    filtered.sort((a, b) => {
      const av = a[riderSort.key as keyof RiderPerformanceRow];
      const bv = b[riderSort.key as keyof RiderPerformanceRow];
      const an = num(av);
      const bn = num(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && (typeof av === 'number' || typeof av === 'string')) {
        return riderSort.dir === 'asc' ? an - bn : bn - an;
      }
      return riderSort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return filtered;
  }, [riderRows, riderSearch, riderSort]);

  const filteredSortedVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    const filtered = q ? vendorRows.filter((v) => (v.business_name ?? '').toLowerCase().includes(q)) : vendorRows.slice();
    filtered.sort((a, b) => {
      const av = a[vendorSort.key as keyof VendorPerformanceRow];
      const bv = b[vendorSort.key as keyof VendorPerformanceRow];
      const an = num(av);
      const bn = num(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && (typeof av === 'number' || typeof av === 'string')) {
        return vendorSort.dir === 'asc' ? an - bn : bn - an;
      }
      return vendorSort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return filtered;
  }, [vendorRows, vendorSearch, vendorSort]);

  const toggleRiderSort = (key: string): void => {
    setRiderSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };
  const toggleVendorSort = (key: string): void => {
    setVendorSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  // ---------------- Reports tab ----------------

  const handleModelChange = (model: string): void => {
    setReportModel(model);
    const config = REPORTABLE_MODELS[model];
    setReportGroupBy(config.groupable[0].value);
    setReportAggField(config.fields[0].value);
    setReportResults([]);
    setReportRan(false);
  };

  const handleGenerateReport = async (): Promise<void> => {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await api.post('/v1/analytics/reports/generate', {
        model: reportModel,
        groupBy: reportGroupBy,
        aggregate: { fn: reportAggFn, field: reportAggField },
      });
      const data: unknown[] = res.data?.data ?? [];
      setReportResults(data as Record<string, unknown>[]);
      setReportRan(true);
    } catch (error) {
      console.error('Error generating custom report:', error);
      setReportError('Could not generate this report. Try a different combination of fields.');
    } finally {
      setReportLoading(false);
    }
  };

  const reportChartData = useMemo(() => {
    if (!reportResults.length) return [];
    const aggKey = Object.keys(reportResults[0]).find((k) => k !== reportGroupBy) ?? '';
    return reportResults.map((row) => ({
      name: titleCase(String(row[reportGroupBy] ?? 'unknown')),
      value: num(row[aggKey]),
    }));
  }, [reportResults, reportGroupBy]);

  // ---------------- Export ----------------

  const handleExportJSON = (): void => {
    const exportData = {
      overview: overviewStats,
      sales: salesData,
      userGrowth: userGrowthData,
      revenue: revenueData,
      orderStatus: orderStatusData,
      commissions: commissionData,
      deliveryPerformance,
      riders: riderRows,
      vendors: vendorRows,
      timeRange,
      range: { start: toISODate(bounds.start), end: toISODate(bounds.end) },
      generatedAt: new Date().toISOString(),
    };
    downloadFile(JSON.stringify(exportData, null, 2), `analytics-${toISODate(new Date())}.json`, 'application/json');
    setExportMenuOpen(false);
  };

  const handleExportCSV = (which: 'sales' | 'riders' | 'vendors'): void => {
    if (which === 'sales') {
      downloadFile(arrayToCSV(salesData as unknown as Record<string, unknown>[]), `sales-${toISODate(new Date())}.csv`, 'text/csv');
    } else if (which === 'riders') {
      downloadFile(arrayToCSV(filteredSortedRiders as unknown as Record<string, unknown>[]), `riders-${toISODate(new Date())}.csv`, 'text/csv');
    } else {
      downloadFile(arrayToCSV(filteredSortedVendors as unknown as Record<string, unknown>[]), `vendors-${toISODate(new Date())}.csv`, 'text/csv');
    }
    setExportMenuOpen(false);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <BarChart3 className="text-indigo-600" size={26} />
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">Monitor business performance and key metrics across the platform</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
              />
              Auto-refresh
            </label>
            <button
              onClick={handleRefreshAll}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg">
                  <button onClick={handleExportJSON} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Full snapshot (JSON)
                  </button>
                  <button onClick={() => handleExportCSV('sales')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Sales trend (CSV)
                  </button>
                  <button onClick={() => handleExportCSV('riders')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Rider leaderboard (CSV)
                  </button>
                  <button onClick={() => handleExportCSV('vendors')} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                    Vendor leaderboard (CSV)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time range */}
        <TimeRangeSelector
          selected={timeRange}
          onChange={setTimeRange}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={(s, e) => {
            setCustomStart(s);
            setCustomEnd(e);
          }}
        />

        {overviewError && <ErrorBanner message={overviewError} onRetry={fetchCoreData} />}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-slate-100/70 p-1.5">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart3} label="Overview" />
          <TabButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={Wallet} label="Sales & Revenue" />
          <TabButton active={activeTab === 'riders'} onClick={() => setActiveTab('riders')} icon={Truck} label="Riders" />
          <TabButton active={activeTab === 'vendors'} onClick={() => setActiveTab('vendors')} icon={Store} label="Vendors" />
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={FileBarChart} label="Custom Reports" />
        </div>

        {/* Overview Stats — shown above every tab except Reports */}
        {activeTab !== 'reports' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              title="Total Users"
              value={overviewStats.totalUsers}
              change={usersTrend}
              icon={Users}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
              sparklineData={userGrowthData.map((d) => d.totalUsers)}
              loading={loading}
            />
            <MetricCard
              title="Total Orders"
              value={overviewStats.totalOrders}
              change={ordersTrend}
              icon={ShoppingCart}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              sparklineData={salesData.map((d) => d.totalOrders)}
              loading={loading}
            />
            <MetricCard
              title="Total Revenue"
              value={overviewStats.totalRevenue}
              change={revenueTrend}
              icon={DollarSign}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              sparklineData={revenueData.map((d) => d.totalRevenue)}
              loading={loading}
            />
            <MetricCard title="Active Riders" value={overviewStats.totalRiders} icon={Truck} iconColor="text-violet-600" iconBg="bg-violet-50" loading={loading} />
            <MetricCard
              title="Success Rate"
              value={calculatedMetrics.successRate}
              icon={CheckCircle}
              iconColor="text-cyan-600"
              iconBg="bg-cyan-50"
              loading={loading}
            />
          </div>
        )}

        {/* ---------------- OVERVIEW TAB ---------------- */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ChartCard
                  title="Performance Trends"
                  subtitle={compareEnabled ? 'Dashed line shows the equivalent prior period' : undefined}
                  loading={loading}
                  actions={
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={compareEnabled}
                        onChange={(e) => setCompareEnabled(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      Compare to prior period
                    </label>
                  }
                >
                  <div className="mb-4 flex gap-2">
                    {(['sales', 'users', 'revenue'] as ActiveChart[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setActiveChart(c)}
                        className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                          activeChart === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {c === 'sales' ? 'Sales' : c === 'users' ? 'User Growth' : 'Revenue'}
                      </button>
                    ))}
                  </div>
                  {chartData.length === 0 && !loading ? (
                    <EmptyState icon={BarChart3} title="No data for this period" hint="Try a wider date range" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      {activeChart === 'sales' ? (
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value: number, name: string) => [name === 'value' ? formatCurrency(value) : value, name === 'value' ? 'Sales' : name === 'orders' ? 'Orders' : 'Prior period']} />
                          <Legend />
                          <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Sales" />
                          <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} name="Orders" dot={false} />
                          {compareEnabled && <Line type="monotone" dataKey="compareValue" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 4" name="Prior period" dot={false} />}
                        </AreaChart>
                      ) : (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [activeChart === 'revenue' ? formatCurrency(value) : value, activeChart === 'users' ? 'New Users' : 'Revenue']} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3 }} name={activeChart === 'users' ? 'New Users' : 'Revenue'} />
                          {compareEnabled && <Line type="monotone" dataKey="compareValue" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 4" name="Prior period" dot={false} />}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              <div>
                <ChartCard title="Order Status Breakdown" loading={loading}>
                  {orderStatusPieData.length === 0 && !loading ? (
                    <EmptyState icon={PieChartIcon} title="No orders in this period" />
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie data={orderStatusPieData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                          {orderStatusPieData.map((entry, index) => (
                            <Cell key={`status-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="p-5">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">Delivery Performance (Top 5)</h3>
                  {deliveryPieData.length === 0 && !loading ? (
                    <EmptyState icon={Truck} title="No delivery performance data available" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={deliveryPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}>
                          {deliveryPieData.map((entry, index) => (
                            <Cell key={`delivery-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="p-5">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">Key Insights</h3>
                  <div className="space-y-3">
                    {calculatedMetrics.successRate > 90 && (
                      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3">
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900">Excellent Performance</p>
                          <p className="text-xs text-emerald-700">Success rate is {calculatedMetrics.successRate.toFixed(1)}%, above target</p>
                        </div>
                      </div>
                    )}
                    {calculatedMetrics.revenueGrowth > 0 && (
                      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-3">
                        <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                        <div>
                          <p className="text-sm font-medium text-indigo-900">Revenue Growth</p>
                          <p className="text-xs text-indigo-700">Revenue increased by {calculatedMetrics.revenueGrowth.toFixed(1)}% this period</p>
                        </div>
                      </div>
                    )}
                    {calculatedMetrics.successRate < 85 && calculatedMetrics.successRate > 0 && (
                      <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-orange-900">Performance Alert</p>
                          <p className="text-xs text-orange-700">Success rate is {calculatedMetrics.successRate.toFixed(1)}%, below 85% target</p>
                        </div>
                      </div>
                    )}
                    {calculatedMetrics.averageOrderValue > 0 && (
                      <div className="flex items-start gap-3 rounded-xl bg-violet-50 p-3">
                        <Eye className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-500" />
                        <div>
                          <p className="text-sm font-medium text-violet-900">Order Value Insight</p>
                          <p className="text-xs text-violet-700">Average order value is {formatCurrency(calculatedMetrics.averageOrderValue)}</p>
                        </div>
                      </div>
                    )}
                    {topVendor && (
                      <div className="flex items-start gap-3 rounded-xl bg-cyan-50 p-3">
                        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-500" />
                        <div>
                          <p className="text-sm font-medium text-cyan-900">Top Vendor</p>
                          <p className="text-xs text-cyan-700">
                            {topVendor.business_name} leads with {formatCurrency(num(topVendor.total_revenue))} in revenue
                          </p>
                        </div>
                      </div>
                    )}
                    {overviewStats.totalOrders === 0 && !loading && <EmptyState icon={AlertCircle} title="No analytics data found for the selected time period" />}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------- SALES & REVENUE TAB ---------------- */}
        {activeTab === 'sales' && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Revenue Composition" subtitle="Gross revenue, delivery fees collected, and discounts given" loading={loading}>
                {revenueCompositionData.length === 0 && !loading ? (
                  <EmptyState icon={Wallet} title="No revenue recorded in this period" />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={revenueCompositionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(Math.abs(value))} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Delivery Fees" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Discounts" fill="#F87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard
                title="Platform Commission"
                subtitle={commissionIsEstimated ? 'Estimated from the commission rate — no commission transactions logged yet' : 'Actual commission transactions'}
                loading={loading}
              >
                {commissionChartData.length === 0 && !loading ? (
                  <EmptyState icon={DollarSign} title="No commission data available" />
                ) : (
                  <>
                    {commissionIsEstimated && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Estimated figures
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={commissionIsEstimated ? 268 : 320}>
                      <AreaChart data={commissionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.25} name="Commission" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                )}
              </ChartCard>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Order Status Detail</h3>
                <button
                  onClick={() => handleExportCSV('sales')}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export sales CSV
                </button>
              </div>
              {orderStatusData.length === 0 && !loading ? (
                <EmptyState icon={ShoppingCart} title="No orders in this period" />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {orderStatusData.map((s) => (
                    <div key={s.status} className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{titleCase(s.status)}</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{s.count.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------- RIDERS TAB ---------------- */}
        {activeTab === 'riders' && (
          <div className="space-y-4">
            {riderError && <ErrorBanner message={riderError} onRetry={fetchRiderRows} />}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Rider Leaderboard</h3>
                  <div className="flex items-center gap-2">
                    <SearchInput value={riderSearch} onChange={setRiderSearch} placeholder="Search riders..." />
                    <button
                      onClick={() => handleExportCSV('riders')}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
                </div>

                {!riderLoaded && !riderError ? (
                  <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
                ) : filteredSortedRiders.length === 0 ? (
                  <EmptyState icon={Truck} title="No riders found" hint={riderSearch ? 'Try a different search term' : undefined} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <SortHeader label="Rider" sortKey="rider_name" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Vehicle" sortKey="vehicle_type" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Rating" sortKey="rating" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Deliveries" sortKey="total_deliveries" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Today" sortKey="deliveries_today" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Avg Time" sortKey="avg_delivery_time" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <SortHeader label="Earnings Today" sortKey="earnings_today" active={riderSort.key} dir={riderSort.dir} onClick={toggleRiderSort} />
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSortedRiders.map((rider) => (
                          <tr key={rider.rider_id} className="transition-colors hover:bg-gray-50">
                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                              <span className="flex items-center gap-1.5">
                                {rider.rider_name}
                                {bool(rider.is_verified) && <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm capitalize text-gray-500">{rider.vehicle_type ?? '—'}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {num(rider.rating).toFixed(1)}
                                <span className="text-gray-400">({num(rider.total_reviews)})</span>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(rider.total_deliveries).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(rider.deliveries_today).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(rider.avg_delivery_time).toFixed(0)} min</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{formatCurrency(num(rider.earnings_today))}</td>
                            <td className="px-3 py-2.5">
                              <Badge tone={bool(rider.is_active) ? 'green' : 'gray'}>{bool(rider.is_active) ? rider.current_status ?? 'active' : 'inactive'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VENDORS TAB ---------------- */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            {vendorError && <ErrorBanner message={vendorError} onRetry={fetchVendorRows} />}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Vendor Leaderboard</h3>
                  <div className="flex items-center gap-2">
                    <SearchInput value={vendorSearch} onChange={setVendorSearch} placeholder="Search vendors..." />
                    <button
                      onClick={() => handleExportCSV('vendors')}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
                </div>

                {!vendorLoaded && !vendorError ? (
                  <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
                ) : filteredSortedVendors.length === 0 ? (
                  <EmptyState icon={Store} title="No vendors found" hint={vendorSearch ? 'Try a different search term' : undefined} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <SortHeader label="Vendor" sortKey="business_name" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Rating" sortKey="rating" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Outlets" sortKey="total_outlets" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Completed Orders" sortKey="completed_orders" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Revenue" sortKey="total_revenue" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Avg Order" sortKey="avg_order_value" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <SortHeader label="Today" sortKey="orders_today" active={vendorSort.key} dir={vendorSort.dir} onClick={toggleVendorSort} />
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSortedVendors.map((vendor) => (
                          <tr key={vendor.vendor_id} className="transition-colors hover:bg-gray-50">
                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                              <span className="flex items-center gap-1.5">
                                {vendor.business_name}
                                {bool(vendor.is_verified) && <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />}
                              </span>
                              {vendor.brand && <span className="block text-xs text-gray-400">{vendor.brand}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {num(vendor.rating).toFixed(1)}
                                <span className="text-gray-400">({num(vendor.total_reviews)})</span>
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(vendor.total_outlets)}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(vendor.completed_orders).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{formatCurrency(num(vendor.total_revenue))}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{formatCurrency(num(vendor.avg_order_value))}</td>
                            <td className="px-3 py-2.5 text-sm text-gray-500">{num(vendor.orders_today)}</td>
                            <td className="px-3 py-2.5">
                              {bool(vendor.is_featured) ? <Badge tone="indigo">Featured</Badge> : <Badge tone="gray">Standard</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {topRider && (
              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <Star className="mt-0.5 h-5 w-5 flex-shrink-0 fill-amber-400 text-amber-400" />
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{topRider.rider_name}</span> has the highest rider rating this period at {num(topRider.rating).toFixed(1)}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------- CUSTOM REPORTS TAB ---------------- */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Custom Report Builder</h3>
              <p className="mb-4 text-xs text-gray-400">Group and aggregate platform data on demand, from a safelisted set of tables and fields.</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Data source</label>
                  <select
                    value={reportModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {Object.entries(REPORTABLE_MODELS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Group by</label>
                  <select
                    value={reportGroupBy}
                    onChange={(e) => setReportGroupBy(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {REPORTABLE_MODELS[reportModel].groupable.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Aggregate function</label>
                  <select
                    value={reportAggFn}
                    onChange={(e) => setReportAggFn(e.target.value as (typeof AGGREGATE_FNS)[number])}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {AGGREGATE_FNS.map((fn) => (
                      <option key={fn} value={fn}>
                        {fn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Field</label>
                  <select
                    value={reportAggField}
                    onChange={(e) => setReportAggField(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {REPORTABLE_MODELS[reportModel].fields.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <FileBarChart className="h-4 w-4" />
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </button>

              {reportError && (
                <div className="mt-4">
                  <ErrorBanner message={reportError} onRetry={handleGenerateReport} />
                </div>
              )}
            </div>

            {reportRan && !reportError && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Report Chart">
                  {reportChartData.length === 0 ? (
                    <EmptyState icon={FileBarChart} title="No results for this combination" />
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={reportChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Report Table</h3>
                    {reportResults.length > 0 && (
                      <button
                        onClick={() => downloadFile(arrayToCSV(reportResults), `report-${reportModel}-${toISODate(new Date())}.csv`, 'text/csv')}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                    )}
                  </div>
                  {reportResults.length === 0 ? (
                    <EmptyState icon={FileBarChart} title="No results for this combination" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {Object.keys(reportResults[0]).map((key) => (
                              <th key={key} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                {titleCase(key)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {reportResults.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.keys(row).map((key) => (
                                <td key={key} className="px-3 py-2.5 text-sm text-gray-700">
                                  {String(row[key] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pb-2 text-center text-gray-400">
          <p className="text-xs">
            Showing {toISODate(bounds.start)} → {toISODate(bounds.end)} •{' '}
            {autoRefresh ? 'Auto-refreshing every 60 seconds' : 'Auto-refresh is off'} • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
