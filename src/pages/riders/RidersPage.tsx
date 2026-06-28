// src/pages/riders/RidersPage.tsx — Full production rewrite
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Truck, Search, Filter, Phone, Mail, Eye, BarChart2, UserPlus,
  Key, MapPin, Clock, Star, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Settings, Navigation, Activity, ShoppingBag, ChevronLeft,
  ChevronRight, RefreshCw, Edit3, X, Loader2, Save, Globe,
  Shield, AlertOctagon, Package, DollarSign, Percent,
} from 'lucide-react';
import {
  listRiders,
  updateRiderStatus,
  approveRider,
  resetRiderPassword,
  createRider,
  getRiderAnalytics,
  getRiderOrders,
  updateRiderProfile,
} from '../../services/adminService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthAccount { email: string; phone_number: string; is_active: boolean; last_login_at?: string | null }
interface Rider {
  rider_id: string; account_id?: string;
  first_name?: string; last_name?: string; full_name?: string;
  email?: string; phone?: string; phone_number?: string;
  vehicle_type: string; vehicle_registration?: string | null;
  driving_license_no?: string | null; license_expiry_date?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null;
  rating: number; total_reviews?: number; total_deliveries: number;
  max_delivery_distance_km?: number; vehicle_capacity_kg?: number;
  commission_rate?: number;
  current_status: 'offline'|'available'|'busy'|'on_delivery'|'on_break'|'pending'|'suspended';
  is_verified: boolean; is_active: boolean;
  last_location_update?: string | null; created_at?: string;
  auth_account?: AuthAccount;
}
interface Order {
  order_id: number | string; order_number?: string;
  order_status: string; total_amount?: number | string; delivery_fee?: number | string;
  delivery_address?: string; created_at?: string; delivered_at?: string; updated_at?: string;
  customer?: { first_name?: string; last_name?: string; phone_number?: string } | null;
}
interface Analytics {
  totalDeliveries?: number; completedDeliveries?: number; completionRate?: number | string;
  avgRating?: number | string; totalEarnings?: number | string;
}
interface EditForm {
  full_name: string; email: string; phone: string; vehicle_type: string;
  vehicle_registration: string; driving_license_no: string; license_expiry_date: string;
  national_id: string; emergency_contact_name: string; emergency_contact_phone: string;
  commission_rate: string; max_delivery_distance_km: string;
}
interface NewRiderForm {
  full_name: string; email: string; phone: string; vehicle_type: string;
  vehicle_registration: string; driving_license_no: string; license_expiry_date: string;
  national_id: string; emergency_contact_name: string; emergency_contact_phone: string;
}

