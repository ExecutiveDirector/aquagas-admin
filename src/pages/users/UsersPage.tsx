// src/pages/users/UsersPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, RefreshCw, AlertCircle, ChevronDown, ChevronUp,
  UserCheck, UserX, Shield, MoreHorizontal, Phone, Mail,
  Calendar, MapPin, X, Loader2, User
} from "lucide-react";
import { listUsers, getUserById, updateUserStatus, updateUserRole } from "../../services/adminService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserItem {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  location?: string;
  total_orders?: number;
  total_spent?: number;
  avatar_url?: string;
}

const ROLES = ["user", "vendor", "rider", "admin"];

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  user:   { label: "Customer",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  vendor: { label: "Vendor",    cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  rider:  { label: "Rider",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  admin:  { label: "Admin",     cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role?.toLowerCase()] ?? { label: role, cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "lg" }) {
  const initials = name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const dim = size === "lg" ? "w-16 h-16 text-lg" : "w-8 h-8 text-xs";
  if (url) return <img src={url} alt={name} className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800`} />;
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white dark:ring-gray-800`}>
      {initials}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function UserDetailPanel({ userId, onClose, onUpdate }: { userId: string; onClose: () => void; onUpdate: () => void }) {
  const [user, setUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    setLoading(true);
    getUserById(userId)
      .then((data) => { setUser(data as UserItem); setNewRole((data as UserItem).role); })
      .catch((e) => setError(e?.message ?? "Failed to load user"))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleStatus = async () => {
    if (!user) return;
    setActionLoading(true); setError(null);
    try {
      await updateUserStatus(userId, !user.is_active);
      setUser({ ...user, is_active: !user.is_active });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed to update status"); }
    finally { setActionLoading(false); }
  };

  const handleRoleChange = async () => {
    if (!user || newRole === user.role) return;
    setActionLoading(true); setError(null);
    try {
      await updateUserRole(userId, newRole);
      setUser({ ...user, role: newRole });
      onUpdate();
    } catch (e: any) { setError(e?.message ?? "Failed to update role"); }
    finally { setActionLoading(false); }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{value ?? "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">User Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : !user ? (
            <div className="p-6 text-center text-sm text-gray-400">{error ?? "User not found"}</div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <Avatar name={user.full_name} url={user.avatar_url} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white">{user.full_name}</h3>
                  <p className="text-sm text-gray-400 truncate">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <RoleBadge role={user.role} />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                    {user.is_verified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {(user.total_orders !== undefined || user.total_spent !== undefined) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{user.total_orders ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Orders</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      KES {(user.total_spent ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Spent</p>
                  </div>
                </div>
              )}

              {/* Info */}
              <section>
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow icon={Phone} label="Phone" value={user.phone} />
                <InfoRow icon={MapPin} label="Location" value={user.location} />
                <InfoRow icon={Calendar} label="Joined" value={new Date(user.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })} />
              </section>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              {/* Change Role */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Change Role</h4>
                <div className="flex gap-2">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    disabled={actionLoading}
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 disabled:opacity-50 transition-colors"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>)}
                  </select>
                  <button
                    onClick={handleRoleChange}
                    disabled={actionLoading || newRole === user.role}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </section>

              {/* Toggle Status */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Account Status</h4>
                <button
                  onClick={toggleStatus}
                  disabled={actionLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    user.is_active
                      ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {actionLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : user.is_active
                    ? <><UserX size={15} /> Deactivate Account</>
                    : <><UserCheck size={15} /> Activate Account</>
                  }
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

type SortKey = "full_name" | "created_at" | "role";

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (pg = 1, q = search, role = roleFilter, status = statusFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await listUsers(pg, 20, { search: q || undefined, role: role || undefined, is_active: status === "" ? undefined : status === "active" });
      setUsers((res.data as UserItem[]) ?? []);
      setTotal(res.pagination?.total ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setPage(pg);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(1); }, []); // eslint-disable-line

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchUsers(1, search, roleFilter, statusFilter), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, roleFilter, statusFilter]); // eslint-disable-line

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...users].sort((a, b) => {
    let av: any = a[sortKey]; let bv: any = b[sortKey];
    if (sortKey === "created_at") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
    return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
  });

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-[11px] font-medium text-gray-400 uppercase tracking-wide hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
    >
      {label}
      {sortKey === col
        ? (sortDir === "asc" ? <ChevronUp size={11} className="text-indigo-500" /> : <ChevronDown size={11} className="text-indigo-500" />)
        : <ChevronDown size={11} className="text-gray-300" />}
    </button>
  );

  // Summary counts
  const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} registered accounts</p>
          </div>
          <button
            onClick={() => fetchUsers(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Customers", count: roleCounts.user ?? 0, icon: User, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Vendors",   count: roleCounts.vendor ?? 0, icon: Shield, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
            { label: "Riders",    count: roleCounts.rider ?? 0, icon: UserCheck, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Active",    count: activeCount, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          ].map(({ label, count, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
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
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 transition-colors"
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>)}
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
            <button onClick={() => fetchUsers(page)} className="ml-auto font-medium hover:underline">Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-left"><SortBtn col="full_name" label="User" /></th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-left"><SortBtn col="role" label="Role" /></th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left"><SortBtn col="created_at" label="Joined" /></th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {loading && users.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[60, 80, 40, 40, 60, 20].map((w, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className={`h-4 bg-gray-100 dark:bg-gray-700 rounded w-${w}`} style={{ width: w * 1.5 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : sorted.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No users found</td></tr>
                  : sorted.map(user => (
                      <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.full_name} url={user.avatar_url} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.full_name}</p>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Phone size={11} /> {user.phone ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedUserId(user.user_id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="View user"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400">Page {page} of {totalPages} ({total.toLocaleString()} users)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUsers(page - 1)}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchUsers(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdate={() => fetchUsers(page)}
        />
      )}
    </div>
  );
}