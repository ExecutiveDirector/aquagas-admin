import React, { useEffect, useState } from "react";
import {
  ShieldCheck, ShieldOff, UserPlus, RefreshCw, Pencil, ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listAdmins,
  createUser,
  updateAdminRole,
  updateAdminStatus,
  type AdminUser,
} from "../../services/adminService";
import { isSuperAdmin, getAdminRole } from "../../services/authService";
import { OVERRIDABLE_SECTIONS, PAGE_ACCESS } from "../../config/rolePermissions";

const ADMIN_ROLES = [
  "super_admin",
  "operations_admin",
  "finance_admin",
  "support_admin",
  "marketing_admin",
] as const;

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  operations_admin: "Operations",
  finance_admin: "Finance",
  support_admin: "Support",
  marketing_admin: "Marketing",
};

const ROLE_COLOR: Record<string, string> = {
  super_admin: "bg-violet-100 text-violet-700 border-violet-200",
  operations_admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
  finance_admin: "bg-emerald-100 text-emerald-700 border-emerald-200",
  support_admin: "bg-amber-100 text-amber-700 border-amber-200",
  marketing_admin: "bg-rose-100 text-rose-700 border-rose-200",
};

/* ─── Create Admin modal ─────────────────────────────── */
function CreateAdminModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "",
    admin_role: "support_admin" as (typeof ADMIN_ROLES)[number],
    department: "", employee_id: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Full name, email, and password are required");
      return;
    }
    setSaving(true);
    try {
      await createUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: "admin",
        admin_role: form.admin_role,
        department: form.department || undefined,
        employee_id: form.employee_id || undefined,
      });
      toast.success("Admin created");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create admin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">New Admin</h2>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            value={form.admin_role}
            onChange={(e) => setForm({ ...form, admin_role: e.target.value as any })}
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              placeholder="Department (optional)"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
            <input
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              placeholder="Employee ID (optional)"
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Role/Permissions modal ────────────────────── */
type OverrideState = "default" | "grant" | "withdraw";

