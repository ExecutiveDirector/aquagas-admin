import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Link,
  Store,
  Clock,
  Phone,
  Mail,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutletFormData {
  outlet_name: string;
  outlet_code: string;
  latitude: string;
  longitude: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  opening_time?: string;
  closing_time?: string;
}

export interface Outlet extends OutletFormData {
  outlet_id: string;
  vendor_id: string;
  is_active: boolean;
  created_at?: string;
}

interface AddOutletModalProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
  onOutletCreated?: () => void;
}

// ─── Maps link parser ─────────────────────────────────────────────────────────

function parseGoogleMapsLink(input: string): { lat: string; lng: string } | null {
  const text = input.trim();

  // Pattern 1: @lat,lng in URL
  const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const atMatch = text.match(atPattern);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

  // Pattern 2: ?q=lat,lng or &q=lat,lng
  const qPattern = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const qMatch = text.match(qPattern);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

  // Pattern 3: /place/lat,lng
  const placePattern = /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
  const placeMatch = text.match(placePattern);
  if (placeMatch) return { lat: placeMatch[1], lng: placeMatch[2] };

  // Pattern 4: ll=lat,lng
  const llPattern = /ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const llMatch = text.match(llPattern);
  if (llMatch) return { lat: llMatch[1], lng: llMatch[2] };

  // Pattern 5: !3d lat !4d lng (embedded coords)
  const d3Pattern = /!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/;
  const d3Match = text.match(d3Pattern);
  if (d3Match) return { lat: d3Match[1], lng: d3Match[2] };

  // Pattern 6: bare "lat, lng" or "lat,lng"
  const barePattern = /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/;
  const bareMatch = text.match(barePattern);
  if (bareMatch) return { lat: bareMatch[1], lng: bareMatch[2] };

  return null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

function authHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchOutlets(vendorId: string): Promise<Outlet[]> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch outlets');
  const data = await res.json();
  return data.data ?? data ?? [];
}

async function createOutlet(vendorId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      ...body,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create outlet');
  return data.data ?? data;
}

