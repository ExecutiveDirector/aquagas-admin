// src/pages/orders/OrdersPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, AlertCircle, ChevronDown, ChevronUp, X, CheckCircle } from "lucide-react";
import { listOrders, updateOrderStatus, assignRiderToOrder, refundOrder } from "../../services/adminService";
import { getAllRiders } from "../../services/adminService"; // make sure this is exported

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  order_id: string;
  order_number: string;
  vendor_name?: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  delivery_type: string;
  created_at: string;
  customer?: { full_name: string; phone: string } | null;
  rider?: { full_name: string; phone: string } | null;
  order_items?: { item_id: string; product_name: string; quantity: number; unit_price: number; total_price: number }[];
}

interface Rider {
  rider_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  current_status: string;
  vehicle_type?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Draft",      cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  pending:    { label: "Pending",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  confirmed:  { label: "Confirmed",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing:  { label: "Preparing",  cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  ready:      { label: "Ready",      cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  dispatched: { label: "Dispatched", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  delivered:  { label: "Delivered",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  canceled:   { label: "Cancelled",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refunded:   { label: "Refunded",   cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:        { label: "Pending",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid:           { label: "Paid",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  failed:         { label: "Failed",   cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refunded:       { label: "Refunded", cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
  partially_paid: { label: "Partial",  cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const ORDER_STATUSES = ["pending","confirmed","preparing","ready","dispatched","delivered","canceled","refunded"];

function Badge({ value, config }: { value: string; config: Record<string, { label: string; cls: string }> }) {
  const key = value?.toLowerCase();
  const cfg = config[key] ?? { label: key, cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function OrderDetailPanel({
  order,
  onClose,
  onUpdate,
  loading,
}: {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
  loading: boolean;
}) {
  const [newStatus, setNewStatus] = useState(order.order_status);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [riderSearch, setRiderSearch] = useState("");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [showRiderDropdown, setShowRiderDropdown] = useState(false);
  const [refundAmount, setRefundAmount] = useState(order.total_amount);
  const [refundReason, setRefundReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const riderDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active riders on mount
  useEffect(() => {
    const fetchRiders = async () => {
      setRidersLoading(true);
      try {
        const res = await getAllRiders();
        // getAllRiders returns { data: riders[] }
        const allRiders: Rider[] = res.data ?? [];
        // Only show active+approved riders
        setRiders(allRiders.filter((r: any) => r.current_status === 'active' && r.approved));
      } catch {
        // non-fatal: fall back to empty list
        setRiders([]);
      } finally {
        setRidersLoading(false);
      }
    };
    fetchRiders();
  }, []);

  // Close rider dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (riderDropdownRef.current && !riderDropdownRef.current.contains(e.target as Node)) {
        setShowRiderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredRiders = riders.filter((r) => {
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    const q = riderSearch.toLowerCase();
    return fullName.includes(q) || r.phone?.includes(q);
  });

  const selectedRider = riders.find((r) => r.rider_id === selectedRiderId);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleStatusUpdate = async () => {
    if (newStatus === order.order_status) return;
    setActionLoading(true); setActionError(null);
    try {
      await updateOrderStatus(order.order_id, newStatus);
      showSuccess("Status updated successfully");
      onUpdate();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRider = async () => {
    if (!selectedRiderId) return;
    setActionLoading(true); setActionError(null);
    try {
      await assignRiderToOrder(order.order_id, selectedRiderId);
      showSuccess(`Rider assigned: ${selectedRider?.first_name} ${selectedRider?.last_name}`);
      setSelectedRiderId("");
      setRiderSearch("");
      onUpdate();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to assign rider");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    setActionLoading(true); setActionError(null);
    try {
      await refundOrder(order.order_id, refundAmount, refundReason);
      showSuccess("Refund processed");
      onUpdate();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to process refund");
    } finally {
      setActionLoading(false);
    }
  };

  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{order.order_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge value={order.order_status} config={STATUS_CONFIG} />
              <Badge value={order.payment_status} config={PAYMENT_CONFIG} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Success */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle size={13} /> {successMsg}
            </div>
          )}

          {/* Error */}
          {actionError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={13} /> {actionError}
            </div>
          )}

          {/* Order info */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Details</h3>
            <Row label="Customer"  value={order.customer?.full_name} />
            <Row label="Phone"     value={order.customer?.phone} />
            <Row label="Vendor"    value={order.vendor_name} />
            <Row label="Rider"     value={order.rider?.full_name} />
            <Row label="Delivery"  value={order.delivery_type?.replace("_", " ")} />
            <Row label="Total"     value={`KES ${Number(order.total_amount || 0).toLocaleString()}`} />
            <Row label="Created"   value={new Date(order.created_at).toLocaleString()} />
          </section>

          {/* Items */}
          {order.order_items && order.order_items.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Items</h3>
              <div className="space-y-2">
                {order.order_items.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-xs text-gray-400">x{item.quantity} @ KES {Number(item.unit_price).toLocaleString()}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      KES {Number(item.total_price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Update Status */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Update Status</h3>
            <div className="flex gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={actionLoading}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors disabled:opacity-50"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={actionLoading || newStatus === order.order_status}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </section>

          {/* Assign Rider — searchable dropdown */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Assign Rider
              {order.rider?.full_name && (
                <span className="ml-2 normal-case font-normal text-emerald-600 dark:text-emerald-400">
                  (currently: {order.rider.full_name})
                </span>
              )}
            </h3>

            <div className="flex gap-2">
              {/* Searchable combobox */}
              <div className="relative flex-1" ref={riderDropdownRef}>
                <input
                  type="text"
                  value={selectedRider ? `${selectedRider.first_name} ${selectedRider.last_name}` : riderSearch}
                  onChange={(e) => {
                    setRiderSearch(e.target.value);
                    setSelectedRiderId("");
                    setShowRiderDropdown(true);
                  }}
                  onFocus={() => setShowRiderDropdown(true)}
                  placeholder={ridersLoading ? "Loading riders…" : riders.length === 0 ? "No active riders" : "Search rider by name or phone…"}
                  disabled={actionLoading || ridersLoading || riders.length === 0}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors disabled:opacity-50 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />

                {/* Dropdown list */}
                {showRiderDropdown && !ridersLoading && filteredRiders.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {filteredRiders.map((rider) => (
                      <button
                        key={rider.rider_id}
                        type="button"
                        onClick={() => {
                          setSelectedRiderId(rider.rider_id);
                          setRiderSearch("");
                          setShowRiderDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                          selectedRiderId === rider.rider_id
                            ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{rider.first_name} {rider.last_name}</p>
                          <p className="text-xs text-gray-400">{rider.phone} {rider.vehicle_type ? `· ${rider.vehicle_type}` : ""}</p>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          active
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {showRiderDropdown && !ridersLoading && riderSearch && filteredRiders.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
                    No riders match "{riderSearch}"
                  </div>
                )}
              </div>

              <button
                onClick={handleAssignRider}
                disabled={actionLoading || !selectedRiderId}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {actionLoading ? "…" : "Assign"}
              </button>
            </div>

            {riders.length === 0 && !ridersLoading && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                No active riders available. Approve and activate riders in the Riders section first.
              </p>
            )}
          </section>

          {/* Refund */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Process Refund</h3>
            <div className="space-y-2">
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                placeholder="Amount"
                disabled={actionLoading}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 transition-colors disabled:opacity-50"
              />
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
                disabled={actionLoading}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 transition-colors disabled:opacity-50 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <button
                onClick={handleRefund}
                disabled={actionLoading || !refundReason.trim()}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Processing…" : "Process Refund"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────

type SortKey = "created_at" | "total_amount" | "order_status";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async (pg = 1, q = search, st = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrders(pg, 20, { search: q || undefined, status: st || undefined });
      setOrders((res.data as Order[]) ?? []);
      setTotal(res.pagination?.total ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setPage(pg);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(1); }, []); // eslint-disable-line

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchOrders(1, search, statusFilter), 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, statusFilter]); // eslint-disable-line

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let av: any = a[sortKey];
    let bv: any = b[sortKey];
    if (sortKey === "created_at") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
    if (sortKey === "total_amount") { av = Number(av); bv = Number(bv); }
    return sortDir === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-indigo-500" /> : <ChevronDown size={12} className="text-indigo-500" />;
  };

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none group" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 uppercase tracking-wide group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
        {label} <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total.toLocaleString()} total orders</p>
          </div>
          <button
            onClick={() => fetchOrders(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number or vendor…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
            <button onClick={() => fetchOrders(page)} className="ml-auto font-medium hover:underline">Retry</button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Order</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Vendor</th>
                  <Th col="total_amount" label="Amount" />
                  <Th col="order_status" label="Status" />
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">Payment</th>
                  <Th col="created_at" label="Date" />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/60">
                {loading && orders.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : sortedOrders.length === 0
                  ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                          No orders found
                        </td>
                      </tr>
                    )
                  : sortedOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{order.order_number}</p>
                          <p className="text-xs text-gray-400">{order.delivery_type?.replace("_", " ")}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {order.customer?.full_name ?? "Guest"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[120px] truncate">
                          {order.vendor_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          KES {Number(order.total_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={order.order_status} config={STATUS_CONFIG} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={order.payment_status} config={PAYMENT_CONFIG} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString("en-KE", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages} ({total.toLocaleString()} orders)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchOrders(page - 1)}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchOrders(page + 1)}
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

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => { fetchOrders(page); setSelectedOrder(null); }}
          loading={loading}
        />
      )}
    </div>
  );
}
