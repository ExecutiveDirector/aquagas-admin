import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { User } from "../../../types";

/* ─── helpers ─────────────────────────────────── */
const getFullName = (u: User): string => {
  if (u.fullName) return u.fullName;
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unknown";
};

const getInitials = (u: User): string => {
  const name = getFullName(u);
  if (name === "Unknown") return "?";
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
};

const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-rose-500",
  "from-pink-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
];

const avatarColor = (id?: string) => AVATAR_COLORS[(parseInt(id ?? "0") % AVATAR_COLORS.length)];

/* ─── Role badge ──────────────────────────────── */
function RoleBadge({ role }: { role?: string }) {
  const r = role?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    admin:    "bg-violet-50 text-violet-700 border-violet-100",
    vendor:   "bg-blue-50 text-blue-700 border-blue-100",
    rider:    "bg-cyan-50 text-cyan-700 border-cyan-100",
    user:     "bg-slate-50 text-slate-600 border-slate-200",
    customer: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px]
                     font-semibold border ${styles[r] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : "—"}
    </span>
  );
}

/* ─── Status badge ────────────────────────────── */
function StatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    active:    "bg-emerald-50 text-emerald-700 border-emerald-100",
    inactive:  "bg-rose-50 text-rose-700 border-rose-100",
    suspended: "bg-amber-50 text-amber-700 border-amber-100",
  };
  const dots: Record<string, string> = {
    active: "bg-emerald-500", inactive: "bg-rose-500", suspended: "bg-amber-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px]
                     font-semibold border ${styles[s] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[s] ?? "bg-gray-400"}`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

/* ─── Row action menu ─────────────────────────── */
function ActionMenu({
  user, onView, onEdit, onToggle, onDelete,
}: {
  user: User;
  onView:   () => void;
  onEdit:   () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = user.status?.toLowerCase() === "active";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const Item = ({
    icon: Icon, label, onClick, danger = false, iconColor = "",
  }: {
    icon: React.ElementType; label: string; onClick: () => void;
    danger?: boolean; iconColor?: string;
  }) => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium
                  transition-colors duration-100
                  ${danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-slate-700 hover:bg-slate-50"
                  }`}
    >
      <Icon className={`w-[15px] h-[15px] ${iconColor || (danger ? "text-rose-500" : "text-slate-400")}`} />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded-lg transition-colors duration-100
                    ${open
                      ? "bg-slate-100 text-slate-700"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200
                        rounded-xl shadow-xl z-30 overflow-hidden py-1
                        animate-[fadeIn_0.1s_ease]">
          <Item icon={Eye}    label="View Details" onClick={onView}   iconColor="text-indigo-400" />
          <Item icon={Edit2}  label="Edit User"    onClick={onEdit}   iconColor="text-blue-400" />
          <Item
            icon={isActive ? ToggleLeft : ToggleRight}
            label={isActive ? "Deactivate" : "Activate"}
            onClick={onToggle}
            iconColor={isActive ? "text-amber-500" : "text-emerald-500"}
          />
          <div className="my-1 border-t border-slate-100" />
          <Item icon={Trash2} label="Delete User" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton row ────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[52, 36, 28, 24, 16].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-slate-100 rounded-lg w-${w} max-w-full`} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Props ───────────────────────────────────── */
interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit:          (user: User) => void;
  onDelete:        (user: User) => void;
  onToggleStatus:  (user: User) => void;
  onViewDetails:   (user: User) => void;
}

/* ═══════════════════════════════════════════════
   USER TABLE
   ═══════════════════════════════════════════════ */
const UserTable: React.FC<UserTableProps> = ({
  users, isLoading = false,
  onEdit, onDelete, onToggleStatus, onViewDetails,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">

      {/* Table header strip */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[14.5px] font-bold text-slate-800">All Users</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {isLoading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Customer", "Contact", "Role", "Status", "Joined", ""].map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400
                              ${i === 5 ? "text-right" : "text-left"}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-[14px] font-semibold text-slate-500">No users found</p>
                    <p className="text-[12px] text-slate-400">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map(user => {
                const fullName = getFullName(user);
                const initials = getInitials(user);
                const joined   = user.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-KE", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={user.id}
                    className="hover:bg-slate-50/60 transition-colors duration-100 group">

                    {/* Customer name + avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(user.id)}
                                        flex items-center justify-center text-white
                                        text-[12px] font-bold shrink-0 shadow-sm`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-slate-800 truncate leading-tight">
                            {fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-tight truncate">
                            #{String(user.id).slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-slate-700 leading-tight truncate max-w-[180px]">
                        {user.email || "—"}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {user.phone_number || "No phone"}
                      </p>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={user.status} />
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5">
                      <p className="text-[12.5px] text-slate-500">{joined}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <ActionMenu
                        user={user}
                        onView={()   => onViewDetails(user)}
                        onEdit={()   => onEdit(user)}
                        onToggle={()  => onToggleStatus(user)}
                        onDelete={()  => onDelete(user)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!isLoading && users.length > 0 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[12px] text-slate-400">
            Showing <span className="font-semibold text-slate-600">{users.length}</span> users
          </p>
        </div>
      )}
    </div>
  );
};

export default UserTable;