function EditAdminModal({
  admin, onClose, onSaved,
}: { admin: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [admin_role, setAdminRole] = useState(admin.admin_role);
  const [department, setDepartment] = useState(admin.department || "");
  const [employee_id, setEmployeeId] = useState(admin.employee_id || "");
  const [saving, setSaving] = useState(false);

  const existingSections = admin.permissions?.sections || {};
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>(() => {
    const initial: Record<string, OverrideState> = {};
    for (const s of OVERRIDABLE_SECTIONS) {
      const v = existingSections[s.key];
      initial[s.key] = v === true ? "grant" : v === false ? "withdraw" : "default";
    }
    return initial;
  });

  const setOverride = (key: string, state: OverrideState) =>
    setOverrides((prev) => ({ ...prev, [key]: state }));

  // Whether the CURRENTLY SELECTED admin_role (may differ from admin's
  // original role if changed in this form) includes this section by
  // default — used only to label "Included by role" / "Not included by
  // role" next to each toggle, recalculated live as the dropdown changes.
  const roleIncludesSection = (sectionKey: string) => {
    const section = OVERRIDABLE_SECTIONS.find((s) => s.key === sectionKey);
    if (!section) return false;
    return (PAGE_ACCESS[section.path] || []).includes(admin_role as any);
  };

  const isEditingSuperAdmin = admin_role === "super_admin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Only "grant"/"withdraw" become explicit true/false entries — a
      // section left on "Default" is omitted entirely so it keeps
      // following whatever the role normally includes, even if the role
      // itself changes later.
      const sections: Record<string, boolean> = {};
      for (const [key, state] of Object.entries(overrides)) {
        if (state === "grant") sections[key] = true;
        else if (state === "withdraw") sections[key] = false;
      }
      // Preserve any other permission keys (e.g. legacy resource:[action]
      // grants used elsewhere by requirePermission) instead of clobbering
      // them — only `sections` is being edited here.
      const permissions = { ...(admin.permissions || {}), sections };

      await updateAdminRole(admin.admin_id, { admin_role, department, employee_id, permissions });
      toast.success("Admin updated");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update admin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Edit Admin</h2>
        <p className="text-xs text-slate-400 mb-4">{admin.email}</p>
        <form onSubmit={submit} className="space-y-4">
          <select
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            value={admin_role}
            onChange={(e) => setAdminRole(e.target.value as any)}
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
              placeholder="Employee ID"
              value={employee_id}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>

          {isEditingSuperAdmin ? (
            <p className="text-[12px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
              Super admins always have access to every section — individual
              sections can't be withdrawn from a super_admin.
            </p>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Section access
              </label>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Each section defaults to what {ROLE_LABEL[admin_role]} normally
                includes. Grant a section this role wouldn't normally have,
                or withdraw one it would — independent of the role above.
              </p>
              <div className="space-y-1.5">
                {OVERRIDABLE_SECTIONS.map((s) => {
                  const includedByRole = roleIncludesSection(s.key);
                  const state = overrides[s.key];
                  return (
                    <div
                      key={s.key}
                      className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-slate-700">{s.label}</p>
                        <p className="text-[10.5px] text-slate-400">
                          {includedByRole ? "Included by role" : "Not included by role"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setOverride(s.key, "withdraw")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            state === "withdraw"
                              ? "bg-rose-100 text-rose-700"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          Withdraw
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverride(s.key, "default")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            state === "default"
                              ? "bg-slate-200 text-slate-700"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          Default
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverride(s.key, "grant")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            state === "grant"
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          Grant
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ADMINS PAGE
   ═══════════════════════════════════════════════ */
const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentAdminId = (() => {
    try {
      const info = JSON.parse(localStorage.getItem("userInfo") || "{}");
      return info.admin_id ? String(info.admin_id) : null;
    } catch {
      return null;
    }
  })();

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAdmins();
      setAdmins(res.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // This page is only reachable by super_admin (see DashboardLayout nav
  // gating), but double-check here too since a stale token / direct URL
  // visit could otherwise show an empty, confusing table.
  if (!isSuperAdmin()) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold">Super admin access required</p>
        <p className="text-sm text-slate-400 mt-1">
          Your role ({ROLE_LABEL[getAdminRole() || ""] || "admin"}) can't manage other admins.
        </p>
      </div>
    );
  }

  const toggleStatus = async (admin: AdminUser) => {
    if (String(admin.admin_id) === currentAdminId) {
      toast.error("You can't deactivate your own account");
      return;
    }
    setBusyId(admin.admin_id);
    try {
      await updateAdminStatus(admin.admin_id, !admin.is_active);
      toast.success(admin.is_active ? "Admin deactivated" : "Admin activated");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create, promote, and deactivate admin accounts. Super admin only.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            <UserPlus className="w-4 h-4" /> New Admin
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Admin</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Last Active</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && admins.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading admins…</td></tr>
            )}
            {!loading && admins.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No admins found</td></tr>
            )}
            {admins.map((a) => (
              <tr key={a.admin_id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-700">{a.email || "—"}</p>
                  {a.employee_id && <p className="text-xs text-slate-400">{a.employee_id}</p>}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLOR[a.admin_role] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {ROLE_LABEL[a.admin_role] || a.admin_role}
                  </span>
                  {a.admin_role !== "super_admin" &&
                    a.permissions?.sections &&
                    Object.keys(a.permissions.sections).length > 0 && (
                      <span
                        title="This admin has section access overrides — see Edit"
                        className="ml-1.5 inline-block px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 border border-sky-200"
                      >
                        Custom access
                      </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500">{a.department || "—"}</td>
                <td className="px-5 py-3">
                  {a.is_active ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
                      <ShieldOff className="w-3.5 h-3.5" /> Deactivated
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {a.last_active_at ? new Date(a.last_active_at).toLocaleString() : "Never"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(a)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      title="Edit role & permissions"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStatus(a)}
                      disabled={busyId === a.admin_id || String(a.admin_id) === currentAdminId}
                      title={String(a.admin_id) === currentAdminId ? "You can't deactivate yourself" : undefined}
                      className={`p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 ${a.is_active ? "text-slate-400 hover:text-rose-600" : "text-slate-400 hover:text-emerald-600"}`}
                    >
                      {a.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {editing && (
        <EditAdminModal admin={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
};

export default AdminsPage;
