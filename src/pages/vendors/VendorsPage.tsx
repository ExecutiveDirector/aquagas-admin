import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, AlertCircle, RefreshCw, Store, CheckCircle2,
  XCircle, ChevronRight, ArrowLeft, BarChart2, Package,
  ShoppingBag, TrendingUp, Users, Eye, Edit2, Power,
  PowerOff, X, Building2, Mail, Phone, Lock, User, Layers,
  MapPin, Link, Clock, ExternalLink, Minus, Save, Filter,
  ChevronDown, AlertTriangle, PackagePlus, Truck,
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
import { isAuthenticated, isAdmin } from '../../services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats { users: number; vendors: number; riders: number; orders: number; todayRevenue: number; }

interface OutletFormData {
  outlet_name: string;
  outlet_code: string;
  latitude: string;
  longitude: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  postal_code: string;
  phone: string;
  email: string;
  opening_time: string;
  closing_time: string;
}

interface Outlet extends OutletFormData {
  outlet_id: string;
  vendor_id: string;
  is_active: boolean;
  created_at?: string;
}

// ─── Maps link parser ─────────────────────────────────────────────────────────

function parseGoogleMapsLink(input: string): { lat: string; lng: string } | null {
  const text = input.trim();

  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

  const qMatch = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

  const placeMatch = text.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (placeMatch) return { lat: placeMatch[1], lng: placeMatch[2] };

  const llMatch = text.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: llMatch[1], lng: llMatch[2] };

  const d3Match = text.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
  if (d3Match) return { lat: d3Match[1], lng: d3Match[2] };

  const bareMatch = text.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (bareMatch) return { lat: bareMatch[1], lng: bareMatch[2] };

  return null;
}

// ─── API helpers (outlets) ────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

function authHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiFetchOutlets(vendorId: string): Promise<Outlet[]> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch outlets');
  const data = await res.json();
  const rows: any[] = data.data ?? data ?? [];

  // ✅ Normalise — backend may return location as POINT buffer,
  // ensure latitude/longitude are always plain numbers
  return rows.map(o => ({
    ...o,
    latitude:  o.latitude  != null ? String(o.latitude)  : '',
    longitude: o.longitude != null ? String(o.longitude) : '',
  }));
}

async function apiCreateOutlet(vendorId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      ...body,
      latitude:  parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create outlet');
  const outlet = data.data ?? data;
  // ✅ Normalise lat/lng back to strings for the form state
  return {
    ...outlet,
    latitude:  outlet.latitude  != null ? String(outlet.latitude)  : '',
    longitude: outlet.longitude != null ? String(outlet.longitude) : '',
  };
}

