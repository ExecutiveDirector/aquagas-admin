import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, AlertCircle, RefreshCw, Store, CheckCircle2,
  XCircle, ChevronRight, ArrowLeft, BarChart2, Package,
  ShoppingBag, TrendingUp, Users, Eye, Edit2, Power,
  PowerOff, X, Building2, Mail, Phone, Lock, User, Layers,
} from 'lucide-react';
import {
  listVendors,
  createVendor,
  updateVendor,
  getVendorInventory,
  updateVendorInventory,
  getVendorLowStockAlerts,
  toggleVendorStatus,
  approveVendor,
} from '../../services/vendorService';
import type { Vendor } from '../../services/vendorService';
import { getDashboardStats } from '../../services/api';
import { isAuthenticated, isAdmin, logout, getToken } from '../../services/authService';

// ─── types ────────────────────────────────────────────────────────────────────

interface Stats { users: number; vendors: number; riders: number; orders: number; todayRevenue: number; }
interface Product { product_id: string; name: string; stock: number; price: number; vendor_id: string; }

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function statusBadge(active: boolean) {
  return active
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-gray-100 text-gray-500 border border-gray-200';
}

function verifiedBadge(verified: boolean) {
  return verified
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200';
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ?? 'bg-gray-50'}`}>
        <Icon size={18} className="text-gray-700" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

// ─── AddVendorModal ───────────────────────────────────────────────────────────

interface AddVendorModalProps { onClose: () => void; onSubmit: (d: any) => Promise<void>; loading: boolean; }

function AddVendorModal({ onClose, onSubmit, loading }: AddVendorModalProps) {
  const [form, setForm] = useState({
    business_name: '', contact_person: '', business_email: '',
    business_phone: '', password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.business_name.trim()) errs.business_name = 'Required';
    if (!form.contact_person.trim()) errs.contact_person = 'Required';
    if (!form.business_email.trim()) errs.business_email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.business_email)) errs.business_email = 'Invalid email';
    if (!form.business_phone.trim()) errs.business_phone = 'Required';
    if (!form.password.trim()) errs.password = 'Required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const fields = [
    { key: 'business_name', label: 'Business name', icon: Building2, type: 'text', placeholder: 'Acme Gas Ltd' },
    { key: 'contact_person', label: 'Contact person', icon: User, type: 'text', placeholder: 'Jane Mwangi' },
    { key: 'business_email', label: 'Business email', icon: Mail, type: 'email', placeholder: 'info@acme.co.ke' },
    { key: 'business_phone', label: 'Phone number', icon: Phone, type: 'tel', placeholder: '+254712345678' },
    { key: 'password', label: 'Initial password', icon: Lock, type: 'password', placeholder: '••••••••' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add vendor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create a new vendor account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors[key]
                      ? 'border-red-300 focus:ring-red-100'
                      : 'border-gray-200 focus:ring-emerald-100 focus:border-emerald-400'
                  }`}
                  disabled={loading}
                />
              </div>
              {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw size={14} className="animate-spin" /> Creating…</>
              ) : (
                <><Plus size={14} /> Add vendor</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── VendorRow ────────────────────────────────────────────────────────────────

function VendorRow({ vendor, onSelect, onToggle, onApprove }: {
  vendor: Vendor;
  onSelect: () => void;
  onToggle: () => void;
  onApprove: () => void;
}) {
  const initials = vendor.business_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{vendor.business_name}</p>
            {vendor.trading_name && <p className="text-xs text-gray-400 truncate">{vendor.trading_name}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-600">{vendor.contact_person}</td>
      <td className="px-4 py-3.5 text-sm text-gray-500">{vendor.business_email || '—'}</td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(vendor.is_active)}`}>
          {vendor.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {vendor.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${verifiedBadge(vendor.is_verified)}`}>
          {vendor.is_verified ? 'Verified' : 'Pending'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onSelect}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="View details"
          >
            <Eye size={14} />
          </button>
          {!vendor.is_verified && (
            <button
              onClick={onApprove}
              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              title="Approve vendor"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${vendor.is_active
              ? 'text-amber-400 hover:text-amber-700 hover:bg-amber-50'
              : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            title={vendor.is_active ? 'Deactivate' : 'Activate'}
          >
            {vendor.is_active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── VendorDetail ─────────────────────────────────────────────────────────────

function VendorDetail({ vendor, onBack, onUpdate, loading }: {
  vendor: Vendor;
  onBack: () => void;
  onUpdate: (d: any) => Promise<void>;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    business_name: vendor.business_name,
    contact_person: vendor.contact_person,
    business_phone: vendor.business_phone || '',
    business_email: vendor.business_email || '',
    trading_name: vendor.trading_name || '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(form);
    setEditing(false);
  };

  const infoRows = [
    { label: 'Email', value: vendor.business_email, icon: Mail },
    { label: 'Phone', value: vendor.business_phone, icon: Phone },
    { label: 'Brand', value: vendor.brand || 'Independent', icon: Building2 },
    { label: 'Commission', value: `${((vendor.commission_rate ?? 0) * 100).toFixed(1)}%`, icon: TrendingUp },
    { label: 'Min order', value: `KES ${vendor.minimum_order_amount?.toLocaleString() ?? 0}`, icon: ShoppingBag },
    { label: 'Delivery radius', value: `${vendor.delivery_radius_km ?? 0} km`, icon: Layers },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Back
        </button>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-sm font-medium text-gray-900">{vendor.business_name}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-base font-semibold">
              {vendor.business_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{vendor.business_name}</h2>
              {vendor.trading_name && <p className="text-sm text-gray-400">{vendor.trading_name}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(vendor.is_active)}`}>
                  {vendor.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${verifiedBadge(vendor.is_verified)}`}>
                  {vendor.is_verified ? 'Verified' : 'Pending verification'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              editing ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Edit2 size={14} />
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            {[
              ['business_name', 'Business name'],
              ['trading_name', 'Trading name'],
              ['contact_person', 'Contact person'],
              ['business_email', 'Email'],
              ['business_phone', 'Phone'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={set(key)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
                />
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
                {loading ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {infoRows.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, vendors: 0, riders: 0, orders: 0, todayRevenue: 0 });
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated() || !isAdmin()) {
      setError('Session expired. Please log in again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [statsRes, vendorsRes] = await Promise.all([
        getDashboardStats(),
        listVendors(1, 50),
      ]);
      setStats(statsRes);
      setVendors(vendorsRes.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddVendor = async (data: any) => {
    setActionLoading(true);
    try {
      const newVendor = await createVendor(data);
      setVendors(prev => [newVendor, ...prev]);
      setShowAddModal(false);
      showToast(`${data.business_name} added successfully`);
      fetchAll(); // refresh stats
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to create vendor', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateVendor = async (data: any) => {
    if (!selectedVendor) return;
    setActionLoading(true);
    try {
      const updated = await updateVendor(selectedVendor.vendor_id, data);
      setVendors(prev => prev.map(v => v.vendor_id === selectedVendor.vendor_id ? updated : v));
      setSelectedVendor(updated);
      showToast('Vendor updated');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Update failed', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (vendor: Vendor) => {
    try {
      const updated = await toggleVendorStatus(vendor.vendor_id, !vendor.is_active);
      setVendors(prev => prev.map(v => v.vendor_id === vendor.vendor_id ? updated : v));
      if (selectedVendor?.vendor_id === vendor.vendor_id) setSelectedVendor(updated);
      showToast(`${vendor.business_name} ${!vendor.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      showToast('Status update failed', 'error');
    }
  };

  const handleApprove = async (vendor: Vendor) => {
    try {
      const updated = await approveVendor(vendor.vendor_id);
      setVendors(prev => prev.map(v => v.vendor_id === vendor.vendor_id ? updated : v));
      showToast(`${vendor.business_name} approved`);
    } catch {
      showToast('Approval failed', 'error');
    }
  };

  const filtered = vendors.filter(v =>
    v.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.business_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    v.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = vendors.filter(v => v.is_active).length;
  const pendingCount = vendors.filter(v => !v.is_verified).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and monitor your vendor network</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={16} />
              Add vendor
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))
          ) : (
            <>
              <StatCard icon={Store} label="Total vendors" value={stats.vendors} accent="bg-emerald-50" />
              <StatCard icon={CheckCircle2} label="Active" value={activeCount} accent="bg-blue-50" />
              <StatCard icon={AlertCircle} label="Pending verification" value={pendingCount} accent="bg-amber-50" />
              <StatCard icon={Users} label="Total users" value={stats.users} accent="bg-purple-50" />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchAll} className="text-red-600 font-medium hover:underline">Retry</button>
          </div>
        )}

        {/* Main content */}
        {selectedVendor ? (
          <VendorDetail
            vendor={selectedVendor}
            onBack={() => setSelectedVendor(null)}
            onUpdate={handleUpdateVendor}
            loading={actionLoading}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Table toolbar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
                />
              </div>
              <p className="text-xs text-gray-400 ml-auto">
                {filtered.length} of {vendors.length}
              </p>
            </div>

            {/* Table */}
            {loading && vendors.length === 0 ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Store size={32} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  {search ? 'No vendors match your search' : 'No vendors yet'}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Plus size={14} /> Add your first vendor
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Verification</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(vendor => (
                      <VendorRow
                        key={vendor.vendor_id}
                        vendor={vendor}
                        onSelect={() => setSelectedVendor(vendor)}
                        onToggle={() => handleToggle(vendor)}
                        onApprove={() => handleApprove(vendor)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add vendor modal */}
      {showAddModal && (
        <AddVendorModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddVendor}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default VendorsPage;
