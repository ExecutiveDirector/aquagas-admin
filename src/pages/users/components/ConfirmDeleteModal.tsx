import React, { useEffect } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import type { User } from "../../../types";

interface Props {
  isOpen:    boolean;
  user?:     User;
  onClose:   () => void;
  onConfirm: () => void;
  loading?:  boolean;
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

/* ═══════════════════════════════════════════════
   CONFIRM DELETE MODAL
   ═══════════════════════════════════════════════ */
const ConfirmDeleteModal: React.FC<Props> = ({
  isOpen, user, onClose, onConfirm, loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !user) return null;

  const fullName = getFullName(user);
  const initials = getInitials(user);

  const consequences = [
    "User profile and account information",
    "Transaction history and wallet balance",
    "Order history and preferences",
    "All associated platform data",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800">Delete User</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">This action is permanent and irreversible</p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User card */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
                            flex items-center justify-center text-white font-bold text-[13px] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 truncate leading-tight">{fullName}</p>
              <p className="text-[12px] text-slate-500 truncate">{user.email || "No email"}</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full
                             bg-slate-200 text-slate-600 capitalize shrink-0">
              {user.role}
            </span>
          </div>
        </div>

        {/* Warning list */}
        <div className="px-6 pb-5">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
            <p className="text-[12.5px] font-semibold text-rose-700 mb-2">
              The following data will be permanently deleted:
            </p>
            <ul className="space-y-1.5">
              {consequences.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] text-rose-600">
                  <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13.5px]
                       font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl
                       bg-rose-600 hover:bg-rose-700 text-white text-[13.5px]
                       font-semibold shadow-md shadow-rose-200 transition disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {loading ? "Deleting…" : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
