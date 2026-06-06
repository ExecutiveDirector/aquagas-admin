import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, AlertCircle, RefreshCw, Store, CheckCircle2,
  XCircle, ChevronRight, ArrowLeft, BarChart2, Package,
  ShoppingBag, TrendingUp, Users, Eye, Edit2, Power,
  PowerOff, X, Building2, Mail, Phone, Lock, User, Layers,
  MapPin, Link, Clock, ExternalLink,
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
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch outlets');
  const data = await res.json();
  return data.data ?? data ?? [];
}

async function apiCreateOutlet(vendorId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ ...body, latitude: parseFloat(body.latitude), longitude: parseFloat(body.longitude) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create outlet');
  return data.data ?? data;
}

async function apiUpdateOutlet(vendorId: string, outletId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets/${outletId}`, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({ ...body, latitude: parseFloat(body.latitude), longitude: parseFloat(body.longitude) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update outlet');
  return data.data ?? data;
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
  const [form, setForm] = useState({ business_name: '', contact_person: '', business_email: '', business_phone: '', password: '' });
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

function OutletCard({ outlet, onEdit }: { outlet: Outlet; onEdit: () => void }) {
  const mapsUrl = outlet.latitude && outlet.longitude
    ? `https://www.google.com/maps?q=${outlet.latitude},${outlet.longitude}`
    : null;

  return (
    <div className="bg-white bord