// src/pages/vendors/VendorsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, AlertCircle, Star, MapPin,
  Phone, Mail, Store, CheckCircle2, Clock, X,
  MoreHorizontal, Loader2, TrendingUp, ShoppingBag,
} from "lucide-react";
import { listVendors, getVendorById, updateVendorStatus, verifyVendor } from "../../services/adminService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  vendor_id: string;
  business_name: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  category?: string;
  address?: string;
  is_active: boolean;
  is_verified: boolean;
  rating?: number;
  total_orders?: number;
  total_revenue?: number;
  logo_url?: string;
  created_at: string;
  description?: string;
  opening_time?: string;
  closing_time?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  gas:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  water:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  food:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  grocery: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function CategoryBadge({ category }: { category?: string }) {
  const cls = CATEGORY_COLORS[category?.toLowerCase() ?? ""] ?? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {category ?? "Other"}
    </span>
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

function VendorLogo({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "lg" }) {
  const initials = name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const dim = size === "lg" ? "w-16 h-16 text-lg" : "w-9 h-9 text-xs";
  if (url) return <img src={url} alt={name} className={`${dim} rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700`} />;
  return (
    <div className={`${dim} rounded-xl bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function VendorDetailPanel({ vendorId, onClose, onUpdate }: { vendorId: string; onClose: () => void; onUpdate: () => void }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getVendorById(vendorId)
      .then(data => setVendor(data as Vendor))
      .catch(e => setError(e?.message ?? "Failed to load vendor"))
      .finally(() => setLoading(false));
  }, [vendorId]);

  const toggleActive = async () => {
    if (!vendor) return;
    setActionLoading(true); setError(null);
    try {
      await updateVendorStatus(vendorId, !vendor.is_active);
      setVendor({ ...vendor, is_active: !vendor.is_active });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed to update status"); }
    finally { setActionLoading(false); }
  };

  const toggleVerified = async () => {
    if (!vendor) return;
    setActionLoading(true); setError(null);
    try {
      await verifyVendor(vendorId, !vendor.is_verified);
      setVendor({ ...vendor, is_verified: !vendor.is_verified });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed to update verification"); }
    finally { setActionLoading(false); }
  };

  const Row = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
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
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Vendor Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : !vendor ? (
            <div className="p-6 text-center text-sm text-gray-400">{error ?? "Vendor not found"}</div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <VendorLogo name={vendor.business_name} url={vendor.logo_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">{vendor.business_name}</h3>
                  <p className="text-sm text-gray-400">{vendor.owner_name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <CategoryBadge category={vendor.category} />
                    <StarRating rating={vendor.rating} />
                    {vendor.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <ShoppingBag size={13} className="text-indigo-400" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{vendor.total_orders ?? 0}</p>
                  </div>
                  <p className="text-xs text-gray-400">Total Orders</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp size={13} className="text-emerald-400" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {(vendor.total_revenue ?? 0) >= 1000
                        ? `${((vendor.total_revenue ?? 0) / 1000).toFixed(0)}K`
                        : (vendor.total_revenue ?? 0)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">Revenue (KES)</p>
                </div>
              </div>

              {vendor.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{vendor.description}</p>
              )}

              {/* Info */}
              <section>
                <Row icon={Mail}  label="Email"   value={vendor.email} />
                <Row icon={Phone} label="Phone"   value={vendor.phone} />
                <Row icon={MapPin} label="Address" value={vendor.address} />
                {(vendor.opening_time || vendor.closing_time) && (
                  <Row icon={Clock} label="Hours" value={`${vendor.opening_time ?? "?"} — ${vendor.closing_time ?? "?"}`} />
                )}
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
                    vendor.is_verified
                      ? "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                      : "bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:hover:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
                  }`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {vendor.is_verified ? "Revoke Verification" : "Verify Vendor"}
                </button>
                <button
                  onClick={toggleActive}
                  disabled={actionLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    vendor.is_active
                      ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Store size={15} />}
                  {vendor.is_active ? "Deactivate Vendor" : "Activate Vendor"}
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

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVendors = useCallback(async (pg = 1, q = search, cat = categoryFilter, st = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await listVendors(pg, 20, { search: q || undefined, category: cat || undefined, is_active: st === "" ? undefined : st === "active" });
      setVendors((res.data as Vendor[]) ?? []);
      setTotal(res.pagination?.total ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setPage(pg);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => { fetchVendors(1); }, []); // eslint-disable-line

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchVendors(1, search, categoryFilter, statusFilter), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, categoryFilter, statusFilter]); // eslint-disable-line

  const verified = vendors.filter(v => v.is_verified).length;
  const active = vendors.filter(v => v.is_active).length;
  const avgRating = vendors.length ? (vendors.reduce((a, v) => a + (v.rating ?? 0), 0) / vendors.length).toFixed(1) : "—";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} registered vendors</p>
          </div>
          <button
            onClick={() => fetchVendors(page)}
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
            { label: "Total",    value: total,   icon: Store,         color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
            { label: "Active",   value: active,  icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Verified", value: verified, icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/20" },
            { label: "Avg Rating", value: avgRating, icon: Star,      color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
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
              placeholder="Search by business name or owner…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors"
          >
            <option value="">All Categories</option>
            <option value="gas">Gas</option>
            <option value="water">Water</option>
            <option value="food">Food</option>
            <option value="grocery">Grocery</option>
          </select>
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
            <button onClick={() => fetchVendors(page)} className="ml-auto font-medium hover:underline">Retry</button>
          </div>
        )}

        {/* Grid / Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
                <tr>
                  {["Vendor", "Category", "Contact", "Rating", "Orders", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {loading && vendors.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[1,2,3,4,5,6,7].map(j => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : vendors.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No vendors found</td></tr>
                  : vendors.map(vendor => (
                      <tr key={vendor.vendor_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <VendorLogo name={vendor.business_name} url={vendor.logo_url} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{vendor.business_name}</p>
                              <p className="text-xs text-gray-400 truncate">{vendor.owner_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><CategoryBadge category={vendor.category} /></td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{vendor.phone ?? "—"}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[120px]">{vendor.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-3"><StarRating rating={vendor.rating} /></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{vendor.total_orders ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              vendor.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}>
                              {vendor.is_active ? "Active" : "Inactive"}
                            </span>
                            {vendor.is_verified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                                <CheckCircle2 size={9} /> Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedId(vendor.vendor_id)}
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
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => fetchVendors(page - 1)} disabled={page <= 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Previous
                </button>
                <button onClick={() => fetchVendors(page + 1)} disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        <VendorDetailPanel
          vendorId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => fetchVendors(page)}
        />
      )}
    </div>
  );
}