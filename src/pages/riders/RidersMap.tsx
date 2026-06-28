// src/pages/riders/RidersMap.tsx
//
// Live rider location map, backed by GET /v1/admin/riders/locations
// (riderController.getRiderLocations). rider_locations is genuinely empty
// in production right now — a rider only gets a row there once their app
// starts calling its own location-reporting endpoint — so an empty map
// with the "no riders reporting location yet" message is the accurate,
// correct state today, not a bug.
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, MapPin } from 'lucide-react';
import { getAllRiderLocations } from '../../services/riderService';

export interface RiderLocationPoint {
  rider_id: string;
  rider_name: string;
  vehicle_type: string;
  current_status: string;
  latitude: number;
  longitude: number;
  heading_degrees: number | null;
  speed_kmh: number | null;
  recorded_at: string;
}

// Default centre: Nairobi CBD — matches the same fallback used in the
// vendor app's own tracking screen, for visual consistency across the
// platform when there's nothing real to centre on yet.
const NAIROBI: [number, number] = [-1.2921, 36.8219];

const STATUS_COLOR: Record<string, string> = {
  available: '#16a34a',
  busy: '#d97706',
  on_delivery: '#d97706',
  on_break: '#2563eb',
  offline: '#6b7280',
};

function buildIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface Props {
  onViewRider?: (riderId: string) => void;
}

export default function RidersMap({ onViewRider }: Props) {
  const [points, setPoints] = useState<RiderLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllRiderLocations();
      setPoints(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load rider locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Light polling so the map reflects new pings without a full page
    // reload — 20s is frequent enough to feel "live" without hammering
    // the endpoint.
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {points.length} rider{points.length !== 1 ? 's' : ''} currently reporting location
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 480 }}>
        <MapContainer center={NAIROBI} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => (
            <Marker
              key={p.rider_id}
              position={[p.latitude, p.longitude]}
              icon={buildIcon(STATUS_COLOR[p.current_status] || STATUS_COLOR.offline)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.rider_name}</p>
                  <p className="text-gray-500 capitalize">{p.vehicle_type?.replace(/_/g, ' ')} • {p.current_status.replace(/_/g, ' ')}</p>
                  {p.speed_kmh != null && <p className="text-gray-500">{p.speed_kmh.toFixed(0)} km/h</p>}
                  <p className="text-gray-400 text-xs mt-1">Updated {new Date(p.recorded_at).toLocaleTimeString()}</p>
                  {onViewRider && (
                    <button
                      onClick={() => onViewRider(p.rider_id)}
                      className="mt-2 text-blue-600 hover:underline text-xs font-medium"
                    >
                      View rider →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!loading && points.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
          <MapPin className="w-8 h-8" />
          <p className="text-sm">No riders are currently reporting their location.</p>
          <p className="text-xs text-gray-300 max-w-sm text-center">
            Locations appear here once a rider's app starts sending position updates during an active shift.
          </p>
        </div>
      )}

      {points.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 px-1">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {status.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
