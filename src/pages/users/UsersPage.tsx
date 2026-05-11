import React, { useEffect, useMemo, useState } from "react";
import { Users, UserCheck, UserX, ShieldCheck, RefreshCw, Plus } from "lucide-react";
import type { UpdateUserData, User } from "../../types";

import UserModal        from "./components/UserModal";
import UserDetailsModal from "./components/UserDetailsModal";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import UserTable        from "./components/UserTable";
import ExportButton     from "./components/ExportButton";

import toast from "react-hot-toast";
import {
  listUsers, createUser, updateUser,
  deleteUser, toggleUserStatus,
} from "../../services/userService";

/* ─── helper ─────────────────────────────────── */
const getFullName = (u: User) => {
  if (u.fullName) return u.fullName;
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
};

/* ─── stat card ──────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number; icon: React.ElementType;
  color: "indigo" | "emerald" | "rose" | "violet"; sub?: string;
}) {
  const palette = {
    indigo:  { bg: "bg-indigo-50",  icon: "bg-indigo-100 text-indigo-600",  val: "text-indigo-700"  },
    emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", val: "text-emerald-700" },
    rose:    { bg: "bg-rose-50",    icon: "bg-rose-100 text-rose-600",       val: "text-rose-700"    },
    violet:  { bg: "bg-violet-50",  icon: "bg-violet-100 text-violet-600",   val: "text-violet-700"  },
  }[color];

  return (
    <div className={`rounded-2xl p-5 ${palette.bg} border border-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
          <p className={`text-3xl font-black ${palette.val} leading-none`}>{value.toLocaleString()}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>}
        </div>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${palette.icon}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   USERS PAGE
   ═══════════════════════════════════════════════ */
const UsersPage: React.FC = () => {
  const [users,         setUsers]         = useState<User[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [roleFilter,    setRoleFilter]    = useState("");

  const [showUserModal,    setShowUserModal]    = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [selectedUser,     setSelectedUser]     = useState<User | undefined>();

  /* ── fetch ── */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await listUsers();
      setUsers(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  /* ── filter ── */
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        getFullName(u).toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.phone_number ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter(u => u.status?.toLowerCase() === statusFilter);
    if (roleFilter)   list = list.filter(u => u.role?.toLowerCase()   === roleFilter);
    return list;
  }, [users, searchTerm, statusFilter, roleFilter]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.status === "active").length,
    inactive: users.filter(u => u.status === "inactive").length,
    admins:   users.filter(u => u.role   === "admin").length,
  }), [users]);

  /* ── save ── */
  const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
    try {
      setLoading(true);
      if (selectedUser) {
        const payload: Partial<UpdateUserData> = {
          fullName:     data.fullName,
          email:        data.email,
          phone_number: data.phone_number,
          ...(data.role   && { role:   data.role.toLowerCase()   as any }),
          ...(data.status && { status: data.status.toLowerCase() as any }),
          ...(data.password && { password: data.password }),
        };
        await updateUser(selectedUser.id, payload);
        toast.success("User updated");
      } else {
        const { fullName, email, phone_number, password, role, status } = data;
        if (!fullName || (!email && !phone_number) || !password || !role)
          throw new Error("Missing required fields");
        await createUser({
          fullName, email, phone_number, password,
          role:   role.toLowerCase()             as any,
          status: (status || "active").toLowerCase() as any,
        });
        toast.success("User created");
      }
      await fetchUsers();
      setShowUserModal(false);
      setSelectedUser(undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  /* ── delete ── */
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      await deleteUser(selectedUser.id);
      await fetchUsers();
      setShowDeleteModal(false);
      setSelectedUser(undefined);
      toast.success("User deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  /* ── toggle status ── */
  const handleToggleStatus = async (user: User) => {
    try {
      const next = user.status === "active" ? "inactive" : "active";
      await toggleUserStatus(user.id, next as any);
      await fetchUsers();
      toast.success(`User ${next === "active" ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update status");
    }
  };

  /* ── render ── */
  return (
    <div className="space-y-7">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-black text-slate-800 leading-tight">Users</h2>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Manage customers, vendors, riders and administrators
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ExportButton users={filteredUsers} />
          <button
            onClick={() => { setSelectedUser(undefined); setShowUserModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-indigo-600 text-white text-[13.5px] font-semibold
                       hover:bg-indigo-700 active:scale-[0.97]
                       shadow-md shadow-indigo-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.total}    icon={Users}      color="indigo"  sub="All registered accounts" />
        <StatCard label="Active"         value={stats.active}   icon={UserCheck}  color="emerald" sub="Currently enabled" />
        <StatCard label="Inactive"       value={stats.inactive} icon={UserX}      color="rose"    sub="Disabled accounts" />
        <StatCard label="Administrators" value={stats.admins}   icon={ShieldCheck} color="violet" sub="Admin-role users" />
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200
                         text-[13.5px] text-slate-700 placeholder-slate-400 bg-slate-50
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                         transition"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50
                       text-[13.5px] text-slate-600 focus:outline-none focus:ring-2
                       focus:ring-indigo-300 focus:border-indigo-400 transition min-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50
                       text-[13.5px] text-slate-600 focus:outline-none focus:ring-2
                       focus:ring-indigo-300 focus:border-indigo-400 transition min-w-[140px]"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="vendor">Vendor</option>
            <option value="rider">Rider</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200
                       bg-slate-50 text-slate-500 hover:bg-slate-100 transition shrink-0
                       disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Active filter chips */}
        {(searchTerm || statusFilter || roleFilter) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Filters:</span>
            {searchTerm && <Chip label={`"${searchTerm}"`} onRemove={() => setSearchTerm("")} />}
            {statusFilter && <Chip label={`Status: ${statusFilter}`} onRemove={() => setStatusFilter("")} />}
            {roleFilter   && <Chip label={`Role: ${roleFilter}`}     onRemove={() => setRoleFilter("")}   />}
            <button onClick={() => { setSearchTerm(""); setStatusFilter(""); setRoleFilter(""); }}
              className="ml-auto text-[12px] text-indigo-500 hover:text-indigo-700 font-medium transition">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <UserTable
        users={filteredUsers}
        isLoading={loading}
        onEdit={user => { setSelectedUser(user); setShowUserModal(true); }}
        onDelete={user => { setSelectedUser(user); setShowDeleteModal(true); }}
        onToggleStatus={handleToggleStatus}
        onViewDetails={user => { setSelectedUser(user); setShowDetailsModal(true); }}
      />

      {/* ── Modals ── */}
      <UserModal
        isOpen={showUserModal}
        user={selectedUser}
        onClose={() => { setShowUserModal(false); setSelectedUser(undefined); }}
        onSave={handleSaveUser}
        loading={loading}
      />
      <UserDetailsModal
        isOpen={showDetailsModal}
        user={selectedUser}
        onClose={() => { setShowDetailsModal(false); setSelectedUser(undefined); }}
      />
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        user={selectedUser}
        onClose={() => { setShowDeleteModal(false); setSelectedUser(undefined); }}
        onConfirm={handleDeleteUser}
        loading={loading}
      />
    </div>
  );
};

/* ─── tiny filter chip ───────────────────────── */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     bg-indigo-50 text-indigo-700 text-[12px] font-medium border border-indigo-100">
      {label}
      <button onClick={onRemove} className="text-indigo-400 hover:text-indigo-600 transition">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

export default UsersPage;
