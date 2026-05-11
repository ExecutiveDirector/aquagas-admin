import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import type { User } from "../../../types";
import toast from "react-hot-toast";

interface Props {
  isOpen:   boolean;
  user?:    User;
  onClose:  () => void;
  onSave:   (data: Partial<User> & { password?: string }) => Promise<void>;
  loading:  boolean;
}

/* ─── Shared input wrapper ───────────────────── */
function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-[12px] text-rose-500">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full h-10 px-3.5 rounded-xl border text-[13.5px] text-slate-800
   placeholder-slate-400 bg-slate-50 focus:bg-white
   focus:outline-none focus:ring-2 transition
   ${err
     ? "border-rose-300 focus:ring-rose-200"
     : "border-slate-200 focus:ring-indigo-200 focus:border-indigo-400"
   }`;

/* ═══════════════════════════════════════════════
   USER MODAL
   ═══════════════════════════════════════════════ */
const UserModal: React.FC<Props> = ({ isOpen, user, onClose, onSave, loading }) => {
  const isEditing = !!user;

  const [form, setForm] = useState({
    first_name:   "", last_name:    "",
    email:        "", phone_number: "",
    password:     "", role:         "user",
    status:       "active",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const name = user?.fullName?.split(" ") ?? [];
    setForm({
      first_name:   user?.first_name ?? name[0] ?? "",
      last_name:    user?.last_name  ?? name.slice(1).join(" ") ?? "",
      email:        user?.email        ?? "",
      phone_number: user?.phone_number ?? "",
      password:     "",
      role:         user?.role   ?? "user",
      status:       user?.status ?? "active",
    });
    setErrors({});
  }, [isOpen, user]);

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim())  e.last_name  = "Required";
    if (!form.email.trim() && !form.phone_number.trim())
      e.email = "Email or phone number required";
    if (!isEditing && !form.password) e.password = "Required for new users";
    if (!form.role)   e.role   = "Required";
    if (!form.status) e.status = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) { toast.error("Please fix the errors below"); return; }
    await onSave({
      fullName:     `${form.first_name} ${form.last_name}`.trim(),
      first_name:   form.first_name,
      last_name:    form.last_name,
      email:        form.email || undefined,
      phone_number: form.phone_number || undefined,
      password:     form.password    || undefined,
      role:         form.role   as any,
      status:       form.status as any,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl
                      overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800">
              {isEditing ? "Edit User" : "Add New User"}
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {isEditing ? "Update account information" : "Create a new user account"}
            </p>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.first_name}>
              <input className={inputCls(errors.first_name)}
                placeholder="John" value={form.first_name}
                onChange={e => set("first_name", e.target.value)} />
            </Field>
            <Field label="Last Name" error={errors.last_name}>
              <input className={inputCls(errors.last_name)}
                placeholder="Doe" value={form.last_name}
                onChange={e => set("last_name", e.target.value)} />
            </Field>
          </div>

          <Field label="Email Address" error={errors.email}>
            <input type="email" className={inputCls(errors.email)}
              placeholder="john@example.com" value={form.email}
              onChange={e => set("email", e.target.value)} />
          </Field>

          <Field label="Phone Number" error={errors.phone_number}>
            <input className={inputCls(errors.phone_number)}
              placeholder="+254712345678" value={form.phone_number}
              onChange={e => set("phone_number", e.target.value)} />
          </Field>

          {/* Password — only for new users */}
          {!isEditing && (
            <Field label="Password" error={errors.password}>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className={inputCls(errors.password) + " pr-10"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                />
                <button type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role" error={errors.role}>
              <select className={inputCls(errors.role)}
                value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="vendor">Vendor</option>
                <option value="rider">Rider</option>
              </select>
            </Field>
            <Field label="Status" error={errors.status}>
              <select className={inputCls(errors.status)}
                value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13.5px]
                       font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async e => {
              const form = document.querySelector("form");
              form?.requestSubmit();
            }}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-[13.5px]
                       font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200
                       transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isEditing ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
