// src/pages/riders/RidersPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, AlertCircle, Star, MapPin,
  Phone, CheckCircle2, X, MoreHorizontal, Loader2,
  Bike, Package, Clock, ShieldCheck, TrendingUp,
} from "lucide-react";
import { listRiders, getRiderById, updateRiderStatus, verifyRider } from "../../services/adminService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rider {
  rider_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_available?: boolean;
  is_verified: boolean;
  rating?: number;
  total_deliveries?: number;
  active_orders?: number;
  total_earnings?: number;
  vehicle_type?: string;
  vehicle_plate?: string;
  location?: string;
  created_at: string;
  avatar_url?: string;
}

function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "lg" }) {
  const initials = name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const dim = size === "lg" ? "w-16 h-16 text-lg" : "w-9 h-9 text-xs";
  if (url) return <img src={url} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800`} />;
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white dark:ring-gray-800`}>
      {initials}
    </div>
  );
}

function StarRating({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star size={12} className={rating >= 1 ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"} />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{rating ? rating.toFixed(1) : "—"}</span>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function RiderDetailPanel({ riderId, onClose, onUpdate }: { riderId: string; onClose: () => void; onUpdate: () => void }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getRiderById(riderId)
      .then(data => setRider(data as Rider))
      .catch(e => setError(e?.message ?? "Failed to load rider"))
      .finally(() => setLoading(false));
  }, [riderId]);

  const toggleActive = async () => {
    if (!rider) return;
    setActionLoading(true); setError(null);
    try {
      await updateRiderStatus(riderId, !rider.is_active);
      setRider({ ...rider, is_active: !rider.is_active });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed"); }
    finally { setActionLoading(false); }
  };

  const toggleVerified = async () => {
    if (!rider) return;
    setActionLoading(true); setError(null);
    try {
      await verifyRider(riderId, !rider.is_verified);
      setRider({ ...rider, is_verified: !rider.is_verified });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed"); }
    finally { setActionLoading(false); }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Rider Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : !rider ? (
            <div className="p-6 text-center text-sm text-gray-400">{error ?? "Rider not found"}</div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar name={rider.full_name} url={rider.avatar_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">{rider.full_name}</h3>
                  <StarRating rating={rider.rating} />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rider.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>{rider.is_active ? "Active" : "Inactive"}</span>
                    {rider.is_available && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Clock size={9} /> Available
                      </span>
                    )}
                    {rider.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                        <ShieldCheck size={10} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Package, label: "Deliveries", value: rider.total_deliveries ?? 0 },
                  { icon: Clock, label: "Active", value: rider.active_orders ?? 0 },
                  { icon: TrendingUp, label: "Earnings (K)", value: ((rider.total_earnings ?? 0) / 1000).toFixed(0) + "K" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                    <Icon size={14} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Info */}
              <section>
                <InfoRow icon={Phone} label="Phone" value={rider.phone} />
                <InfoRow icon={MapPin} label="Location" value={rider.location} />
                <InfoRow icon={Bike} label="Vehicle" value={rider.vehicle_type} />
                <InfoRow icon={ShieldCheck} label="Plate No." value={rider.vehicle_plate} />
              </section>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              {/* Actions */}
              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</h4>
                <button
                  onClick={toggleVerified}
                  disabled={actionLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    rider.is_verified
                      ? "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      : "bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:hover:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
                  }`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                  {rider.is_verified ? "Revoke Verification" : "Verify Rider"}
                </button>
                <button
                  onClick={toggleActive}
                  disabled={actionLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    rider.is_active
                      ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Bike size={15} />}
                  {rider.is_active ? "Deactivate Rider" : "Activate Rider"}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRiders = useCallback(async (pg = 1, q = search, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await listRiders(pg, 20, { search: q || undefined, is_active: st === "" ? undefined : st === "active" });
      setRiders((res.data as Rider[]) ?? []);
      setTotal(res.pagination?.total ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setPage(pg);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load riders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchRiders(1); }, []); // eslint-disable-line

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchRiders(1, search, statusFilter), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, statusFilter]); // eslint-disable-line

  const verified = riders.filter(r => r.is_verified).length;
  const available = riders.filter(r => r.is_available).length;
  const avgRating = riders.length
    ? (riders.reduce((a, r) => a + (r.rating ?? 0), 0) / riders.length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riders</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} registered riders</p>
          </div>
          <button
            onClick={() => fetchRiders(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: total,     icon: Bike,         color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Verified",  value: verified,  icon: ShieldCheck,  color: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-900/20" },
            { label: "Available", value: available, icon: Clock,        color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Avg Rating",value: avgRating, icon: Star,         color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-900/20" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
            <button onClick={() => fetchRiders(page)} className="ml-auto font-medium hover:underline">Retry</button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
                <tr>
                  {["Rider", "Contact", "Vehicle", "Rating", "Deliveries", "Earnings", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {loading && riders.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[1,2,3,4,5,6,7,8].map(j => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : riders.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No riders found</td></tr>
                  : riders.map(rider => (
                      <tr key={rider.rider_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={rider.full_name} url={rider.avatar_url} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{rider.full_name}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(rider.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{rider.phone ?? "—"}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">{rider.vehicle_type ?? "—"}</p>
                          <p className="text-xs text-gray-400">{rider.vehicle_plate ?? ""}</p>
                        </td>
                        <td className="px-4 py-3"><StarRating rating={rider.rating} /></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{rider.total_deliveries ?? 0}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          KES {(rider.total_earnings ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              rider.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}>{rider.is_active ? "Active" : "Inactive"}</span>
                            {rider.is_available && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                Available
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedId(rider.rider_id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400">Page {page} of {totalPages} ({total.toLocaleString()} riders)</span>
              <div className="flex gap-2">
                <button onClick={() => fetchRiders(page - 1)} disabled={page <= 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Previous
                </button>
                <button onClick={() => fetchRiders(page + 1)} disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        <RiderDetailPanel
          riderId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => fetchRiders(page)}
        />
      )}
    </div>
  );
}