async function apiUpdateOutlet(vendorId: string, outletId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets/${outletId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      ...body,
      latitude:  parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update outlet');
  const outlet = data.data ?? data;
  // ✅ Normalise lat/lng back to strings for the form state
  return {
    ...outlet,
    latitude:  outlet.latitude  != null ? String(outlet.latitude)  : '',
    longitude: outlet.longitude != null ? String(outlet.longitude) : '',
  };
}

// Live, management-grade inventory for a single outlet (inventory_id,
// stock_status, needs_reorder, pricing — everything the storefront endpoint
// doesn't expose).
async function apiSetOutletActive(vendorId: string, outletId: string, isActive: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets/${outletId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_active: isActive }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update outlet status');
}

async function apiFetchOutletInventory(vendorId: string, outletId: string): Promise<any[]> {
  const res = await fetch(
    `${API_BASE}/v1/admin/vendors/${vendorId}/inventory?outlet_id=${outletId}&limit=200`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to fetch outlet inventory');
  const data = await res.json();
  return data.data ?? data ?? [];
}

async function apiAdjustStock(vendorId: string, inventoryId: number, quantityChange: number, reason: string): Promise<any> {
  const res = await fetch(
    `${API_BASE}/v1/admin/vendors/${vendorId}/inventory/${inventoryId}/adjust`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ quantity_change: quantityChange, reason }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');
  return data.data;
}

async function apiUpdateInventoryItem(vendorId: string, inventoryId: number, updates: Record<string, any>): Promise<any> {
  const res = await fetch(
    `${API_BASE}/v1/admin/vendors/${vendorId}/inventory/${inventoryId}`,
    { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update inventory item');
  return data.data;
}

async function apiAddInventoryItem(vendorId: string, body: {
  product_id: number; outlet_id: string; current_stock?: number; selling_price: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/inventory`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add product to outlet');
  return data.data;
}

// Platform-wide product catalog, used to pick a product to stock at an outlet.
async function apiSearchCatalogProducts(search: string): Promise<any[]> {
  const res = await fetch(
    `${API_BASE}/v1/products?search=${encodeURIComponent(search)}&limit=20`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to search products');
  const data = await res.json();
  return data.products ?? data.data ?? data ?? [];
}

async function apiFetchOutletOrders(vendorId: string, outletId: string, status?: string): Promise<any[]> {
  const qs = new URLSearchParams({ outlet_id: outletId, limit: '100' });
  if (status) qs.set('status', status);
  const res = await fetch(
    `${API_BASE}/v1/admin/vendors/${vendorId}/orders?${qs.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to fetch outlet orders');
  const data = await res.json();
  return data.data ?? data.orders ?? data ?? [];
}

async function apiFetchOrderDetails(vendorId: string, orderId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/orders/${orderId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch order details');
  return res.json();
}

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'canceled', 'refunded'];

async function apiUpdateOrderStatus(vendorId: string, orderId: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/orders/${orderId}/status`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update order status');
  return data;
}

function orderStatusBadgeClass(status: string) {
  switch (status) {
    case 'delivered':  return 'bg-emerald-50 text-emerald-700';
    case 'canceled':
    case 'refunded':   return 'bg-red-50 text-red-600';
    case 'pending':    return 'bg-amber-50 text-amber-700';
    case 'dispatched': return 'bg-blue-50 text-blue-700';
    default:           return 'bg-gray-100 text-gray-600';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyOutletForm = (): OutletFormData => ({
  outlet_name: '', outlet_code: '', latitude: '', longitude: '',
  address_line_1: '', address_line_2: '', city: '', county: '',
  postal_code: '', phone: '', email: '', opening_time: '', closing_time: '',
});

function statusBadge(active: boolean) {
  return active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200';
}

function verifiedBadge(verified: boolean) {
  return verified ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200';
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

// ─── AddVendorModal ───────────────────────────────────────────────────────────

function AddVendorModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (d: any) => Promise<void>; loading: boolean }) {
  const [form, setForm] = useState({ business_name: '', contact_person: '', business_email: '', business_phone: '', password: '', vendor_type: 'gas' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendor type</label>
            <div className="relative">
              <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={form.vendor_type}
                onChange={set('vendor_type')}
                disabled={loading}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all appearance-none"
              >
                <option value="gas">Gas vendor</option>
                <option value="general">General vendor</option>
              </select>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Gas vendors: pickup is free. General vendors: pickup has a flat KES 70 fee.</p>
          </div>
          {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={type} value={(form as any)[key]} onChange={set(key)} placeholder={placeholder}
                  disabled={loading}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${errors[key] ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-emerald-100 focus:border-emerald-400'}`}
                />
              </div>
              {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Add vendor</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── OutletForm ───────────────────────────────────────────────────────────────

function OutletForm({ initial, onSubmit, onCancel, loading }: {
  initial: OutletFormData;
  onSubmit: (d: OutletFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<OutletFormData>(initial);
  const [mapsLink, setMapsLink] = useState('');
  const [parseError, setParseError] = useState('');
  const [parseSuccess, setParseSuccess] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof OutletFormData, string>>>({});

  const set = (k: keyof OutletFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const handleParseLink = () => {
    setParseError(''); setParseSuccess('');
    const result = parseGoogleMapsLink(mapsLink);
    if (!result) {
      setParseError('Could not extract coordinates. Try a full Google Maps URL or paste "lat, lng" directly.');
      return;
    }
    setForm(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
    setParseSuccess(`Extracted: ${result.lat}, ${result.lng}`);
    setMapsLink('');
    setErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof OutletFormData, string>> = {};
    if (!form.outlet_name.trim()) e.outlet_name = 'Required';
    if (!form.outlet_code.trim()) e.outlet_code = 'Required';
    if (!form.latitude) e.latitude = 'Required';
    else if (isNaN(parseFloat(form.latitude))) e.latitude = 'Must be a number';
    if (!form.longitude) e.longitude = 'Required';
    else if (isNaN(parseFloat(form.longitude))) e.longitude = 'Must be a number';
    if (!form.address_line_1.trim()) e.address_line_1 = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.county.trim()) e.county = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const inputClass = (key: keyof OutletFormData) =>
    `w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
      errors[key] ? 'border-red-300 focus:ring-red-100' : parseSuccess && (key === 'latitude' || key === 'longitude') ? 'border-emerald-300 focus:ring-emerald-100' : 'border-gray-200 focus:ring-emerald-100 focus:border-emerald-400'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Maps link extractor */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-medium text-blue-700 mb-2.5 flex items-center gap-1.5">
          <MapPin size={13} /> Paste a Google Maps link to auto-fill coordinates
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={mapsLink}
            onChange={e => { setMapsLink(e.target.value); setParseError(''); setParseSuccess(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleParseLink(); } }}
            placeholder="https://maps.google.com/... or -1.2921, 36.8219"
            className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleParseLink}
            disabled={!mapsLink.trim() || loading}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Link size={13} /> Extract
          </button>
        </div>
        {parseError && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> {parseError}</p>}
        {parseSuccess && <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> {parseSuccess}</p>}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Outlet name <span className="text-red-400">*</span></label>
          <input value={form.outlet_name} onChange={set('outlet_name')} placeholder="e.g. Westlands Branch" disabled={loading} className={inputClass('outlet_name')} />
          {errors.outlet_name && <p className="text-xs text-red-500 mt-1">{errors.outlet_name}</p>}
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Outlet code <span className="text-red-400">*</span></label>
          <input value={form.outlet_code} onChange={set('outlet_code')} placeholder="e.g. WL-001" disabled={loading} className={inputClass('outlet_code')} />
          {errors.outlet_code && <p className="text-xs text-red-500 mt-1">{errors.outlet_code}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Latitude <span className="text-red-400">*</span></label>
          <input value={form.latitude} onChange={set('latitude')} placeholder="-1.2921" disabled={loading} className={inputClass('latitude')} />
          {errors.latitude && <p className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Longitude <span className="text-red-400">*</span></label>
          <input value={form.longitude} onChange={set('longitude')} placeholder="36.8219" disabled={loading} className={inputClass('longitude')} />
          {errors.longitude && <p className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address line 1 <span className="text-red-400">*</span></label>
          <input value={form.address_line_1} onChange={set('address_line_1')} placeholder="Street / building name" disabled={loading} className={inputClass('address_line_1')} />
          {errors.address_line_1 && <p className="text-xs text-red-500 mt-1">{errors.address_line_1}</p>}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address line 2</label>
          <input value={form.address_line_2} onChange={set('address_line_2')} placeholder="Floor, suite, etc. (optional)" disabled={loading} className={inputClass('address_line_2')} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">City <span className="text-red-400">*</span></label>
          <input value={form.city} onChange={set('city')} placeholder="Nairobi" disabled={loading} className={inputClass('city')} />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">County <span className="text-red-400">*</span></label>
          <input value={form.county} onChange={set('county')} placeholder="Nairobi" disabled={loading} className={inputClass('county')} />
          {errors.county && <p className="text-xs text-red-500 mt-1">{errors.county}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Postal code</label>
          <input value={form.postal_code} onChange={set('postal_code')} placeholder="00100" disabled={loading} className={inputClass('postal_code')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+254712345678" disabled={loading} className={inputClass('phone')} />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="outlet@example.com" disabled={loading} className={inputClass('email')} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Clock size={11} /> Opening time</label>
          <input type="time" value={form.opening_time} onChange={set('opening_time')} disabled={loading} className={inputClass('opening_time')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Clock size={11} /> Closing time</label>
          <input type="time" value={form.closing_time} onChange={set('closing_time')} disabled={loading} className={inputClass('closing_time')} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Save outlet'}
        </button>
      </div>
    </form>
  );
}

// ─── OutletCard ───────────────────────────────────────────────────────────────

function OutletCard({ outlet, vendorId, onEdit, onChanged }: {
  outlet: Outlet; vendorId: string; onEdit: () => void; onChanged: () => void;
}) {
  const mapsUrl = outlet.latitude && outlet.longitude
    ? `https://www.google.com/maps?q=${outlet.latitude},${outlet.longitude}`
    : null;

  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [inventory, setInventory] = useState<any[] | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingActive, setTogglingActive] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const loadInventory = useCallback(async () => {
    const inv = await apiFetchOutletInventory(vendorId, outlet.outlet_id);
    setInventory(inv);
  }, [outlet.outlet_id, vendorId]);

  const loadOrders = useCallback(async (status?: string) => {
    const ords = await apiFetchOutletOrders(vendorId, outlet.outlet_id, status || undefined);
    setOrders(ords);
  }, [outlet.outlet_id, vendorId]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setLoadError('');
    try {
      await Promise.all([loadInventory(), loadOrders(statusFilter)]);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load outlet data');
    } finally {
      setLoadingData(false);
    }
  }, [loadInventory, loadOrders, statusFilter]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && inventory === null && orders === null) loadData();
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    try {
      await apiSetOutletActive(vendorId, outlet.outlet_id, !outlet.is_active);
      onChanged();
    } catch {
      // onChanged() re-fetches from the server, so a failed toggle just
      // leaves the badge showing the true current state.
    } finally {
      setTogglingActive(false);
    }
  };

  const handleStatusFilterChange = async (status: string) => {
    setStatusFilter(status);
    setLoadingData(true);
    try {
      await loadOrders(status);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to filter orders');
    } finally {
      setLoadingData(false);
    }
  };

  const lowStockCount = inventory ? inventory.filter((i: any) => i.stock_status === 'low_stock' || i.stock_status === 'out_of_stock').length : 0;
  const revenue = orders ? orders
    .filter((o: any) => (o.order_status || o.status) === 'delivered')
    .reduce((sum: number, o: any) => sum + Number(o.total_amount ?? o.total ?? 0), 0) : 0;

  return (
    <div className={`bg-white border rounded-xl p-4 space-y-2.5 ${outlet.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/20'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{outlet.outlet_name}</p>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${outlet.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {outlet.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{outlet.outlet_code}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {mapsUrl && (
            <a
              href={mapsUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors"
            >
              <ExternalLink size={11} /> Map
            </a>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <Edit2 size={11} /> Edit
          </button>
          <button
            onClick={handleToggleActive}
            disabled={togglingActive}
            title={outlet.is_active ? 'Deactivate outlet' : 'Activate outlet'}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
              outlet.is_active
                ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100'
            } disabled:opacity-50`}
          >
            {togglingActive ? <RefreshCw size={11} className="animate-spin" /> : outlet.is_active ? <PowerOff size={11} /> : <Power size={11} />}
          </button>
        </div>
      </div>

      {(outlet.address_line_1 || outlet.city) && (
        <p className="text-xs text-gray-500 flex items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
          {[outlet.address_line_1, outlet.city, outlet.county].filter(Boolean).join(', ')}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {outlet.latitude && outlet.longitude && (
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
            {parseFloat(outlet.latitude).toFixed(5)}, {parseFloat(outlet.longitude).toFixed(5)}
          </span>
        )}
        {outlet.phone && (
          <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{outlet.phone}</span>
        )}
        {outlet.opening_time && outlet.closing_time && (
          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} />{outlet.opening_time} – {outlet.closing_time}</span>
        )}
      </div>

      {(inventory || orders) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {inventory && (
            <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <Package size={10} /> {inventory.length} product{inventory.length !== 1 ? 's' : ''}
            </span>
          )}
          {inventory && lowStockCount > 0 && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <AlertTriangle size={10} /> {lowStockCount} low/out of stock
            </span>
          )}
          {orders && (
            <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <ShoppingBag size={10} /> {orders.length} order{orders.length !== 1 ? 's' : ''}
            </span>
          )}
          {orders && revenue > 0 && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp size={10} /> KES {revenue.toLocaleString()} delivered
            </span>
          )}
        </div>
      )}

      <button
        onClick={toggleExpanded}
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 pt-1"
      >
        <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        {expanded ? 'Hide' : 'Manage'} products & orders
      </button>

      {expanded && (
        <div className="border-t border-gray-100 pt-3 mt-1">
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                tab === 'products' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Package size={12} /> Products {inventory ? `(${inventory.length})` : ''}
            </button>
            <button
              onClick={() => setTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                tab === 'orders' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag size={12} /> Orders {orders ? `(${orders.length})` : ''}
            </button>
            {tab === 'products' && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <PackagePlus size={12} /> Add product
              </button>
            )}
            {tab === 'orders' && (
              <select
                value={statusFilter}
                onChange={e => handleStatusFilterChange(e.target.value)}
                className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <button
              onClick={loadData}
              disabled={loadingData}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-xs gap-2">
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={12} /> {loadError}
            </div>
          ) : tab === 'products' ? (
            !inventory || inventory.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No products stocked at this outlet yet. Click "Add product" to stock one.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {inventory.map((item: any) => (
                  <InventoryRow
                    key={item.inventory_id}
                    item={item}
                    vendorId={vendorId}
                    onChanged={loadInventory}
                  />
                ))}
              </div>
            )
          ) : !orders || orders.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No orders for this outlet yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {orders.map((o: any) => (
                <OrderRow key={o.order_id} order={o} vendorId={vendorId} onChanged={() => loadOrders(statusFilter)} />
              ))}
            </div>
          )}
        </div>
      )}

      {showAddProduct && (
        <AddProductModal
          vendorId={vendorId}
          outletId={outlet.outlet_id}
          onClose={() => setShowAddProduct(false)}
          onAdded={() => { setShowAddProduct(false); loadInventory(); }}
        />
      )}
    </div>
  );
}

// ─── InventoryRow ───────────────────────────────────────────────────────────────

function InventoryRow({ item, vendorId, onChanged }: { item: any; vendorId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(item.selling_price ?? 0));
  const [error, setError] = useState('');

  const stockColor = item.stock_status === 'out_of_stock'
    ? 'text-red-600' : item.stock_status === 'low_stock' ? 'text-amber-600' : 'text-gray-500';

  const adjust = async (delta: number) => {
    setBusy(true);
    setError('');
    try {
      await apiAdjustStock(vendorId, item.inventory_id, delta, delta > 0 ? 'restock' : 'manual');
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setBusy(false);
    }
  };

  const savePrice = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) { setError('Invalid price'); return; }
    setBusy(true);
    setError('');
    try {
      await apiUpdateInventoryItem(vendorId, item.inventory_id, { selling_price: price });
      setEditingPrice(false);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update price');
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async () => {
    setBusy(true);
    setError('');
    try {
      await apiUpdateInventoryItem(vendorId, item.inventory_id, { is_available: !item.is_available });
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update availability');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{item.product_name}</p>
          <p className={`text-[11px] ${stockColor}`}>
            Stock: {item.current_stock}
            {item.stock_status === 'out_of_stock' && ' · Out of stock'}
            {item.stock_status === 'low_stock' && ' · Low stock'}
            {!item.is_available && <span className="text-red-500"> · Hidden</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Stock stepper */}
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg">
            <button onClick={() => adjust(-1)} disabled={busy || item.current_stock <= 0} className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-30">
              <Minus size={11} />
            </button>
            <button onClick={() => adjust(10)} disabled={busy} className="px-1 text-[10px] text-gray-500 hover:text-emerald-700" title="Restock +10">
              +10
            </button>
            <button onClick={() => adjust(1)} disabled={busy} className="p-1 text-gray-500 hover:text-emerald-700 disabled:opacity-30">
              <Plus size={11} />
            </button>
          </div>

          {/* Price */}
          {editingPrice ? (
            <div className="flex items-center gap-1">
              <input
                type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                autoFocus
              />
              <button onClick={savePrice} disabled={busy} className="p-1 text-emerald-700 hover:text-emerald-800"><Save size={12} /></button>
              <button onClick={() => { setEditingPrice(false); setPriceInput(String(item.selling_price ?? 0)); }} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingPrice(true)}
              className="text-xs font-semibold text-gray-700 hover:text-emerald-700 flex-shrink-0"
              title="Click to edit price"
            >
              KES {Number(item.selling_price ?? 0).toLocaleString()}
            </button>
          )}

          <button
            onClick={toggleAvailable}
            disabled={busy}
            title={item.is_available ? 'Hide from storefront' : 'Show on storefront'}
            className={`p-1 rounded ${item.is_available ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
          >
            <Eye size={12} />
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── AddProductModal ────────────────────────────────────────────────────────────

function AddProductModal({ vendorId, outletId, onClose, onAdded }: {
  vendorId: string; outletId: string; onClose: () => void; onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [stock, setStock] = useState('20');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await apiSearchCatalogProducts(query.trim());
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (p: any) => {
    setSelected(p);
    setPrice(String(p.base_price ?? p.price ?? ''));
  };

  const submit = async () => {
    if (!selected) return;
    const sellingPrice = parseFloat(price);
    const initialStock = parseInt(stock) || 0;
    if (isNaN(sellingPrice) || sellingPrice <= 0) { setError('Enter a valid selling price'); return; }
    setSaving(true);
    setError('');
    try {
      await apiAddInventoryItem(vendorId, {
        product_id: selected.product_id,
        outlet_id: outletId,
        current_stock: initialStock,
        selling_price: sellingPrice,
      });
      onAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md my-8 border border-gray-100 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Add product to outlet</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {!selected ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search the product catalog…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-2"><RefreshCw size={12} className="animate-spin" /> Searching…</div>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <p className="text-xs text-gray-400 py-2 text-center">No matching products found.</p>
              )}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {results.map((p: any) => (
                  <button
                    key={p.product_id}
                    onClick={() => pick(p)}
                    className="w-full flex items-center justify-between gap-2 bg-gray-50 hover:bg-emerald-50 rounded-lg px-3 py-2 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.product_name || p.name}</p>
                      <p className="text-[11px] text-gray-400">{p.brand || p.category_name || ''}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">KES {Number(p.base_price ?? p.price ?? 0).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-800">{selected.product_name || selected.name}</p>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Initial stock</label>
                  <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Selling price (KES)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={submit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <><RefreshCw size={13} className="animate-spin" /> Adding…</> : 'Add to outlet'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OrderRow ───────────────────────────────────────────────────────────────────

function OrderRow({ order, vendorId, onChanged }: { order: any; vendorId: string; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [status, setStatus] = useState(order.order_status || order.status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const data = await apiFetchOrderDetails(vendorId, order.order_id);
        setDetail(data.data ?? data);
      } catch (err: any) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const saveStatus = async () => {
    setUpdating(true);
    setError('');
    try {
      await apiUpdateOrderStatus(vendorId, order.order_id, status);
      onChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const items = detail?.order_items || detail?.items || [];

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
        <div className="min-w-0 flex items-center gap-1.5">
          <ChevronDown size={12} className={`text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">#{order.order_number || order.order_id}</p>
            <p className="text-[11px] text-gray-400">
              {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${orderStatusBadgeClass(order.order_status || order.status)}`}>
            {order.order_status || order.status}
          </span>
          <span className="text-xs font-semibold text-gray-700">
            KES {Number(order.total_amount ?? order.total ?? 0).toLocaleString()}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200/70 space-y-2.5">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2"><RefreshCw size={12} className="animate-spin" /> Loading…</div>
          ) : (
            <>
              {items.length > 0 && (
                <div className="space-y-1">
                  {items.map((it: any, idx: number) => (
                    <div key={it.item_id || idx} className="flex items-center justify-between text-[11px] text-gray-600">
                      <span className="truncate">{it.quantity}× {it.product_name}</span>
                      <span className="flex-shrink-0">KES {Number(it.total_price ?? (it.unit_price * it.quantity) ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {(detail?.delivery_address || order.delivery_address) && (
                <p className="text-[11px] text-gray-500 flex items-start gap-1">
                  <Truck size={11} className="mt-0.5 flex-shrink-0" /> {detail?.delivery_address || order.delivery_address}
                </p>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={saveStatus}
                  disabled={updating || status === (order.order_status || order.status)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  {updating ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />} Update
                </button>
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OutletsModal ─────────────────────────────────────────────────────────────

function OutletsModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoadingOutlets(true);
    try {
      const data = await apiFetchOutlets(vendor.vendor_id);
      setOutlets(Array.isArray(data) ? data : []);
    } catch {
      setOutlets([]);
    } finally {
      setLoadingOutlets(false);
    }
  }, [vendor.vendor_id]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: OutletFormData) => {
    setSaving(true);
    try {
      await apiCreateOutlet(vendor.vendor_id, form);
      showToast('Outlet added successfully', 'success');
      await load();
      setView('list');
    } catch (err: any) {
      showToast(err.message || 'Failed to add outlet', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: OutletFormData) => {
    if (!editingOutlet) return;
    setSaving(true);
    try {
      await apiUpdateOutlet(vendor.vendor_id, editingOutlet.outlet_id, form);
      showToast('Outlet updated', 'success');
      await load();
      setView('list');
      setEditingOutlet(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update outlet', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editInitial: OutletFormData = editingOutlet
    ? {
        outlet_name: editingOutlet.outlet_name || '',
        outlet_code: editingOutlet.outlet_code || '',
        latitude: String(editingOutlet.latitude || ''),
        longitude: String(editingOutlet.longitude || ''),
        address_line_1: editingOutlet.address_line_1 || '',
        address_line_2: editingOutlet.address_line_2 || '',
        city: editingOutlet.city || '',
        county: editingOutlet.county || '',
        postal_code: editingOutlet.postal_code || '',
        phone: editingOutlet.phone || '',
        email: editingOutlet.email || '',
        opening_time: editingOutlet.opening_time || '',
        closing_time: editingOutlet.closing_time || '',
      }
    : emptyOutletForm();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div
        className="bg-white rounded-2xl w-full max-w-xl my-4 border border-gray-100 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setEditingOutlet(null); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors mr-1"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {vendor.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {view === 'list' ? 'Outlets' : view === 'add' ? 'Add outlet' : 'Edit outlet'}
              </p>
              <p className="text-xs text-gray-400">{vendor.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('add')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <Plus size={13} /> Add outlet
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {view === 'list' && (
            <>
              {loadingOutlets ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <RefreshCw size={20} className="animate-spin mb-2" />
                  <span className="text-sm">Loading outlets…</span>
                </div>
              ) : outlets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <Store size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No outlets yet</p>
                  <p className="text-xs text-gray-400 mb-4">Add the first outlet for {vendor.business_name}</p>
                  <button
                    onClick={() => setView('add')}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    <Plus size={14} /> Add first outlet
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-1">{outlets.length} outlet{outlets.length !== 1 ? 's' : ''}</p>
                  {outlets.map(outlet => (
                    <OutletCard
                      key={outlet.outlet_id}
                      outlet={outlet}
                      vendorId={vendor.vendor_id}
                      onEdit={() => { setEditingOutlet(outlet); setView('edit'); }}
                      onChanged={load}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'add' && (
            <OutletForm
              initial={emptyOutletForm()}
              onSubmit={handleCreate}
              onCancel={() => setView('list')}
              loading={saving}
            />
          )}

          {view === 'edit' && editingOutlet && (
            <OutletForm
              initial={editInitial}
              onSubmit={handleUpdate}
              onCancel={() => { setView('list'); setEditingOutlet(null); }}
              loading={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VendorRow ────────────────────────────────────────────────────────────────

function VendorRow({ vendor, onSelect, onToggle, onApprove, onManageOutlets }: {
  vendor: Vendor;
  onSelect: () => void;
  onToggle: () => void;
  onApprove: () => void;
  onManageOutlets: () => void;
}) {
  const initials = vendor.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

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
          <button
            onClick={onManageOutlets}
            className="p-1.5 rounded-lg text-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
            title="Manage outlets"
          >
            <MapPin size={14} />
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
            className={`p-1.5 rounded-lg transition-colors ${vendor.is_active ? 'text-amber-400 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'}`}
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

function VendorDetail({ vendor, onBack, onUpdate, onManageOutlets, loading }: {
  vendor: Vendor;
  onBack: () => void;
  onUpdate: (d: any) => Promise<void>;
  onManageOutlets: () => void;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const buildForm = (v: Vendor) => ({
    business_name: v.business_name,
    contact_person: v.contact_person,
    business_phone: v.business_phone || '',
    business_email: v.business_email || '',
    trading_name: v.trading_name || '',
    vendor_type: v.vendor_type || 'gas',
  });
  const [form, setForm] = useState(buildForm(vendor));

  // `vendor` is only the *initial* value for useState above — it does not
  // resync on its own. Without this, saving an edit updates `vendor` via
  // the parent, but `form` keeps holding whatever it had on first mount.
  // The next time you open Edit and save, those stale fields get PUT back
  // to the server, silently reverting the previous change.
  useEffect(() => {
    setForm(buildForm(vendor));
  }, [vendor]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(form);
    setEditing(false);
  };

  const infoRows = [
    { label: 'Email', value: vendor.business_email, icon: Mail },
    { label: 'Phone', value: vendor.business_phone, icon: Phone },
    { label: 'Vendor type', value: vendor.vendor_type === 'general' ? 'General vendor' : 'Gas vendor', icon: Store },
    { label: 'Brand', value: vendor.brand || 'Independent', icon: Building2 },
    { label: 'Commission', value: `${((vendor.commission_rate ?? 0) * 100).toFixed(1)}%`, icon: TrendingUp },
    { label: 'Min order', value: `KES ${vendor.minimum_order_amount?.toLocaleString() ?? 0}`, icon: ShoppingBag },
    { label: 'Delivery radius', value: `${vendor.delivery_radius_km ?? 0} km`, icon: Layers },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-sm font-medium text-gray-900">{vendor.business_name}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-base font-semibold">
              {vendor.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
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
          <div className="flex items-center gap-2">
            <button
              onClick={onManageOutlets}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <MapPin size={14} /> Outlets
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${editing ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              <Edit2 size={14} /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendor type</label>
              <select
                value={form.vendor_type}
                onChange={set('vendor_type')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
              >
                <option value="gas">Gas vendor</option>
                <option value="general">General vendor</option>
              </select>
            </div>
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
                  value={(form as any)[key]} onChange={set(key)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
                />
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
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

// ─── Main VendorsPage ─────────────────────────────────────────────────────────

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, vendors: 0, riders: 0, orders: 0, todayRevenue: 0 });
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [outletVendor, setOutletVendor] = useState<Vendor | null>(null);
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
      const [statsRes, vendorsRes] = await Promise.all([getDashboardStats(), listVendors(1, 50)]);
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
      fetchAll();
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
    } catch {
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
      {/* Page toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
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
              onClick={fetchAll} disabled={loading}
              className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={16} /> Add vendor
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
            onManageOutlets={() => setOutletVendor(selectedVendor)}
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
              <p className="text-xs text-gray-400 ml-auto">{filtered.length} of {vendors.length}</p>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Actions</th>
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
                        onManageOutlets={() => setOutletVendor(vendor)}
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

      {/* Outlets modal */}
      {outletVendor && (
        <OutletsModal
          vendor={outletVendor}
          onClose={() => setOutletVendor(null)}
        />
      )}
    </div>
  );
};

export default VendorsPage;