async function updateOutlet(vendorId: string, outletId: string, body: OutletFormData): Promise<Outlet> {
  const res = await fetch(`${API_BASE}/v1/admin/vendors/${vendorId}/outlets/${outletId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      ...body,
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update outlet');
  return data.data ?? data;
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = (): OutletFormData => ({
  outlet_name: '',
  outlet_code: '',
  latitude: '',
  longitude: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  county: '',
  postal_code: '',
  phone: '',
  email: '',
  opening_time: '',
  closing_time: '',
});

// ─── Outlet form ──────────────────────────────────────────────────────────────

function OutletForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial: OutletFormData;
  onSubmit: (d: OutletFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<OutletFormData>(initial);
  const [mapsLink, setMapsLink] = useState('');
  const [parseError, setParseError] = useState('');
  const [parseSuccess, setParseSuccess] = useState('');
  const [errors, setErrors] = useState<Partial<OutletFormData>>({});

  const set = (k: keyof OutletFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const handleParseMapsLink = () => {
    setParseError('');
    setParseSuccess('');
    const result = parseGoogleMapsLink(mapsLink);
    if (!result) {
      setParseError('Could not extract coordinates. Try a full Google Maps URL or paste "lat, lng" directly.');
      return;
    }
    setForm(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
    setParseSuccess(`Extracted: ${result.lat}, ${result.lng}`);
    setMapsLink('');
    if (errors.latitude || errors.longitude) {
      setErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
    }
  };

  const validate = () => {
    const e: Partial<OutletFormData> = {};
    if (!form.outlet_name.trim()) e.outlet_name = 'Required';
    if (!form.outlet_code.trim()) e.outlet_code = 'Required';
    if (!form.latitude) {
      e.latitude = 'Required';
    } else if (isNaN(parseFloat(form.latitude))) {
      e.latitude = 'Must be a number';
    }
    if (!form.longitude) {
      e.longitude = 'Required';
    } else if (isNaN(parseFloat(form.longitude))) {
      e.longitude = 'Must be a number';
    }
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

  const field = (
    label: string,
    key: keyof OutletFormData,
    opts?: { placeholder?: string; type?: string; required?: boolean; half?: boolean }
  ) => (
    <div style={{ gridColumn: opts?.half ? 'span 1' : 'span 2' }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        {label} {opts?.required && <span style={{ color: 'var(--color-text-danger)' }}>*</span>}
      </label>
      <input
        type={opts?.type ?? 'text'}
        value={(form[key] as string) || ''}
        onChange={set(key)}
        placeholder={opts?.placeholder}
        disabled={loading}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: errors[key]
            ? '1px solid var(--color-border-danger)'
            : '0.5px solid var(--color-border-secondary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '8px 10px',
          fontSize: 13,
          background: 'var(--color-background-primary)',
          color: 'var(--color-text-primary)',
          outline: 'none',
        }}
      />
      {errors[key] && (
        <p style={{ fontSize: 11, color: 'var(--color-text-danger)', margin: '3px 0 0' }}>{errors[key]}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {/* Maps link parser */}
      <div
        style={{
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '12px 14px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 8px', fontWeight: 500 }}>
          <i className="ti ti-brand-google-maps" aria-hidden style={{ marginRight: 5, verticalAlign: -1 }} />
          Paste a Google Maps link to auto-fill coordinates
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={mapsLink}
            onChange={e => { setMapsLink(e.target.value); setParseError(''); setParseSuccess(''); }}
            placeholder="https://maps.google.com/... or -1.2921, 36.8219"
            disabled={loading}
            style={{
              flex: 1,
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '7px 10px',
              fontSize: 13,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleParseMapsLink(); } }}
          />
          <button
            type="button"
            onClick={handleParseMapsLink}
            disabled={!mapsLink.trim() || loading}
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              cursor: mapsLink.trim() ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <i className="ti ti-location-pin" aria-hidden style={{ fontSize: 14 }} />
            Extract
          </button>
        </div>
        {parseError && (
          <p style={{ fontSize: 11, color: 'var(--color-text-danger)', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 13 }} aria-hidden />
            {parseError}
          </p>
        )}
        {parseSuccess && (
          <p style={{ fontSize: 11, color: 'var(--color-text-success)', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden />
            {parseSuccess}
          </p>
        )}
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
        {field('Outlet name', 'outlet_name', { placeholder: 'e.g. Westlands Branch', required: true })}
        {field('Outlet code', 'outlet_code', { placeholder: 'e.g. WL-001', required: true })}
        
        {/* Lat/lng */}
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Latitude <span style={{ color: 'var(--color-text-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={form.latitude}
            onChange={set('latitude')}
            placeholder="-1.2921"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: errors.latitude
                ? '1px solid var(--color-border-danger)'
                : parseSuccess
                ? '1px solid var(--color-border-success)'
                : '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '8px 10px',
              fontSize: 13,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {errors.latitude && (
            <p style={{ fontSize: 11, color: 'var(--color-text-danger)', margin: '3px 0 0' }}>{errors.latitude}</p>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Longitude <span style={{ color: 'var(--color-text-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={form.longitude}
            onChange={set('longitude')}
            placeholder="36.8219"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: errors.longitude
                ? '1px solid var(--color-border-danger)'
                : parseSuccess
                ? '1px solid var(--color-border-success)'
                : '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '8px 10px',
              fontSize: 13,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {errors.longitude && (
            <p style={{ fontSize: 11, color: 'var(--color-text-danger)', margin: '3px 0 0' }}>{errors.longitude}</p>
          )}
        </div>

        {field('Address line 1', 'address_line_1', { placeholder: 'Street / building name', required: true })}
        {field('Address line 2', 'address_line_2', { placeholder: 'Floor, suite, etc. (optional)' })}
        {field('City', 'city', { placeholder: 'e.g. Nairobi', required: true, half: true })}
        {field('County', 'county', { placeholder: 'e.g. Nairobi', required: true, half: true })}
        {field('Postal code', 'postal_code', { placeholder: '00100', half: true })}
        {field('Phone', 'phone', { placeholder: '+254712345678', type: 'tel', half: true })}
        {field('Email', 'email', { placeholder: 'outlet@example.com', type: 'email', half: true })}

        {/* Hours */}
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Opening time
          </label>
          <input
            type="time"
            value={form.opening_time || ''}
            onChange={set('opening_time')}
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '8px 10px',
              fontSize: 13,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Closing time
          </label>
          <input
            type="time"
            value={form.closing_time || ''}
            onChange={set('closing_time')}
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '8px 10px',
              fontSize: 13,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 'var(--border-radius-md)',
            border: 'none',
            background: '#059669',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading && <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? 'Saving…' : 'Save outlet'}
        </button>
      </div>
    </form>
  );
}

// ─── Outlet card ──────────────────────────────────────────────────────────────

function OutletCard({
  outlet,
  onEdit,
}: {
  outlet: Outlet;
  onEdit: () => void;
}) {
  const mapsUrl = outlet.latitude && outlet.longitude
    ? `https://www.google.com/maps?q=${outlet.latitude},${outlet.longitude}`
    : null;

  return (
    <div
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-md)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)' }}>
            {outlet.outlet_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {outlet.outlet_code}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
              }}
              title="View on Google Maps"
            >
              <ExternalLink size={12} />
              Map
            </a>
          )}
          <button
            onClick={onEdit}
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-tertiary)',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Edit2 size={12} />
            Edit
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(outlet.address_line_1 || outlet.city) && (
          <span style={{ fontSize: