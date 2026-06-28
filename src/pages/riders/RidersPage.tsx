// src/pages/riders/RidersPage.tsx
// Production rider management — list, details, analytics, live map, and
// full editing, all wired to real backend endpoints.

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Truck, Search, Filter, Phone, Mail, Eye, BarChart, UserPlus,
  Key, MapPin, Clock, Star, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Settings, Activity, Pencil,
  ShoppingBag, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  listRiders,
  updateRiderStatus,
  approveRider,
  resetRiderPassword,
  getRiderAnalytics,
  getRiderOrders,
} from '../../services/riderService';
import CreateRiderModal from './CreateRiderModal';
import EditRiderModal from './EditRiderModal';
import ResetPasswordResultModal from './ResetPasswordResultModal';
import RidersMap from './RidersMap';
import type { RiderWithAccount } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Rider = RiderWithAccount;

interface Order {
  order_id: number | string;
  order_number?: string;
  order_status: string;
  total_amount?: number | string;
  delivery_fee?: number | string;
  delivery_address?: string;
  customer_note?: string;
  created_at?: string;
  delivered_at?: string;
  updated_at?: string;
  customer?: { first_name?: string; last_name?: string; phone_number?: string } | null;
  order_items?: { product_name: string; quantity: number; unit_price: number; total_price: number }[];
}

interface AnalyticsSummary {
  totalDeliveries?: number;
  completedDeliveries?: number;
  completionRate?: number | string;
  avgRating?: number | string;
  totalEarnings?: number | string;
  completed_deliveries?: number;
  total_distance_km?: number;
  online_time_minutes?: number;
  total_earnings?: number;
}

type ViewMode = 'list' | 'details' | 'analytics' | 'map';
type DetailTab = 'info' | 'orders';

const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
// FIX: previously read r.auth_account — the backend's nested include alias
// is 'account' (see riderController.js / models/init-models.js), so every
// rider in the list and detail views always showed '—' for email and phone.

const riderName  = (r: Rider) => r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown Rider';
const riderEmail = (r: Rider) => r.email || r.account?.email || '—';
const riderPhone = (r: Rider) => r.phone || r.phone_number || r.account?.phone_number || '—';

