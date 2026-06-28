import React, { useEffect, useState } from "react";
import {
  X, Mail, Phone, Shield, Activity, Wallet, Clock, Calendar,
  Package, AlertCircle, Loader2,
} from "lucide-react";
//import type { User } from "../../../types";
import { getUserOrders } from "../../../services/userService";
import type {User} from "../types";
interface Props {
  isOpen:  boolean;
  user?:   User;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFullName = (u: User) => {
  if (u.fullName) return u.fullName;
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email?.split("@")[0] || "No Name";
};

const getInitials = (u: User) => {
  const n = getFullName(u);
  if (n === "Unknown User") return "?";
  return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-KE", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return d; }
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-KE", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
};

const fmtKSh = (v?: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(v ?? 0);

const timeAgo = (d?: string | null) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
};

const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-rose-500",
];
const avatarColor = (id?: string) => AVATAR_COLORS[(parseInt(id ?? "0") % AVATAR_COLORS.length)];

// ─── Status badges ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    active:    "bg-emerald-50 text-emerald-700 border-emerald-100",
    inactive:  "bg-rose-50 text-rose-700 border-rose-100",
    suspended: "bg-amber-50 text-amber-700 border-amber-100",
  };
  const dot: Record<string, string> = {
    active: "bg-emerald-500", inactive: "bg-rose-500", suspended: "bg-amber-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[s] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[s] ?? "bg-slate-400"}`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const r = role?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    admin:  "bg-violet-50 text-violet-700 border border-violet-100",
    vendor: "bg-blue-50 text-blue-700 border border-blue-100",
    rider:  "bg-cyan-50 text-cyan-700 border border-cyan-100",
    user:   "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[r] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
    </span>
  );
}

// ─── Order status badge ────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700",
  confirmed:  "bg-blue-50 text-blue-700",
  preparing:  "bg-violet-50 text-violet-700",
  dispatched: "bg-indigo-50 text-indigo-700",
  delivered:  "bg-emerald-50 text-emerald-700",
  completed:  "bg-emerald-50 text-emerald-700",
  cancelled:  "bg-red-50 text-red-700",
  canceled:   "bg-red-50 text-red-700",
  refunded:   "bg-gray-50 text-gray-600",
};

function OrderStatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? "pending";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${ORDER_STATUS_STYLES[s] ?? "bg-gray-50 text-gray-600"}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

