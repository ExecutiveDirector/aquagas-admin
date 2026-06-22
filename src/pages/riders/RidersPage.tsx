// src/pages/riders/RidersPage.tsx
// Production-ready – single source of truth for all rider admin views.
// Fixes: full_name display, email/phone fallbacks, status mapping, import paths.

import React, { useEffect, useState, useCallback } from 'react';
import {
  Truck, Search, Filter, Phone, Eye, BarChart, UserPlus,
  Key, MapPin, Clock, Star, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Settings, Navigation, Activity,
} from 'lucide-react';
import {
  listRiders,
  updateRiderStatus,
  approveRider,
  resetRiderPassword,
  createRider,
  getRiderAnalytics,
} from '../../services/adminService';  // ← single service file; adjust if yours differs

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthAccount {
  email: string;
  phone_number: string;
  is_active: boolean;
  last_login_at?: string | null;
}

interface Rider {
  rider_id: string;
  account_id?: string;
  first_name?: string;
  last_name?: string;
  // Normalised by backend (or computed below as fallback)
  full_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  // Vehicle
  vehicle_type: string;
  vehicle_registration?: string | null;
  driving_license_no?: string | null;
  license_expiry_date?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  // Performance
  rating: number;
  total_reviews?: number;
  total_deliveries: number;
  max_delivery_distance_km?: number;
  vehicle_capacity_kg?: number;
  commission_rate?: number;
  // State
  current_status: 'offline' | 'available' | 'busy' | 'on_delivery' | 'on_break' | 'pending' | 'suspended';
  is_verified: boolean;
  is_active: boolean;
  last_location_update?: string | null;
  created_at?: string;
  // Nested join (still present from backend for extra fallbacks)
  auth_account?: AuthAccount;
}

interface RiderAnalyticsItem {
  analytics_id?: string;
  rider_id?: string;
  report_date?: string;
  completed_deliveries?: number;
  total_distance_km?: number;
  total_delivery_time_minutes?: number;
  online_time_minutes?: number;
  total_earnings?: number;
  delivery_fees?: number;
  tips_received?: number;
  // Admin summary shape (from getRiderAnalyticsAdmin)
  totalDeliveries?: number;
  completedDeliveries?: number;
  completionRate?: number;
  avgRating?: number;
  totalEarnings?: number;
}

