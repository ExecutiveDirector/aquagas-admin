import React, { useEffect } from "react";
import { X, Mail, Phone, Shield, Activity, Wallet, Clock, Calendar } from "lucide-react";
import type { User } from "../../../types";

interface Props {
  isOpen:  boolean;
  user?:   User;
  onClose: () => void;
}

const getFullName = (u: User) => {
  if (u.fullName) return u.fullName;
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unknown";
};

const getInitials = (u: User) => {
  const n = getFullName(u);
  if (n === "Unknown") return "?";
  return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
};

const fmt = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-KE", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
};

const fmtKSh = (v?: number) =>
  v !== undefined
    ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(v)
    : "KSh 0.00";

function Row({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-[13.5px] text-slate-700 mt-0.5 truncate ${mono ? "font-mono text-[12px]" : "font-medium"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function Badge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-50 text-emerald-700 border border-emerald-100",
    inactive:  "bg-rose-50 text-rose-700 border border-rose-100",
    suspended: "bg-amber-50 text-amber-700 border border-amber-100",
  };
  const s = status?.toLowerCase() ?? "";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                     text-[11px] font-semibold ${map[s] ?? "bg-slate-100 text-slate-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        s === "active" ? "bg-emerald-500" : s === "inactive" ? "bg-rose-500" : "bg-amber-500"
      }`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = {
    admin:  "bg-violet-50 text-violet-700 border border-violet-100",
    vendor: "bg-blue-50 text-blue-700 border border-blue-100",
    rider:  "bg-cyan-50 text-cyan-700 border border-cyan-100",
    user:   "bg-slate-100 text-slate-600",
  };
  const r = role?.toLowerCase() ?? "";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[r] ?? "bg-slate-100 text-slate-600"}`}>
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : "—"}
    </span>
  );
}

const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-rose-500",
];
const avatarColor = (id?: string) => AVATAR_COLORS[(parseInt(id ?? "0") % AVATAR_COLORS.length)];

/* ═══════════════════════════════════════════════
   USER DETAILS MODAL
   ═══════════════════════════════════════════════ */
const UserDetailsModal: React.FC<Props> = ({ isOpen, user, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const balance  = user.wallet?.balance ?? user.walletBalance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl
                      overflow-hidden flex flex-col max-h-[90vh]">

        {/* Coloured header */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-indigo-500 to-violet-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(user.id)}
                            flex items-center justify-center text-white font-black text-xl
                            ring-4 ring-white/20 shadow-lg`}>
              {initials}
            </div>
            <div>
              <h2 className="text-[17px] font-black text-white leading-tight">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={user.role} />
                <Badge status={user.status} />
              </div>
            </div>
          </div>

          {/* Wallet strip */}
          <div className="mt-5 bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <Wallet className="w-4 h-4" />
              <span className="text-[12px] font-semibold uppercase tracking-wide">Wallet Balance</span>
            </div>
            <p className="text-white font-black text-[16px]">{fmtKSh(balance)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">

          <section className="pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contact</p>
            <Row icon={Mail}  label="Email"  value={user.email        || "—"} />
            <Row icon={Phone} label="Phone"  value={user.phone_number || "—"} />
          </section>

          <section className="py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Account</p>
            <Row icon={Shield}   label="User ID"    value={user.id || "—"} mono />
            <Row icon={Activity} label="Last Login"
              value={fmt(user.last_login_at ?? user.lastLogin)} />
          </section>

          <section className="pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Timeline</p>
            <Row icon={Calendar} label="Registered" value={fmt(user.created_at)} />
            <Row icon={Clock}    label="Last Updated" value={fmt(user.updated_at)} />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-[13.5px]
                       font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