const fmt = (d?: string | null) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
};
const fmtTime = (d?: string | null) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const ksh = (v?: number | string | null) => `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function riderStatusBadge(s: string) {
  const m: Record<string, string> = {
    available:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    busy:        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    on_delivery: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    on_break:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pending:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    suspended:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    offline:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return m[s?.toLowerCase()] ?? m.offline;
}

function orderStatusBadge(s: string) {
  const m: Record<string, string> = {
    pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    confirmed:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    preparing:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    ready:      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    dispatched: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    delivered:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return m[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
}

const statusLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const vehicleEmoji = (t: string) => ({ motorcycle: '🏍️', bicycle: '🚲', tuk_tuk: '🛺', van: '🚐', pickup: '🚚' }[t] ?? '🚗');

// ─── Component ────────────────────────────────────────────────────────────────

export default function RidersPage() {
  // List state
  const [riders, setRiders]           = useState<Rider[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Navigation
  const [viewMode, setViewMode]       = useState<ViewMode>('list');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [detailTab, setDetailTab]     = useState<DetailTab>('info');

  // Analytics
  const [analytics, setAnalytics]     = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Orders
  const [orders, setOrders]           = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage]   = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderFilter, setOrderFilter] = useState('all');
  const ORDERS_PER_PAGE = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [resetResult, setResetResult] = useState<{ rider: Rider; password: string } | null>(null);

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchRiders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listRiders();
      setRiders(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const loadAnalytics = async (riderId: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    try {
      const res = await getRiderAnalytics(riderId);
      const d = res.data;
      setAnalytics(Array.isArray(d) ? (d[0] ?? null) : (d ?? null));
    } catch { /* supplemental — quietly absent on failure */ }
    finally { setAnalyticsLoading(false); }
  };

  const loadOrders = useCallback(async (riderId: string, page: number, statusFilter: string) => {
    setOrdersLoading(true);
    try {
      const res = await getRiderOrders(riderId, {
        page, limit: ORDERS_PER_PAGE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setOrders(res.data || []);
      setOrdersTotal(res.total ?? (res.data || []).length);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Re-fetch orders when page or filter changes (while detail view is open)
  useEffect(() => {
    if (selectedRider && detailTab === 'orders') {
      loadOrders(selectedRider.rider_id, ordersPage, orderFilter);
    }
  }, [selectedRider, detailTab, ordersPage, orderFilter, loadOrders]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); }
    catch (err: any) { toast.error(err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleToggleStatus = (rider: Rider) =>
    withAction(async () => {
      const next = rider.current_status === 'available' ? 'offline' : 'available';
      await updateRiderStatus(rider.rider_id, { status: next as any });
      toast.success(`${riderName(rider)} is now ${next}`);
      await fetchRiders();
      if (selectedRider?.rider_id === rider.rider_id) {
        setSelectedRider(prev => prev ? { ...prev, current_status: next as Rider['current_status'] } : prev);
      }
    });

  const handleApprove = (riderId: string) =>
    withAction(async () => {
      await approveRider(riderId);
      toast.success('Rider verified');
      await fetchRiders();
    });

  const handleResetPassword = (rider: Rider) =>
    withAction(async () => {
      const res = await resetRiderPassword(rider.rider_id);
      const password = res.data?.temporary_password || res.temporary_password;
      if (password) {
        setResetResult({ rider, password });
      } else {
        toast.success('Password reset successfully');
      }
    });

  const handleViewDetails = (rider: Rider) => {
    setSelectedRider(rider);
    setDetailTab('info');
    setOrdersPage(1);
    setOrderFilter('all');
    setViewMode('details');
    loadAnalytics(rider.rider_id);
  };

  const handleViewRiderById = (riderId: string) => {
    const rider = riders.find(r => r.rider_id === riderId);
    if (rider) handleViewDetails(rider);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = riders.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      riderName(r).toLowerCase().includes(q) ||
      riderPhone(r).includes(searchTerm) ||
      riderEmail(r).toLowerCase().includes(q) ||
      (r.national_id || '').includes(searchTerm) ||
      (r.vehicle_registration || '').toLowerCase().includes(q);
    if (!matchSearch) return false;
    switch (filterStatus) {
      case 'available': return r.current_status === 'available';
      case 'busy':      return r.current_status === 'busy' || r.current_status === 'on_delivery';
      case 'offline':   return r.current_status === 'offline';
      case 'verified':  return r.is_verified;
      case 'pending':   return !r.is_verified;
      default:          return true;
    }
  });

  const isBusy = (r: Rider) => r.current_status === 'busy' || r.current_status === 'on_delivery';

  const orderCounts = ORDER_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'all' ? ordersTotal : orders.filter(o => o.order_status === s).length;
    return acc;
  }, {});

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  const ListView = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email, national ID or plate…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All riders</option>
            <option value="available">Available</option>
            <option value="busy">Busy / On delivery</option>
            <option value="offline">Offline</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending verification</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left">Rider</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-left">Vehicle</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Performance</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(rider => (
                <tr key={rider.rider_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {riderName(rider)[0]?.toUpperCase() ?? 'R'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white leading-tight">{riderName(rider)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">#{rider.rider_id}</p>
                        {rider.national_id && <p className="text-xs text-gray-400">ID: {rider.national_id}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{riderPhone(rider)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[180px]">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />{riderEmail(rider)}
                      </p>
                      <p className="text-xs text-gray-400">Joined {fmt(rider.created_at)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {vehicleEmoji(rider.vehicle_type)} {rider.vehicle_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      {rider.vehicle_registration && <p className="text-xs text-gray-500 font-mono">{rider.vehicle_registration}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${riderStatusBadge(rider.current_status || 'offline')}`}>
                        {statusLabel(rider.current_status || 'offline')}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${rider.is_verified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {rider.is_verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{rider.rating ? Number(rider.rating).toFixed(1) : '—'}</span>
                      </p>
                      <p className="text-xs text-gray-500">{rider.total_deliveries ?? 0} deliveries</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => handleViewDetails(rider)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors">
                        <Eye className="w-3 h-3 inline mr-0.5" />View
                      </button>
                      <button onClick={() => setEditingRider(rider)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors">
                        <Pencil className="w-3 h-3 inline mr-0.5" />Edit
                      </button>
                      {!rider.is_verified && (
                        <button onClick={() => handleApprove(rider.rider_id)} disabled={actionLoading} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50">
                          <CheckCircle className="w-3 h-3 inline mr-0.5" />Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(rider)}
                        disabled={actionLoading || isBusy(rider)}
                        title={isBusy(rider) ? 'Rider is on a delivery' : undefined}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${rider.current_status === 'available' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                      >
                        {rider.current_status === 'available' ? 'Set Offline' : 'Set Online'}
                      </button>
                      <button onClick={() => handleResetPassword(rider)} disabled={actionLoading} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50">
                        <Key className="w-3 h-3 inline mr-0.5" />Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div className="py-16 text-center">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No riders found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || filterStatus !== 'all' ? 'Try adjusting your search or filter.' : 'No riders registered yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────

  const DetailView = () => {
    if (!selectedRider) return null;
    const r = selectedRider;

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => { setViewMode('list'); setSelectedRider(null); }}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />Back to list
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {riderName(r)[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{riderName(r)}</h2>
              <p className="text-xs text-gray-400">Rider #{r.rider_id}</p>
            </div>
            <span className={`ml-2 px-2.5 py-1 text-xs font-semibold rounded-full ${riderStatusBadge(r.current_status || 'offline')}`}>
              {statusLabel(r.current_status || 'offline')}
            </span>
            <button
              onClick={() => setEditingRider(r)}
              className="ml-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />Edit
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {([
            { key: 'info',   label: 'Profile & Actions', icon: <Settings className="w-4 h-4" /> },
            { key: 'orders', label: 'Orders',             icon: <ShoppingBag className="w-4 h-4" /> },
          ] as { key: DetailTab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setDetailTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                detailTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}{tab.label}
              {tab.key === 'orders' && ordersTotal > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                  {ordersTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        {detailTab === 'info' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4 text-gray-400" />Basic Information
                </h3>
                <dl className="space-y-2.5 text-sm">
                  {([
                    ['Name',           riderName(r)],
                    ['Email',          riderEmail(r)],
                    ['Phone',          riderPhone(r)],
                    ['National ID',    r.national_id        || '—'],
                    ['Vehicle type',   r.vehicle_type.replace(/_/g, ' ')],
                    ['Registration',   r.vehicle_registration  || '—'],
                    ['License no.',    r.driving_license_no    || '—'],
                    ['License expiry', fmt(r.license_expiry_date)],
                    ['Member since',   fmt(r.created_at)],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-gray-500 shrink-0">{k}</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium text-right truncate max-w-[200px]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-gray-400" />Performance
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Rating',       value: r.rating ? Number(r.rating).toFixed(1) : '—',                                       cls: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 text-blue-700 dark:text-blue-300' },
                    { label: 'Deliveries',   value: String(r.total_deliveries ?? 0),                                                     cls: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 text-green-700 dark:text-green-300' },
                    { label: 'Max distance', value: `${(r as any).max_delivery_distance_km ?? 0} km`,                                    cls: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 text-purple-700 dark:text-purple-300' },
                    { label: 'Commission',   value: (r as any).commission_rate ? `${(Number((r as any).commission_rate) * 100).toFixed(1)}%` : '—', cls: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 text-orange-700 dark:text-orange-300' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`bg-gradient-to-br ${cls} rounded-xl p-4`}>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs opacity-75 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {analyticsLoading && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />Loading analytics…
                  </div>
                )}
                {analytics && !analyticsLoading && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Total orders',   analytics.totalDeliveries    ?? analytics.completed_deliveries ?? '—'],
                      ['Completed',      analytics.completedDeliveries ?? analytics.completed_deliveries ?? '—'],
                      ['Completion',     analytics.completionRate ? `${analytics.completionRate}%` : '—'],
                      ['Avg rating',     analytics.avgRating ? Number(analytics.avgRating).toFixed(1) : '—'],
                    ].map(([l, v]) => (
                      <div key={l as string}>
                        <p className="text-xs text-gray-400">{l}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-gray-400" />Emergency Contact
                </h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{r.emergency_contact_name || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium text-gray-900 dark:text-gray-100">{r.emergency_contact_phone || '—'}</dd></div>
                </dl>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-gray-400" />Status & Actions
                </h3>
                <div className="space-y-3 mb-5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${riderStatusBadge(r.current_status || 'offline')}`}>{statusLabel(r.current_status || 'offline')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Verification</span>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${r.is_verified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {r.is_verified ? '✓ Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!r.is_verified && (
                    <button onClick={() => handleApprove(r.rider_id)} disabled={actionLoading} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                      <CheckCircle className="w-4 h-4 inline mr-1" />Verify Rider
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleStatus(r)}
                    disabled={actionLoading || isBusy(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${r.current_status === 'available' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  >
                    {r.current_status === 'available' ? 'Set Offline' : 'Set Online'}
                  </button>
                  <button onClick={() => handleResetPassword(r)} disabled={actionLoading} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Key className="w-4 h-4 inline mr-1" />Reset Password
                  </button>
                  <button
                    onClick={() => setDetailTab('orders')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 inline mr-1" />View Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => { setOrderFilter(s); setOrdersPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    orderFilter === s
                      ? s === 'all' ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : orderStatusBadge(s) + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {statusLabel(s === 'all' ? 'All orders' : s)}
                  {s === 'all' && ordersTotal > 0 && ` (${ordersTotal})`}
                </button>
              ))}
              <button
                onClick={() => loadOrders(r.rider_id, ordersPage, orderFilter)}
                disabled={ordersLoading}
                className="ml-auto px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${ordersLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  Loading orders…
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No orders found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {orderFilter !== 'all' ? `No ${orderFilter} orders for this rider.` : 'This rider has no orders yet.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-5 py-3 text-left">Order</th>
                        <th className="px-5 py-3 text-left">Status</th>
                        <th className="px-5 py-3 text-left">Customer</th>
                        <th className="px-5 py-3 text-left">Delivery Address</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {orders.map(order => (
                        <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-mono font-medium text-gray-900 dark:text-white text-xs">
                              #{order.order_number || order.order_id}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${orderStatusBadge(order.order_status)}`}>
                              {statusLabel(order.order_status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {order.customer ? (
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {[order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ') || 'Customer'}
                                </p>
                                {order.customer.phone_number && (
                                  <p className="text-xs text-gray-500">{order.customer.phone_number}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-gray-600 dark:text-gray-300 text-xs max-w-[200px] truncate" title={order.delivery_address || ''}>
                              {order.delivery_address || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {ksh(Number(order.total_amount || 0) + Number(order.delivery_fee || 0))}
                            </p>
                            {Number(order.delivery_fee) > 0 && (
                              <p className="text-xs text-gray-400">Fee: {ksh(order.delivery_fee)}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                              {order.order_status === 'delivered' ? fmtTime(order.delivered_at || order.updated_at) : fmtTime(order.created_at)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!ordersLoading && ordersTotal > ORDERS_PER_PAGE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                  <span>
                    Page {ordersPage} of {Math.ceil(ordersTotal / ORDERS_PER_PAGE)} &mdash; {ordersTotal} total orders
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                      disabled={ordersPage <= 1}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOrdersPage(p => p + 1)}
                      disabled={ordersPage >= Math.ceil(ordersTotal / ORDERS_PER_PAGE)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── ANALYTICS VIEW ────────────────────────────────────────────────────────

  const AnalyticsView = () => {
    const stats = [
      { label: 'Total Riders',  value: riders.length,                                                         color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: <Truck className="w-5 h-5 text-blue-400" /> },
      { label: 'Available',     value: riders.filter(r => r.current_status === 'available').length,           color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle className="w-5 h-5 text-green-400" /> },
      { label: 'On Delivery',   value: riders.filter(r => isBusy(r)).length,                                  color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20', icon: <Clock className="w-5 h-5 text-amber-400" /> },
      { label: 'Verified',      value: riders.filter(r => r.is_verified).length,                              color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: <Star className="w-5 h-5 text-purple-400" /> },
    ];
    const top5 = [...riders].sort((a, b) => (Number(b.rating) * (b.total_deliveries || 0)) - (Number(a.rating) * (a.total_deliveries || 0))).slice(0, 5);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Overview</h2>
          <button onClick={() => setViewMode('list')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back to list</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, color, bg, icon }) => (
            <div key={label} className={`${bg} rounded-xl p-5 flex items-center justify-between`}>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              {icon}
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Top Performers</h3>
          <div className="space-y-3">
            {top5.map((r, i) => (
              <div key={r.rider_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{riderName(r)}</p>
                    <p className="text-xs text-gray-500">{r.total_deliveries ?? 0} deliveries</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /><span className="text-sm font-medium">{r.rating ? Number(r.rating).toFixed(1) : '—'}</span></div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${riderStatusBadge(r.current_status || 'offline')}`}>{statusLabel(r.current_status || 'offline')}</span>
                  <button onClick={() => handleViewDetails(r)} className="text-xs text-blue-600 hover:underline">View</button>
                </div>
              </div>
            ))}
            {top5.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No rider data yet.</p>}
          </div>
        </div>
      </div>
    );
  };

  // ── MAP VIEW ──────────────────────────────────────────────────────────────

  const MapView = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rider Locations</h2>
        <button onClick={() => setViewMode('list')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back to list</button>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <RidersMap onViewRider={handleViewRiderById} />
      </div>
    </div>
  );

  // ── ROOT RENDER ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading riders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-500" />Riders Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} of {riders.length} riders
          </p>
        </div>
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            {([['list','list'],['analytics','analytics'],['map','map']] as [ViewMode,string][]).map(([m,l]) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${viewMode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {m === 'list' ? <><Truck className="w-4 h-4 inline mr-1" />Riders</> : m === 'analytics' ? <><BarChart className="w-4 h-4 inline mr-1" />Analytics</> : <><MapPin className="w-4 h-4 inline mr-1" />Map</>}
              </button>
            ))}
            <button onClick={() => setShowCreateModal(true)} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <UserPlus className="w-4 h-4 inline mr-1" />Add Rider
            </button>
          </div>
        )}
      </div>

      {viewMode === 'list'      && <ListView />}
      {viewMode === 'details'   && <DetailView />}
      {viewMode === 'analytics' && <AnalyticsView />}
      {viewMode === 'map'       && <MapView />}

      <CreateRiderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRiderCreated={() => { setShowCreateModal(false); fetchRiders(); }}
      />
      <EditRiderModal
        isOpen={!!editingRider}
        rider={editingRider}
        onClose={() => setEditingRider(null)}
        onSaved={() => {
          fetchRiders();
          if (selectedRider && editingRider && selectedRider.rider_id === editingRider.rider_id) {
            setSelectedRider({ ...selectedRider, ...editingRider });
          }
        }}
      />
      <ResetPasswordResultModal
        isOpen={!!resetResult}
        riderName={resetResult ? riderName(resetResult.rider) : ''}
        temporaryPassword={resetResult?.password || null}
        onClose={() => setResetResult(null)}
      />
    </div>
  );
}