interface NewRiderForm {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_registration: string;
  driving_license_no: string;
  license_expiry_date: string;
  national_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

type ViewMode = 'list' | 'details' | 'analytics' | 'map';

const BLANK_FORM: NewRiderForm = {
  full_name: '', email: '', phone: '', vehicle_type: 'motorcycle',
  vehicle_registration: '', driving_license_no: '', license_expiry_date: '',
  national_id: '', emergency_contact_name: '', emergency_contact_phone: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Guarantees a display name even if backend didn't compute full_name */
function riderName(r: Rider): string {
  if (r.full_name?.trim()) return r.full_name.trim();
  const parts = [r.first_name, r.last_name].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unknown Rider';
}

function riderEmail(r: Rider): string {
  return r.email || r.auth_account?.email || '—';
}

function riderPhone(r: Rider): string {
  return r.phone || r.phone_number || r.auth_account?.phone_number || '—';
}

function formatDate(d?: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(status: string): string {
  switch (status?.toLowerCase()) {
    case 'available':   return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'busy':
    case 'on_delivery': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'on_break':    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'pending':     return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'suspended':   return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:            return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
}

function statusLabel(status: string): string {
  return (status || 'offline').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function vehicleEmoji(type: string): string {
  return ({ motorcycle: '🏍️', bicycle: '🚲', tuk_tuk: '🛺', van: '🚐', pickup: '🚚' }[type] ?? '🚗');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RidersPage() {
  const [riders, setRiders]               = useState<Rider[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [viewMode, setViewMode]           = useState<ViewMode>('list');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [riderAnalytics, setRiderAnalytics] = useState<RiderAnalyticsItem | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm]                   = useState<NewRiderForm>(BLANK_FORM);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchRiders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listRiders();
      setRiders(res.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const loadAnalytics = async (riderId: string) => {
    setAnalyticsLoading(true);
    setRiderAnalytics(null);
    try {
      const res = await getRiderAnalytics(riderId);
      // Accept either array (legacy) or summary object (new admin endpoint)
      setRiderAnalytics(Array.isArray(res.data) ? res.data[0] ?? null : res.data ?? null);
    } catch { /* analytics are supplemental; silently ignore */ }
    finally { setAnalyticsLoading(false); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try { await fn(); } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleToggleStatus = (rider: Rider) =>
    withAction(async () => {
      const next = rider.current_status === 'available' ? 'offline' : 'available';
      await updateRiderStatus(rider.rider_id, { status: next });
      await fetchRiders();
      // Refresh detail view if open
      if (selectedRider?.rider_id === rider.rider_id) {
        setSelectedRider(prev => prev ? { ...prev, current_status: next as Rider['current_status'] } : prev);
      }
    });

  const handleApprove = (riderId: string) =>
    withAction(async () => {
      await approveRider(riderId);
      await fetchRiders();
    });

  const handleResetPassword = (rider: Rider) => {
    const email = riderEmail(rider);
    if (!window.confirm(`Reset password for ${email}?`)) return;
    withAction(async () => {
      await resetRiderPassword(rider.rider_id);
      alert('Password reset — temporary password sent to rider.');
    });
  };

  const handleViewDetails = (rider: Rider) => {
    setSelectedRider(rider);
    setViewMode('details');
    loadAnalytics(rider.rider_id);
  };

  const handleCreateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);
    try {
      await createRider(form);
      setShowCreateModal(false);
      setForm(BLANK_FORM);
      await fetchRiders();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create rider');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

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
      case 'available':  return r.current_status === 'available';
      case 'busy':       return r.current_status === 'busy' || r.current_status === 'on_delivery';
      case 'offline':    return r.current_status === 'offline';
      case 'verified':   return r.is_verified;
      case 'pending':    return !r.is_verified;
      default:           return true;
    }
  });

  const isBusy = (r: Rider) => r.current_status === 'busy' || r.current_status === 'on_delivery';

  // ── Sub-renders ────────────────────────────────────────────────────────────

  const NavTabs = () => (
    <div className="flex flex-wrap gap-2">
      {(['list', 'analytics', 'map'] as ViewMode[]).map(m => (
        <button
          key={m}
          onClick={() => setViewMode(m)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
            viewMode === m
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {m === 'list' ? <Truck className="w-4 h-4 inline mr-1" /> : m === 'analytics' ? <BarChart className="w-4 h-4 inline mr-1" /> : <MapPin className="w-4 h-4 inline mr-1" />}
          {m === 'list' ? 'Riders' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
      <button
        onClick={() => setShowCreateModal(true)}
        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        <UserPlus className="w-4 h-4 inline mr-1" />
        Add Rider
      </button>
    </div>
  );

  const ErrorBanner = () => error ? (
    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="flex-1">{error}</span>
      <button onClick={() => setError(null)}><XCircle className="w-5 h-5" /></button>
    </div>
  ) : null;

  // ── List view ──────────────────────────────────────────────────────────────

  const ListView = () => (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email, national ID, or plate…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
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

      {/* Table */}
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
                  {/* Rider identity */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {riderName(rider)[0]?.toUpperCase() ?? 'R'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white leading-tight">
                          {riderName(rider)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">#{rider.rider_id}</p>
                        {rider.national_id && (
                          <p className="text-xs text-gray-400">ID: {rider.national_id}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {riderPhone(rider)}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[160px]">{riderEmail(rider)}</p>
                      <p className="text-xs text-gray-400">Joined {formatDate(rider.created_at)}</p>
                    </div>
                  </td>

                  {/* Vehicle */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {vehicleEmoji(rider.vehicle_type)}{' '}
                        {rider.vehicle_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      {rider.vehicle_registration && (
                        <p className="text-xs text-gray-500 font-mono">{rider.vehicle_registration}</p>
                      )}
                      {rider.driving_license_no && (
                        <p className="text-xs text-gray-400">Lic: {rider.driving_license_no}</p>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge(rider.current_status)}`}>
                        {statusLabel(rider.current_status)}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        rider.is_verified
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {rider.is_verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </td>

                  {/* Performance */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rider.rating ? Number(rider.rating).toFixed(1) : '—'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">{rider.total_deliveries ?? 0} deliveries</p>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleViewDetails(rider)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3 inline mr-0.5" />View
                      </button>

                      {!rider.is_verified && (
                        <button
                          onClick={() => handleApprove(rider.rider_id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-0.5" />Verify
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleStatus(rider)}
                        disabled={actionLoading || isBusy(rider)}
                        title={isBusy(rider) ? 'Rider is currently on a delivery' : undefined}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                          rider.current_status === 'available'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {rider.current_status === 'available' ? 'Set Offline' : 'Set Online'}
                      </button>

                      <button
                        onClick={() => handleResetPassword(rider)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
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

  // ── Detail view ────────────────────────────────────────────────────────────

  const DetailView = () => {
    if (!selectedRider) return null;
    const r = selectedRider;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setViewMode('list'); setSelectedRider(null); }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            ← Back to list
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{riderName(r)}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Basic info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Basic Information
            </h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Name',               riderName(r)],
                ['Email',              riderEmail(r)],
                ['Phone',              riderPhone(r)],
                ['National ID',        r.national_id        || '—'],
                ['Vehicle type',       r.vehicle_type.replace(/_/g, ' ')],
                ['Registration',       r.vehicle_registration  || '—'],
                ['License no.',        r.driving_license_no    || '—'],
                ['License expiry',     formatDate(r.license_expiry_date)],
                ['Member since',       formatDate(r.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-gray-500 shrink-0">{k}</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Performance */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Performance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Rating',       value: r.rating ? Number(r.rating).toFixed(1) : '—', color: 'blue' },
                { label: 'Deliveries',   value: r.total_deliveries ?? 0,                       color: 'green' },
                { label: 'Max distance', value: `${r.max_delivery_distance_km ?? 0} km`,       color: 'purple' },
                { label: 'Commission',   value: r.commission_rate ? `${(Number(r.commission_rate) * 100).toFixed(1)}%` : '—', color: 'orange' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-lg p-4`}>
                  <p className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency contact */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Emergency Contact
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{r.emergency_contact_name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{r.emergency_contact_phone || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Status & actions */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Status & Actions
            </h3>
            <div className="space-y-3 mb-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Current status</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge(r.current_status)}`}>
                  {statusLabel(r.current_status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Verification</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  r.is_verified
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {r.is_verified ? '✓ Verified' : 'Pending'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!r.is_verified && (
                <button
                  onClick={() => handleApprove(r.rider_id)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />Verify Rider
                </button>
              )}
              <button
                onClick={() => handleToggleStatus(r)}
                disabled={actionLoading || isBusy(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  r.current_status === 'available'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {r.current_status === 'available' ? 'Set Offline' : 'Set Online'}
              </button>
              <button
                onClick={() => handleResetPassword(r)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Key className="w-4 h-4 inline mr-1" />Reset Password
              </button>
            </div>
          </div>
        </div>

        {/* Analytics summary */}
        {analyticsLoading && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex items-center gap-3 text-gray-400 text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            Loading analytics…
          </div>
        )}
        {riderAnalytics && !analyticsLoading && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart className="w-4 h-4" /> Delivery Analytics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
              {[
                { label: 'Total',       value: riderAnalytics.totalDeliveries ?? riderAnalytics.completed_deliveries ?? 0 },
                { label: 'Completed',   value: riderAnalytics.completedDeliveries ?? riderAnalytics.completed_deliveries ?? 0 },
                { label: 'Completion',  value: riderAnalytics.completionRate ? `${riderAnalytics.completionRate}%` : '—' },
                { label: 'Avg Rating',  value: riderAnalytics.avgRating ? Number(riderAnalytics.avgRating).toFixed(1) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Analytics dashboard ────────────────────────────────────────────────────

  const AnalyticsView = () => {
    const stats = [
      { label: 'Total Riders',    value: riders.length,                                                          color: 'blue',   icon: <Truck className="w-6 h-6 text-blue-200" /> },
      { label: 'Available',       value: riders.filter(r => r.current_status === 'available').length,            color: 'green',  icon: <CheckCircle className="w-6 h-6 text-green-200" /> },
      { label: 'On Delivery',     value: riders.filter(r => r.current_status === 'on_delivery' || r.current_status === 'busy').length, color: 'amber', icon: <Clock className="w-6 h-6 text-amber-200" /> },
      { label: 'Verified',        value: riders.filter(r => r.is_verified).length,                               color: 'purple', icon: <Star className="w-6 h-6 text-purple-200" /> },
    ];

    const topPerformers = [...riders]
      .sort((a, b) => (Number(b.rating) * (b.total_deliveries || 0)) - (Number(a.rating) * (a.total_deliveries || 0)))
      .slice(0, 5);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics Overview</h2>
          <button onClick={() => setViewMode('list')} className="text-blue-600 hover:text-blue-700 text-sm">← Back to list</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, color, icon }) => (
            <div key={label} className={`bg-gradient-to-br from-${color}-500 to-${color}-600 text-white rounded-xl p-5 flex items-center justify-between`}>
              <div>
                <p className={`text-${color}-100 text-xs uppercase tracking-wide`}>{label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
              {icon}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((r, i) => (
              <div key={r.rider_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{riderName(r)}</p>
                    <p className="text-xs text-gray-500">{r.total_deliveries ?? 0} deliveries</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {r.rating ? Number(r.rating).toFixed(1) : '—'}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${statusBadge(r.current_status)}`}>
                    {statusLabel(r.current_status)}
                  </span>
                </div>
              </div>
            ))}
            {topPerformers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No rider data yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Map view ───────────────────────────────────────────────────────────────

  const MapView = () => {
    const activeRiders = riders.filter(r => r.current_status !== 'offline');
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rider Locations</h2>
          <button onClick={() => setViewMode('list')} className="text-blue-600 hover:text-blue-700 text-sm">← Back to list</button>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="h-72 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/20 rounded-lg gap-3 text-gray-400">
            <MapPin className="w-10 h-10" />
            <p className="text-sm">Real-time map — integrate Leaflet or Google Maps here.</p>
            <p className="text-xs text-gray-300">{activeRiders.length} riders currently active</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Active Riders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRiders.map(r => (
              <div key={r.rider_id} className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{riderName(r)}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge(r.current_status)}`}>
                    {statusLabel(r.current_status)}
                  </span>
                </div>
                <div className="space-y-1 text-gray-500">
                  <p className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Last ping: {formatDate(r.last_location_update)}
                  </p>
                  <p>{vehicleEmoji(r.vehicle_type)} {r.vehicle_type.replace(/_/g, ' ')}</p>
                </div>
              </div>
            ))}
            {activeRiders.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-6">No riders currently active.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Create modal ───────────────────────────────────────────────────────────

  const CreateModal = () => !showCreateModal ? null : (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Rider</h2>
          <button onClick={() => { setShowCreateModal(false); setForm(BLANK_FORM); }} disabled={createLoading}>
            <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateRider} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['full_name',              'Full Name *',           'text',   true],
              ['email',                  'Email *',               'email',  true],
              ['phone',                  'Phone *',               'tel',    true],
              ['vehicle_registration',   'Vehicle Registration',  'text',   false],
              ['driving_license_no',     'Driving License No.',   'text',   false],
              ['license_expiry_date',    'License Expiry',        'date',   false],
              ['national_id',            'National ID',           'text',   false],
              ['emergency_contact_name', 'Emergency Contact Name','text',   false],
              ['emergency_contact_phone','Emergency Contact Phone','tel',   false],
            ] as [keyof NewRiderForm, string, string, boolean][]).map(([key, label, type, required]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  disabled={createLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            ))}

            {/* Vehicle type select */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vehicle Type *</label>
              <select
                value={form.vehicle_type}
                onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                disabled={createLoading}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              >
                {[['motorcycle','Motorcycle'],['bicycle','Bicycle'],['tuk_tuk','Tuk Tuk'],['van','Van'],['pickup','Pickup']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); setForm(BLANK_FORM); }}
              disabled={createLoading}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createLoading && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {createLoading ? 'Creating…' : 'Create Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Root render ────────────────────────────────────────────────────────────

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
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-500" />
            Riders Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {filtered.length} of {riders.length} riders
          </p>
        </div>
        {viewMode === 'list' && <NavTabs />}
        {viewMode !== 'list' && (
          <div className="flex gap-2">
            {viewMode !== 'analytics' && <button onClick={() => setViewMode('analytics')} className="text-sm text-gray-500 hover:text-blue-600"><BarChart className="w-4 h-4 inline mr-1" />Analytics</button>}
            {viewMode !== 'map' && <button onClick={() => setViewMode('map')} className="text-sm text-gray-500 hover:text-blue-600"><MapPin className="w-4 h-4 inline mr-1" />Map</button>}
          </div>
        )}
      </div>

      <ErrorBanner />

      {viewMode === 'list'      && <ListView />}
      {viewMode === 'details'   && <DetailView />}
      {viewMode === 'analytics' && <AnalyticsView />}
      {viewMode === 'map'       && <MapView />}
      <CreateModal />
    </div>
  );
}