// ─── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono = false }: {
  icon: React.ElementType; label: string; value: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-[13px] text-slate-700 mt-0.5 ${mono ? "font-mono text-[11px] break-all" : "font-medium"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

type ModalTab = "profile" | "orders";

interface OrderItem {
  id: string;
  order_number?: string;
  order_status: string;
  payment_status?: string;
  total_amount: number;
  delivery_address?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER DETAILS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const UserDetailsModal: React.FC<Props> = ({ isOpen, user, onClose }) => {
  const [tab, setTab] = useState<ModalTab>("profile");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  // Keyboard / scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [isOpen, onClose]);

  // Fetch orders when tab is opened
  useEffect(() => {
    if (!isOpen || !user || tab !== "orders") return;
    setOrdersLoading(true);
    setOrdersError(null);
    const uid = user.id || user.user_id || "";
    getUserOrders(uid, 1, 50)
      .then((res) => setOrders((res?.data as OrderItem[]) ?? []))
      .catch(() => setOrdersError("Could not load orders"))
      .finally(() => setOrdersLoading(false));
  }, [isOpen, user, tab]);

  // Reset tab on close
  useEffect(() => { if (!isOpen) { setTab("profile"); setOrders([]); } }, [isOpen]);

  if (!isOpen || !user) return null;

  const fullName  = getFullName(user);
  const initials  = getInitials(user);
  const balance   = user.wallet?.balance ?? user.walletBalance ?? 0;
  const createdAt = user.created_at;
  const lastLogin = user.last_login_at ?? user.lastLogin;

  // Order stats
  const totalSpent   = orders.filter(o => ["delivered","completed"].includes(o.order_status?.toLowerCase())).reduce((s,o) => s + (o.total_amount || 0), 0);
  const delivered    = orders.filter(o => ["delivered","completed"].includes(o.order_status?.toLowerCase())).length;
  //const pending      = orders.filter(o => o.order_status?.toLowerCase() === "pending").length;

  const filteredOrders = orderStatusFilter === "all"
    ? orders
    : orders.filter(o => {
        const s = o.order_status?.toLowerCase();
        if (orderStatusFilter === "cancelled") return s === "cancelled" || s === "canceled";
        return s === orderStatusFilter;
      });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Coloured Header ── */}
        <div className="relative px-6 pt-8 pb-5 bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor(user.id)} flex items-center justify-center text-white font-black text-xl ring-4 ring-white/20 shadow-lg flex-shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-black text-white leading-tight truncate">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
              {createdAt && (
                <p className="text-white/60 text-[11px] mt-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {fmtDate(createdAt)} · {timeAgo(createdAt)}
                </p>
              )}
            </div>
          </div>

          {/* Wallet strip */}
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <Wallet className="w-4 h-4" />
              <span className="text-[12px] font-semibold uppercase tracking-wide">Wallet Balance</span>
            </div>
            <p className="text-white font-black text-[16px]">{fmtKSh(balance)}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
          {(["profile", "orders"] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-semibold transition-colors relative ${
                tab === t ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t === "profile" ? "Profile" : `Orders${orders.length > 0 ? ` (${orders.length})` : ""}`}
              {tab === t && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-600 rounded-t" />}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div className="px-6 py-4">
              <section className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contact</p>
                <InfoRow icon={Mail}  label="Email"  value={user.email        || "—"} />
                <InfoRow icon={Phone} label="Phone"  value={user.phone_number || "—"} />
              </section>

              <section className="mb-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Account</p>
                <InfoRow icon={Shield}   label="User ID"    value={user.id || user.user_id || "—"} mono />
                <InfoRow icon={Activity} label="Last Login"  value={fmtDateTime(lastLogin)} />
              </section>

              <section className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Timeline</p>
                <InfoRow
                  icon={Calendar}
                  label="Account Created"
                  value={
                    createdAt
                      ? <span>{fmtDateTime(createdAt)} <span className="text-slate-400 text-[11px]">({timeAgo(createdAt)})</span></span>
                      : "—"
                  }
                />
                <InfoRow icon={Clock} label="Last Updated" value={fmtDateTime(user.updated_at)} />
              </section>
            </div>
          )}

          {/* ── Orders Tab ── */}
          {tab === "orders" && (
            <div className="flex flex-col">

              {/* Order stats strip */}
              {!ordersLoading && orders.length > 0 && (
                <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-800">{orders.length}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Total Orders</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-lg font-black text-emerald-600">{delivered}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-800">{fmtKSh(totalSpent).replace("KES", "KES")}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Total Spent</p>
                  </div>
                </div>
              )}

              {/* Status filter */}
              {!ordersLoading && orders.length > 0 && (
                <div className="flex gap-1.5 px-6 py-3 border-b border-slate-100 overflow-x-auto">
                  {["all", "pending", "confirmed", "delivered", "cancelled"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOrderStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                        orderStatusFilter === s
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {/* Order list */}
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Loading orders…</p>
                </div>
              ) : ordersError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                  <p className="text-sm text-slate-500">{ordersError}</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Package className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">
                    {orders.length === 0 ? "No orders yet" : `No ${orderStatusFilter} orders`}
                  </p>
                  {orders.length === 0 && (
                    <p className="text-xs text-slate-300">This user hasn't placed any orders</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-800">
                              {order.order_number ?? `#${String(order.id).slice(0, 8).toUpperCase()}`}
                            </span>
                            <OrderStatusBadge status={order.order_status} />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {fmtDateTime(order.created_at)}
                          </p>
                          {order.delivery_address && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[260px]">
                              📍 {order.delivery_address}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[14px] font-bold text-slate-800">
                            KES {Number(order.total_amount || 0).toLocaleString("en-KE")}
                          </p>
                          {order.payment_status && (
                            <p className={`text-[10px] font-semibold mt-0.5 ${
                              order.payment_status === "paid" ? "text-emerald-600" : "text-amber-500"
                            }`}>
                              {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;