type ViewMode = 'list' | 'details' | 'analytics' | 'map';
type DetailTab = 'info' | 'orders';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const riderName  = (r: Rider) => r.full_name?.trim() || [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown Rider';
const riderEmail = (r: Rider) => r.email || r.auth_account?.email || '';
const riderPhone = (r: Rider) => r.phone || r.phone_number || r.auth_account?.phone_number || '';

const fmt = (d?: string | null) => !d ? 'N/A' : new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDT = (d?: string | null) => !d ? 'N/A' : new Date(d).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const ksh = (v?: number | string | null) => `KSh ${Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const vehicleEmoji = (t: string) => ({ motorcycle:'🏍️', bicycle:'🚲', tuk_tuk:'🛺', van:'🚐', pickup:'🚚' }[t] ?? '🚗');
const statusLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const BLANK_NEW: NewRiderForm = { full_name:'', email:'', phone:'', vehicle_type:'motorcycle', vehicle_registration:'', driving_license_no:'', license_expiry_date:'', national_id:'', emergency_contact_name:'', emergency_contact_phone:'' };
const ORDER_STATUSES = ['all','pending','confirmed','preparing','ready','dispatched','delivered','cancelled'];
const ORDERS_PER_PAGE = 10;

const STATUS_BADGE: Record<string, string> = {
  available:   'bg-emerald-100 text-emerald-800',
  busy:        'bg-amber-100 text-amber-800',
  on_delivery: 'bg-amber-100 text-amber-800',
  on_break:    'bg-blue-100 text-blue-800',
  pending:     'bg-yellow-100 text-yellow-800',
  suspended:   'bg-red-100 text-red-800',
  offline:     'bg-slate-100 text-slate-600',
};
const ORDER_BADGE: Record<string, string> = {
  pending:'bg-amber-50 text-amber-700', confirmed:'bg-blue-50 text-blue-700', preparing:'bg-indigo-50 text-indigo-700',
  ready:'bg-cyan-50 text-cyan-700', dispatched:'bg-orange-50 text-orange-700',
  delivered:'bg-emerald-50 text-emerald-700', cancelled:'bg-red-50 text-red-700',
};

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; type: 'success'|'error'; msg: string }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: 'success'|'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, success: (m: string) => add(m, 'success'), error: (m: string) => add(m, 'error') };
}
function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border max-w-sm ${t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-700'}`}>
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm ──────────────────────────────────────────────────────────────────
function Confirm({ title, msg, onConfirm, onCancel, danger }: { title:string; msg:string; onConfirm:()=>void; onCancel:()=>void; danger?:boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{msg}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Rider Avatar ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = ['from-blue-500 to-violet-600','from-cyan-500 to-blue-600','from-emerald-500 to-teal-600','from-orange-500 to-rose-500'];
const avatarGrad = (id: string) => AVATAR_GRADIENTS[parseInt(id || '0') % AVATAR_GRADIENTS.length];

function RiderAvatar({ rider, size = 'md' }: { rider: Rider; size?: 'sm'|'md'|'lg' }) {
  const s = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-xl' }[size];
  return (
    <div className={`${s} rounded-full bg-gradient-to-br ${avatarGrad(rider.rider_id)} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {riderName(rider)[0]?.toUpperCase() ?? 'R'}
    </div>
  );
}

// ─── Edit Rider Modal ─────────────────────────────────────────────────────────
function EditRiderModal({ rider, onSave, onClose, saving }: {
  rider: Rider; onSave: (id: string, data: Partial<EditForm>) => Promise<void>; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    full_name:              riderName(rider),
    email:                  riderEmail(rider),
    phone:                  riderPhone(rider),
    vehicle_type:           rider.vehicle_type || 'motorcycle',
    vehicle_registration:   rider.vehicle_registration || '',
    driving_license_no:     rider.driving_license_no || '',
    license_expiry_date:    rider.license_expiry_date || '',
    national_id:            rider.national_id || '',
    emergency_contact_name: rider.emergency_contact_name || '',
    emergency_contact_phone:rider.emergency_contact_phone || '',
    commission_rate:        rider.commission_rate ? String(rider.commission_rate) : '',
    max_delivery_distance_km: rider.max_delivery_distance_km ? String(rider.max_delivery_distance_km) : '',
  });

  const set = (k: keyof EditForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const Field = ({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof EditForm; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      <input type={type} value={form[name] as string} onChange={e => set(name, e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <RiderAvatar rider={rider} size="sm" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Edit Rider</h3>
              <p className="text-xs text-slate-400">{riderName(rider)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Personal Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" name="full_name" />
                <Field label="Email Address" name="email" type="email" />
                <Field label="Phone Number" name="phone" type="tel" placeholder="+254..." />
                <Field label="National ID" name="national_id" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vehicle Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Vehicle Type</label>
                  <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition">
                    {[['motorcycle','🏍️ Motorcycle'],['bicycle','🚲 Bicycle'],['tuk_tuk','🛺 Tuk Tuk'],['van','🚐 Van'],['pickup','🚚 Pickup']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <Field label="Registration Plate" name="vehicle_registration" placeholder="KAA 123B" />
                <Field label="Driving License No." name="driving_license_no" />
                <Field label="License Expiry" name="license_expiry_date" type="date" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Emergency Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact Name" name="emergency_contact_name" />
                <Field label="Contact Phone" name="emergency_contact_phone" type="tel" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Delivery Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Commission Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)} placeholder="e.g. 10"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Distance (km)</label>
                  <input type="number" min="0" value={form.max_delivery_distance_km} onChange={e => set('max_delivery_distance_km', e.target.value)} placeholder="e.g. 20"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50">Cancel</button>
          <button onClick={() => onSave(rider.rider_id, form)} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function RidersPage() {
  const toast = useToast();

  // List state
  const [riders, setRiders]                 = useState<Rider[]>([]);
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');

  // Navigation
  const [viewMode, setViewMode]             = useState<ViewMode>('list');
  const [selectedRider, setSelectedRider]   = useState<Rider | null>(null);
  const [detailTab, setDetailTab]           = useState<DetailTab>('info');

  // Edit
  const [editingRider, setEditingRider]     = useState<Rider | null>(null);
  const [savingEdit, setSavingEdit]         = useState(false);

  // Analytics
  const [analytics, setAnalytics]           = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Orders
  const [orders, setOrders]                 = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading]   = useState(false);
  const [ordersPage, setOrdersPage]         = useState(1);
  const [ordersTotal, setOrdersTotal]       = useState(0);
  const [orderFilter, setOrderFilter]       = useState('all');

  // Create modal
  const [showCreate, setShowCreate]         = useState(false);
  const [createLoading, setCreateLoading]   = useState(false);
  const [newForm, setNewForm]               = useState<NewRiderForm>(BLANK_NEW);

  // Confirm dialog
  const [confirm, setConfirm]               = useState<{ title:string; msg:string; onConfirm:()=>void; danger?:boolean } | null>(null);

  // Reset password modal
  const [resetModal, setResetModal]         = useState<Rider | null>(null);
  const [newPassword, setNewPassword]       = useState('');

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRiders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listRiders();
      if (!mounted.current) return;
      setRiders(res.data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load riders');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const loadAnalytics = async (riderId: string) => {
    setAnalyticsLoading(true); setAnalytics(null);
    try {
      const res = await getRiderAnalytics(riderId);
      const d = res.data;
      if (mounted.current) setAnalytics(Array.isArray(d) ? (d[0] ?? null) : (d ?? null));
    } catch { /* supplemental */ }
    finally { if (mounted.current) setAnalyticsLoading(false); }
  };

  const loadOrders = useCallback(async (riderId: string, page: number, statusFilter: string) => {
    setOrdersLoading(true);
    try {
      const res = await getRiderOrders(riderId, { page, limit: ORDERS_PER_PAGE, ...(statusFilter !== 'all' ? { status: statusFilter } : {}) });
      if (!mounted.current) return;
      setOrders(res.data || []);
      setOrdersTotal(res.total ?? (res.data || []).length);
    } catch (err: any) { toast.error(err?.message || 'Failed to load orders'); }
    finally { if (mounted.current) setOrdersLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedRider && detailTab === 'orders') loadOrders(selectedRider.rider_id, ordersPage, orderFilter);
  }, [selectedRider, detailTab, ordersPage, orderFilter, loadOrders]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggleStatus = (rider: Rider) => {
    const next = rider.current_status === 'available' ? 'offline' : 'available';
    setConfirm({
      title: `Set ${riderName(rider)} ${next}?`,
      msg: `This will change their status from "${statusLabel(rider.current_status)}" to "${statusLabel(next)}".`,
      onConfirm: async () => {
        setConfirm(null); setActionLoading(true);
        try {
          await updateRiderStatus(rider.rider_id, { status: next });
          await fetchRiders();
          if (selectedRider?.rider_id === rider.rider_id) setSelectedRider(p => p ? { ...p, current_status: next as Rider['current_status'] } : p);
          toast.success(`Status updated to ${next}`);
        } catch (err: any) { toast.error(err?.message || 'Failed to update status'); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleApprove = (rider: Rider) => {
    setConfirm({
      title: `Verify ${riderName(rider)}?`,
      msg: 'This will mark the rider as verified and activate their account.',
      onConfirm: async () => {
        setConfirm(null); setActionLoading(true);
        try {
          await approveRider(rider.rider_id);
          await fetchRiders();
          toast.success('Rider verified successfully');
        } catch (err: any) { toast.error(err?.message || 'Failed to verify rider'); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleResetPassword = async () => {
    if (!resetModal) return;
    setActionLoading(true);
    try {
      await resetRiderPassword(resetModal.rider_id);
      setResetModal(null); setNewPassword('');
      toast.success('Password reset email sent to rider');
    } catch (err: any) { toast.error(err?.message || 'Failed to reset password'); }
    finally { setActionLoading(false); }
  };

  const handleViewDetails = (rider: Rider) => {
    setSelectedRider(rider);
    setDetailTab('info');
    setOrdersPage(1); setOrderFilter('all');
    setViewMode('details');
    loadAnalytics(rider.rider_id);
  };

  const handleSaveEdit = async (riderId: string, data: Partial<EditForm>) => {
    setSavingEdit(true);
    try {
      const payload: any = { ...data };
      if (data.commission_rate) payload.commission_rate = parseFloat(data.commission_rate) / 100;
      else delete payload.commission_rate;
      if (!data.max_delivery_distance_km) delete payload.max_delivery_distance_km;
      await updateRiderProfile(riderId, payload);
      setEditingRider(null);
      await fetchRiders();
      if (selectedRider?.rider_id === riderId) {
        const updated = await listRiders();
        const fresh = (updated.data || []).find((r: Rider) => r.rider_id === riderId);
        if (fresh) setSelectedRider(fresh);
      }
      toast.success('Rider profile updated');
    } catch (err: any) { toast.error(err?.message || 'Failed to update rider'); }
    finally { setSavingEdit(false); }
  };

  const handleCreateRider = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateLoading(true);
    try {
      await createRider(newForm);
      setShowCreate(false); setNewForm(BLANK_NEW);
      await fetchRiders();
      toast.success('Rider created successfully');
    } catch (err: any) { toast.error(err?.message || 'Failed to create rider'); }
    finally { setCreateLoading(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = riders.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchQ = !q || riderName(r).toLowerCase().includes(q) || riderPhone(r).includes(searchTerm)
      || riderEmail(r).toLowerCase().includes(q) || (r.national_id || '').includes(searchTerm)
      || (r.vehicle_registration || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    switch (filterStatus) {
      case 'available': return r.current_status === 'available';
      case 'busy':      return r.current_status === 'busy' || r.current_status === 'on_delivery';
      case 'offline':   return r.current_status === 'offline';
      case 'verified':  return r.is_verified;
      case 'pending':   return !r.is_verified;
      default: return true;
    }
  });

  const isBusy = (r: Rider) => r.current_status === 'busy' || r.current_status === 'on_delivery';

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  const ListView = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Search by name, phone, email, ID or plate…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none">
            <option value="all">All riders</option>
            <option value="available">Available</option>
            <option value="busy">Busy / On delivery</option>
            <option value="offline">Offline</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending verification</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Rider','Contact','Vehicle','Status','Performance','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(rider => (
                <tr key={rider.rider_id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <RiderAvatar rider={rider} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{riderName(rider)}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">#{rider.rider_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-0.5">
                      <p className="flex items-center gap-1.5 text-slate-700 text-[12.5px]">
                        <Phone className="w-3 h-3 text-slate-400" />{riderPhone(rider) || '—'}
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[160px]">
                        <Mail className="w-3 h-3" />{riderEmail(rider) || '—'}
                      </p>
                      <p className="text-[11px] text-slate-300">Joined {fmt(rider.created_at)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-700 text-[12.5px]">{vehicleEmoji(rider.vehicle_type)} {rider.vehicle_type.replace(/_/g, ' ')}</p>
                    {rider.vehicle_registration && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{rider.vehicle_registration}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_BADGE[rider.current_status] ?? STATUS_BADGE.offline}`}>
                        {statusLabel(rider.current_status)}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${rider.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {rider.is_verified ? '✓ Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 mb-1"><Star className="w-3.5 h-3.5 text-yellow-400" /><span className="font-semibold text-slate-800">{rider.rating ? Number(rider.rating).toFixed(1) : '—'}</span></div>
                    <p className="text-[11px] text-slate-400">{rider.total_deliveries ?? 0} deliveries</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => handleViewDetails(rider)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition"><Eye className="w-3 h-3 inline mr-0.5" />View</button>
                      <button onClick={() => setEditingRider(rider)} className="px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold transition"><Edit3 className="w-3 h-3 inline mr-0.5" />Edit</button>
                      {!rider.is_verified && <button onClick={() => handleApprove(rider)} disabled={actionLoading} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition disabled:opacity-50"><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Verify</button>}
                      <button onClick={() => handleToggleStatus(rider)} disabled={actionLoading || isBusy(rider)} title={isBusy(rider) ? 'Rider is on delivery' : undefined}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition disabled:opacity-50 ${rider.current_status === 'available' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                        {rider.current_status === 'available' ? 'Offline' : 'Online'}
                      </button>
                      <button onClick={() => setResetModal(rider)} className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold transition"><Key className="w-3 h-3 inline mr-0.5" />Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div className="py-16 text-center">
            <Truck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No riders found</p>
            <p className="text-sm text-slate-400 mt-1">{searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'No riders registered yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  const DetailView = () => {
    if (!selectedRider) return null;
    const r = selectedRider;
    const email = riderEmail(r); const phone = riderPhone(r);
    return (
      <div className="space-y-5">
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 pt-6 pb-5">
            <button onClick={() => { setViewMode('list'); setSelectedRider(null); }} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium mb-4 transition">
              <ChevronLeft className="w-4 h-4" />Back to list
            </button>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl ring-4 ring-white/20">
                {riderName(r)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-white leading-tight">{riderName(r)}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE[r.current_status] ?? STATUS_BADGE.offline}`}>{statusLabel(r.current_status)}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${r.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.is_verified ? '✓ Verified' : 'Unverified'}</span>
                  <span className="text-white/60 text-xs">#{r.rider_id}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-white/80 text-xs">
                  {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</span>}
                  {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
                  {r.created_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Joined {fmt(r.created_at)}</span>}
                </div>
              </div>
              <button onClick={() => setEditingRider(r)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition">
                <Edit3 className="w-3.5 h-3.5" />Edit
              </button>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label:'Rating',     val: r.rating ? Number(r.rating).toFixed(1) : '—',    icon: Star,     color:'text-yellow-500' },
              { label:'Deliveries', val: String(r.total_deliveries ?? 0),                  icon: Package,  color:'text-blue-500' },
              { label:'Max km',     val: r.max_delivery_distance_km ? `${r.max_delivery_distance_km}km` : '—', icon: Navigation, color:'text-violet-500' },
              { label:'Commission', val: r.commission_rate ? `${(Number(r.commission_rate)*100).toFixed(0)}%` : '—', icon: Percent, color:'text-emerald-500' },
              { label:'Analytics',  val: analytics?.totalEarnings ? ksh(analytics.totalEarnings) : '—', icon: DollarSign, color:'text-amber-500' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="px-4 py-3 text-center hidden sm:block last:block">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className="text-sm font-bold text-slate-800">{val}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {([
            { key:'info',   label:'Profile',  icon: Settings },
            { key:'orders', label:'Orders',   icon: ShoppingBag },
          ] as { key: DetailTab; label:string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setDetailTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${detailTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Icon className="w-4 h-4" />{label}
              {key === 'orders' && ordersTotal > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold">{ordersTotal}</span>}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {detailTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Basic info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Contact & Identity</h3>
              <dl className="space-y-3">
                {([
                  ['Email',          email || '—'],
                  ['Phone',          phone || '—'],
                  ['National ID',    r.national_id || '—'],
                  ['Member since',   fmt(r.created_at)],
                  ['Last active',    r.auth_account?.last_login_at ? fmtDT(r.auth_account.last_login_at) : 'Never'],
                ] as [string,string][]).map(([k,v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                    <dt className="text-xs text-slate-400 shrink-0 mt-0.5">{k}</dt>
                    <dd className="text-xs font-semibold text-slate-700 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Vehicle */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Vehicle Details</h3>
              <dl className="space-y-3">
                {([
                  ['Type',          `${vehicleEmoji(r.vehicle_type)} ${r.vehicle_type.replace(/_/g,' ')}`],
                  ['Registration',  r.vehicle_registration || '—'],
                  ['License No.',   r.driving_license_no   || '—'],
                  ['Expiry',        fmt(r.license_expiry_date)],
                ] as [string,string][]).map(([k,v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 py-1 border-b border-slate-50 last:border-0">
                    <dt className="text-xs text-slate-400 shrink-0">{k}</dt>
                    <dd className="text-xs font-semibold text-slate-700 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Emergency contact */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Emergency Contact</h3>
              <dl className="space-y-3">
                <div className="flex justify-between py-1 border-b border-slate-50"><dt className="text-xs text-slate-400">Name</dt><dd className="text-xs font-semibold text-slate-700">{r.emergency_contact_name || '—'}</dd></div>
                <div className="flex justify-between py-1"><dt className="text-xs text-slate-400">Phone</dt><dd className="text-xs font-semibold text-slate-700">{r.emergency_contact_phone || '—'}</dd></div>
              </dl>
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Performance Analytics</h3>
              {analyticsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
              ) : analytics ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l:'Total Orders',  v: analytics.totalDeliveries    ?? '—' },
                    { l:'Completed',     v: analytics.completedDeliveries ?? '—' },
                    { l:'Completion %',  v: analytics.completionRate ? `${analytics.completionRate}%` : '—' },
                    { l:'Avg Rating',    v: analytics.avgRating ? Number(analytics.avgRating).toFixed(1) : '—' },
                    { l:'Total Earnings',v: analytics.totalEarnings ? ksh(analytics.totalEarnings) : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{l}</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">{String(v)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400">Analytics unavailable</p>}
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setEditingRider(r)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition">
                  <Edit3 className="w-4 h-4" />Edit Profile
                </button>
                {!r.is_verified && (
                  <button onClick={() => handleApprove(r)} disabled={actionLoading} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" />Verify Rider
                  </button>
                )}
                <button onClick={() => handleToggleStatus(r)} disabled={actionLoading || isBusy(r)} title={isBusy(r) ? 'On delivery' : undefined}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${r.current_status === 'available' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  <Activity className="w-4 h-4" />{r.current_status === 'available' ? 'Set Offline' : 'Set Online'}
                </button>
                <button onClick={() => setResetModal(r)} disabled={actionLoading} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                  <Key className="w-4 h-4" />Reset Password
                </button>
                <button onClick={() => setDetailTab('orders')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
                  <ShoppingBag className="w-4 h-4" />View Orders
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {detailTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map(s => (
                <button key={s} onClick={() => { setOrderFilter(s); setOrdersPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${orderFilter === s ? (ORDER_BADGE[s] ?? 'bg-slate-800 text-white') + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {s === 'all' ? `All (${ordersTotal})` : statusLabel(s)}
                </button>
              ))}
              <button onClick={() => loadOrders(r.rider_id, ordersPage, orderFilter)} disabled={ordersLoading}
                className="ml-auto px-3 py-1 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${ordersLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading orders…</span></div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center"><ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 font-medium">No orders found</p><p className="text-xs text-slate-400 mt-1">{orderFilter !== 'all' ? `No ${orderFilter} orders` : 'This rider has no orders yet'}</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100">{['Order','Status','Customer','Address','Amount','Date'].map(h => <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.map(order => (
                        <tr key={order.order_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5"><p className="font-mono text-[11px] font-semibold text-slate-700">#{order.order_number || String(order.order_id).slice(0,8).toUpperCase()}</p></td>
                          <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${ORDER_BADGE[order.order_status?.toLowerCase()] ?? 'bg-slate-100 text-slate-500'}`}>{statusLabel(order.order_status)}</span></td>
                          <td className="px-5 py-3.5">
                            {order.customer ? (
                              <div>
                                <p className="text-[12.5px] font-semibold text-slate-700">{[order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ') || 'Customer'}</p>
                                {order.customer.phone_number && <p className="text-[11px] text-slate-400">{order.customer.phone_number}</p>}
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3.5"><p className="text-[11px] text-slate-500 max-w-[180px] truncate">{order.delivery_address || '—'}</p></td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="text-[12.5px] font-bold text-slate-800 whitespace-nowrap">{ksh(Number(order.total_amount || 0) + Number(order.delivery_fee || 0))}</p>
                            {Number(order.delivery_fee) > 0 && <p className="text-[10px] text-slate-400">Fee: {ksh(order.delivery_fee)}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-slate-400 whitespace-nowrap">{fmtDT(order.order_status === 'delivered' ? order.delivered_at || order.updated_at : order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!ordersLoading && ordersTotal > ORDERS_PER_PAGE && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>Page {ordersPage} of {Math.ceil(ordersTotal / ORDERS_PER_PAGE)} · {ordersTotal} total</span>
                  <div className="flex gap-2">
                    <button onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage <= 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setOrdersPage(p => p + 1)} disabled={ordersPage >= Math.ceil(ordersTotal / ORDERS_PER_PAGE)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── ANALYTICS VIEW ─────────────────────────────────────────────────────────
  const AnalyticsView = () => {
    const available = riders.filter(r => r.current_status === 'available').length;
    const busy_c    = riders.filter(r => isBusy(r)).length;
    const offline_c = riders.filter(r => r.current_status === 'offline').length;
    const verified  = riders.filter(r => r.is_verified).length;
    const top5      = [...riders].sort((a, b) => (Number(b.rating) * (b.total_deliveries || 0)) - (Number(a.rating) * (a.total_deliveries || 0))).slice(0, 5);
    const totalDeliveries = riders.reduce((s, r) => s + (r.total_deliveries || 0), 0);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Fleet Analytics</h2>
          <button onClick={() => setViewMode('list')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back to list</button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Riders',    val: riders.length,   icon: Truck,          color:'text-blue-600',    bg:'bg-blue-50' },
            { label:'Available Now',   val: available,        icon: CheckCircle2,   color:'text-emerald-600', bg:'bg-emerald-50' },
            { label:'On Delivery',     val: busy_c,           icon: Clock,          color:'text-amber-600',   bg:'bg-amber-50' },
            { label:'Offline',         val: offline_c,        icon: AlertOctagon,   color:'text-slate-500',   bg:'bg-slate-100' },
            { label:'Verified',        val: verified,         icon: Shield,         color:'text-violet-600',  bg:'bg-violet-50' },
            { label:'Unverified',      val: riders.length - verified, icon: AlertTriangle, color:'text-yellow-600', bg:'bg-yellow-50' },
            { label:'Total Deliveries',val: totalDeliveries,  icon: Package,        color:'text-indigo-600',  bg:'bg-indigo-50' },
            { label:'Avg Rating',      val: riders.length ? (riders.reduce((s,r) => s + Number(r.rating || 0), 0) / riders.length).toFixed(1) : '—', icon: Star, color:'text-yellow-500', bg:'bg-yellow-50' },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm`}>
              <div><p className="text-xs text-slate-500 font-medium">{label}</p><p className={`text-2xl font-black mt-0.5 ${color}`}>{val}</p></div>
              <Icon className={`w-5 h-5 ${color} opacity-60`} />
            </div>
          ))}
        </div>

        {/* Status breakdown bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Status Distribution</h3>
          <div className="flex rounded-xl overflow-hidden h-4 mb-3">
            {riders.length > 0 && [
              { s:'available', color:'bg-emerald-400', count: available },
              { s:'busy',      color:'bg-amber-400',   count: busy_c },
              { s:'offline',   color:'bg-slate-300',   count: offline_c },
              { s:'other',     color:'bg-slate-100',   count: riders.length - available - busy_c - offline_c },
            ].filter(x => x.count > 0).map(({ s, color, count }) => (
              <div key={s} className={`${color} transition-all`} style={{ width: `${(count / riders.length) * 100}%` }} title={`${statusLabel(s)}: ${count}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {[['bg-emerald-400','Available',available],['bg-amber-400','On Delivery',busy_c],['bg-slate-300','Offline',offline_c]].map(([c,l,v]) => (
              <div key={l as string} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c}`} /><span className="text-slate-500">{l}: <b className="text-slate-700">{v}</b></span></div>
            ))}
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Top Performers</h3>
          {top5.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No rider data yet</p> : (
            <div className="space-y-3">
              {top5.map((r, i) => (
                <div key={r.rider_id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-orange-300' : 'bg-slate-200'}`}>{i + 1}</span>
                    <RiderAvatar rider={r} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{riderName(r)}</p>
                      <p className="text-xs text-slate-400">{r.total_deliveries ?? 0} deliveries · {vehicleEmoji(r.vehicle_type)} {r.vehicle_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" /><span className="text-sm font-bold text-slate-700">{r.rating ? Number(r.rating).toFixed(1) : '—'}</span></div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${STATUS_BADGE[r.current_status] ?? STATUS_BADGE.offline}`}>{statusLabel(r.current_status)}</span>
                    <button onClick={() => handleViewDetails(r)} className="text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">View →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── MAP VIEW ───────────────────────────────────────────────────────────────
  const MapView = () => {
    const active = riders.filter(r => r.current_status !== 'offline');
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Rider Locations</h2>
          <button onClick={() => setViewMode('list')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back</button>
        </div>

        {/* Map placeholder with legend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center"><Globe className="w-8 h-8 text-slate-300" /></div>
            <p className="text-sm font-semibold text-slate-500">Map Integration Area</p>
            <p className="text-xs text-slate-400">Connect Google Maps or Leaflet to show live rider positions</p>
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow px-3 py-2 text-xs font-semibold text-slate-600">
              {active.length} active rider{active.length !== 1 ? 's' : ''}
            </div>
            {/* Decorative rider markers */}
            {active.slice(0, 5).map((r, i) => (
              <div key={r.rider_id} className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(r.rider_id)} flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white`}
                style={{ top: `${20 + i * 12}%`, left: `${15 + i * 14}%` }}>
                {riderName(r)[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Active riders grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map(r => (
            <div key={r.rider_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <RiderAvatar rider={r} size="sm" />
                  <div><p className="text-sm font-semibold text-slate-800">{riderName(r)}</p><p className="text-[11px] text-slate-400">{vehicleEmoji(r.vehicle_type)} {r.vehicle_type.replace(/_/g,' ')}</p></div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_BADGE[r.current_status] ?? STATUS_BADGE.offline}`}>{statusLabel(r.current_status)}</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{riderPhone(r) || '—'}</p>
                <p className="flex items-center gap-1"><Navigation className="w-3 h-3" />Last ping: {r.last_location_update ? fmtDT(r.last_location_update) : 'Unknown'}</p>
                <p className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{r.rating ? Number(r.rating).toFixed(1) : '—'} · {r.total_deliveries ?? 0} deliveries</p>
              </div>
              <button onClick={() => handleViewDetails(r)} className="mt-3 w-full py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition">View details →</button>
            </div>
          ))}
          {active.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-10">No active riders right now</p>}
        </div>
      </div>
    );
  };

  // ── CREATE MODAL ───────────────────────────────────────────────────────────
  const CreateModal = () => !showCreate ? null : (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500" />Add New Rider</h2>
          <button onClick={() => { setShowCreate(false); setNewForm(BLANK_NEW); }} disabled={createLoading} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleCreateRider} className="p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Personal Info</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([['full_name','Full Name *','text',true],['email','Email *','email',true],['phone','Phone *','tel',true],['national_id','National ID','text',false]] as [keyof NewRiderForm,string,string,boolean][]).map(([k,l,t,r]) => (
                <div key={k}><label className="block text-[11px] font-semibold text-slate-500 mb-1">{l}</label><input type={t} required={r} value={newForm[k] as string} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))} disabled={createLoading} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition disabled:opacity-50" /></div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Vehicle</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">Vehicle Type *</label>
                <select value={newForm.vehicle_type} onChange={e => setNewForm(f => ({ ...f, vehicle_type: e.target.value }))} disabled={createLoading} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition disabled:opacity-50">
                  {[['motorcycle','🏍️ Motorcycle'],['bicycle','🚲 Bicycle'],['tuk_tuk','🛺 Tuk Tuk'],['van','🚐 Van'],['pickup','🚚 Pickup']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              {([['vehicle_registration','Registration Plate'],['driving_license_no','License No.']] as [keyof NewRiderForm,string][]).map(([k,l]) => (
                <div key={k}><label className="block text-[11px] font-semibold text-slate-500 mb-1">{l}</label><input value={newForm[k] as string} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))} disabled={createLoading} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition disabled:opacity-50" /></div>
              ))}
              <div><label className="block text-[11px] font-semibold text-slate-500 mb-1">License Expiry</label><input type="date" value={newForm.license_expiry_date} onChange={e => setNewForm(f => ({ ...f, license_expiry_date: e.target.value }))} disabled={createLoading} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition disabled:opacity-50" /></div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([['emergency_contact_name','Contact Name'],['emergency_contact_phone','Contact Phone']] as [keyof NewRiderForm,string][]).map(([k,l]) => (
                <div key={k}><label className="block text-[11px] font-semibold text-slate-500 mb-1">{l}</label><input value={newForm[k] as string} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))} disabled={createLoading} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition disabled:opacity-50" /></div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowCreate(false); setNewForm(BLANK_NEW); }} disabled={createLoading} className="px-4 py-2.5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={createLoading} className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2">
              {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}{createLoading ? 'Creating…' : 'Create Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ── Reset Password Modal ───────────────────────────────────────────────────
  const ResetPasswordModal = () => !resetModal ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setResetModal(null); setNewPassword(''); }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2"><Key className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-slate-800 text-sm">Reset Password</h3></div>
          <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4">
            <RiderAvatar rider={resetModal} size="sm" />
            <div><p className="text-sm font-semibold text-slate-800">{riderName(resetModal)}</p><p className="text-xs text-slate-400">{riderEmail(resetModal) || riderPhone(resetModal)}</p></div>
          </div>
          <p className="text-sm text-slate-500 mb-5">A new temporary password will be generated and sent to the rider's registered email or phone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleResetPassword} disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}Send Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ROOT RENDER ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p className="text-slate-500 text-sm">Loading riders…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster toasts={toast.toasts} />
      {confirm && <Confirm {...confirm} onCancel={() => setConfirm(null)} />}
      {editingRider && <EditRiderModal rider={editingRider} onSave={handleSaveEdit} onClose={() => setEditingRider(null)} saving={savingEdit} />}
      <CreateModal />
      <ResetPasswordModal />

      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center"><Truck className="w-4 h-4 text-white" /></div>Riders Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {riders.length} riders</p>
          </div>
          {viewMode === 'list' && (
            <div className="flex flex-wrap gap-2">
              {([['list','list',Truck],['analytics','analytics',BarChart2],['map','map',MapPin]] as [ViewMode,string,React.ElementType][]).map(([m,l,Icon]) => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-2 rounded-xl text-sm font-semibold transition capitalize flex items-center gap-1.5 ${viewMode === m ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className="w-4 h-4" />{l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
              <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />Add Rider
              </button>
              <button onClick={fetchRiders} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {viewMode === 'list'      && <ListView />}
        {viewMode === 'details'   && <DetailView />}
        {viewMode === 'analytics' && <AnalyticsView />}
        {viewMode === 'map'       && <MapView />}
      </div>
    </div>
  );
}
