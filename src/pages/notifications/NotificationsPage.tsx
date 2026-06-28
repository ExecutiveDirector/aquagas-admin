// src/pages/notifications/NotificationsPage.tsx — Production-level rewrite
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell, BellOff, Send, Plus, Trash2, Edit3, RefreshCw,
  Search, Filter, CheckCircle2, Clock, AlertCircle, X,
  Users, Store, Truck, Globe, Loader2, ChevronDown,
  LayoutTemplate, Eye, Megaphone, Calendar,
} from 'lucide-react';
import {
  listNotifications,
  createNotification,
  sendNotification,
  deleteNotification,
  updateNotification,
  listNotificationTemplates,
} from '../../services/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  notification_id: string;
  notification_type: string;
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_id?: string;
  user_id?: string; vendor_id?: string; rider_id?: string;
  is_sent: boolean;
  sent_at?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface Template {
  template_id: string;
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables?: string;
}

type Tab = 'list' | 'compose' | 'templates';
type RecipientType = 'all' | 'user' | 'vendor' | 'rider';

const RECIPIENT_META: Record<RecipientType, { label: string; icon: React.ElementType; color: string }> = {
  all:    { label: 'Everyone', icon: Globe,  color: 'text-indigo-600 bg-indigo-50' },
  user:   { label: 'User',     icon: Users,  color: 'text-emerald-600 bg-emerald-50' },
  vendor: { label: 'Vendor',   icon: Store,  color: 'text-violet-600 bg-violet-50' },
  rider:  { label: 'Rider',    icon: Truck,  color: 'text-amber-600 bg-amber-50' },
};

const NOTIF_TYPE_OPTIONS = ['order_update', 'promotion', 'alert', 'system', 'payment', 'delivery', 'custom'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; type: ToastType; msg: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, success: (m: string) => add(m, 'success'), error: (m: string) => add(m, 'error'), info: (m: string) => add(m, 'info') };
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in slide-in-from-right max-w-sm ${
          t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' :
          t.type === 'error'   ? 'bg-white border-red-200 text-red-700' :
                                 'bg-white border-indigo-200 text-indigo-700'
        }`}>
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
           t.type === 'error'   ? <AlertCircle  className="w-4 h-4 shrink-0" /> :
                                  <Bell         className="w-4 h-4 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmProps { title: string; msg: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }
function ConfirmDialog({ title, msg, onConfirm, onCancel, danger }: ConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 text-base mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{msg}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps { notif: Notification; onSave: (id: string, updates: Partial<Notification>) => Promise<void>; onClose: () => void; loading: boolean }
function EditModal({ notif, onSave, onClose, loading }: EditModalProps) {
  const [title, setTitle] = useState(notif.title);
  const [content, setContent] = useState(notif.content);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Edit Notification</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Cancel</button>
          <button disabled={loading} onClick={() => onSave(notif.notification_id, { title, content })}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates]         = useState<Template[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab]                     = useState<Tab>('list');
  const [search, setSearch]               = useState('');
  const [filterSent, setFilterSent]       = useState<'all' | 'sent' | 'pending'>('all');
  const [filterType, setFilterType]       = useState<RecipientType | 'all'>('all');
  const [confirm, setConfirm]             = useState<{ title: string; msg: string; onConfirm: () => void; danger?: boolean } | null>(null);
  const [editTarget, setEditTarget]       = useState<Notification | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Notification | null>(null);
  const mounted = useRef(true);

  // Compose form
  const [form, setForm] = useState({
    notification_type: 'order_update',
    title: '', content: '',
    recipient_type: 'all' as RecipientType,
    recipient_id: '', template_id: '',
  });
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nr, tr] = await Promise.all([listNotifications(), listNotificationTemplates()]);
      if (!mounted.current) return;
      setNotifications(nr.data || []);
      setTemplates(tr.data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load notifications');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill from template
  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.template_id === templateId);
    if (!tpl) return;
    setForm(f => ({ ...f, template_id: templateId, title: tpl.subject || f.title, content: tpl.content || f.content }));
    setCharCount(tpl.content?.length || 0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return; }
    setActionLoading(true);
    try {
      await createNotification({
        notification_type: form.notification_type,
        title: form.title, content: form.content,
        recipient_type: form.recipient_type,
        recipient_id: form.recipient_id || undefined,
        template_id: form.template_id || undefined,
      });
      toast.success('Notification created successfully');
      setForm({ notification_type: 'order_update', title: '', content: '', recipient_type: 'all', recipient_id: '', template_id: '' });
      setCharCount(0);
      setTab('list');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create notification');
    } finally { setActionLoading(false); }
  };

  const handleSend = (id: string) => {
    setConfirm({
      title: 'Send Notification',
      msg: 'This will immediately push the notification to all recipients. Continue?',
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading(true);
        try {
          await sendNotification(id);
          toast.success('Notification sent!');
          await loadData();
        } catch (err: any) { toast.error(err?.message || 'Send failed'); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleDelete = (id: string, title: string) => {
    setConfirm({
      title: 'Delete Notification',
      msg: `"${title}" will be permanently deleted.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading(true);
        try {
          await deleteNotification(id);
          toast.success('Deleted');
          await loadData();
        } catch (err: any) { toast.error(err?.message || 'Delete failed'); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleUpdate = async (id: string, updates: Partial<Notification>) => {
    setActionLoading(true);
    try {
      await updateNotification(id, updates);
      toast.success('Notification updated');
      setEditTarget(null);
      await loadData();
    } catch (err: any) { toast.error(err?.message || 'Update failed'); }
    finally { setActionLoading(false); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    const q = search.toLowerCase();
    if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !n.notification_type.toLowerCase().includes(q)) return false;
    if (filterSent === 'sent' && !n.is_sent) return false;
    if (filterSent === 'pending' && n.is_sent) return false;
    if (filterType !== 'all' && n.recipient_type !== filterType) return false;
    return true;
  });

  const sentCount    = notifications.filter(n => n.is_sent).length;
  const pendingCount = notifications.filter(n => !n.is_sent).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster toasts={toast.toasts} />
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {editTarget && <EditModal notif={editTarget} onSave={handleUpdate} onClose={() => setEditTarget(null)} loading={actionLoading} />}
      {previewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewTarget(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-slate-400" /><span className="font-semibold text-slate-800 text-sm">Preview</span></div>
              <button onClick={() => setPreviewTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"><Bell className="w-4 h-4 text-indigo-600" /></div>
                  <div><p className="text-xs text-slate-400">AquaGas Admin</p><p className="text-xs text-slate-400">{fmtDate(previewTarget.created_at)}</p></div>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{previewTarget.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{previewTarget.content}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Type: <b className="text-slate-600">{previewTarget.notification_type}</b></span>
                <span>To: <b className="text-slate-600">{RECIPIENT_META[previewTarget.recipient_type]?.label || previewTarget.recipient_type}</b></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center"><Bell className="w-4 h-4 text-white" /></div>
              Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{notifications.length} total · {sentCount} sent · {pendingCount} pending</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('compose')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition">
              <Plus className="w-4 h-4" />New Notification
            </button>
            <button onClick={loadData} disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',   val: notifications.length, icon: Bell,         color: 'text-slate-700', bg: 'bg-white' },
            { label: 'Sent',    val: sentCount,             icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', val: pendingCount,          icon: Clock,        color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Templates', val: templates.length,   icon: LayoutTemplate, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm`}>
              <div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className={`text-2xl font-black mt-0.5 ${color}`}>{val}</p>
              </div>
              <Icon className={`w-5 h-5 ${color} opacity-60`} />
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-slate-200">
          {([
            { id: 'list',      label: 'All Notifications', icon: Bell },
            { id: 'compose',   label: 'Compose',           icon: Megaphone },
            { id: 'templates', label: 'Templates',         icon: LayoutTemplate },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <Icon className="w-4 h-4" />{label}
              {id === 'list' && notifications.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{notifications.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, content or type…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition" />
              </div>
              <div className="flex gap-2">
                <select value={filterSent} onChange={e => setFilterSent(e.target.value as any)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 outline-none">
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="pending">Pending</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
                  className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 outline-none">
                  <option value="all">All Recipients</option>
                  <option value="all">Everyone</option>
                  <option value="user">Users</option>
                  <option value="vendor">Vendors</option>
                  <option value="rider">Riders</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin" />
                <p className="text-sm">Loading notifications…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-3 text-slate-400">
                <BellOff className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">{search || filterSent !== 'all' || filterType !== 'all' ? 'No notifications match your filters' : 'No notifications yet'}</p>
                {notifications.length === 0 && <button onClick={() => setTab('compose')} className="text-xs text-indigo-600 hover:underline">Create your first notification →</button>}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {filtered.map(n => {
                    const rMeta = RECIPIENT_META[n.recipient_type] ?? RECIPIENT_META.all;
                    const RIcon = rMeta.icon;
                    return (
                      <div key={n.notification_id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                        <div className="flex items-start gap-4">
                          {/* Status dot */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.is_sent ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                            {n.is_sent ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.content}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={() => setPreviewTarget(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition" title="Preview">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {!n.is_sent && (
                                  <>
                                    <button onClick={() => handleSend(n.notification_id)} disabled={actionLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition" title="Send now">
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditTarget(n)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition" title="Edit">
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button onClick={() => handleDelete(n.notification_id, n.title)} disabled={actionLoading} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${rMeta.color}`}>
                                <RIcon className="w-2.5 h-2.5" />{rMeta.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">{n.notification_type}</span>
                              {n.is_sent ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">✓ Sent {n.sent_at ? fmtDate(n.sent_at) : ''}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600">Pending</span>
                              )}
                              <span className="text-[10px] text-slate-300 flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{fmtDate(n.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPOSE TAB ── */}
        {tab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Compose Notification</h2>
              </div>
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">

                {/* Template quick-fill */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Use Template (optional)</label>
                    <select value={form.template_id} onChange={e => applyTemplate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition">
                      <option value="">— Select a template —</option>
                      {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notification Type *</label>
                    <select value={form.notification_type} onChange={e => setForm(f => ({ ...f, notification_type: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition">
                      {NOTIF_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Send To *</label>
                    <select value={form.recipient_type} onChange={e => setForm(f => ({ ...f, recipient_type: e.target.value as RecipientType, recipient_id: '' }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition">
                      <option value="all">🌐 Everyone</option>
                      <option value="user">👤 Specific User</option>
                      <option value="vendor">🏪 Specific Vendor</option>
                      <option value="rider">🏍️ Specific Rider</option>
                    </select>
                  </div>
                </div>

                {form.recipient_type !== 'all' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{form.recipient_type.charAt(0).toUpperCase() + form.recipient_type.slice(1)} ID *</label>
                    <input value={form.recipient_id} onChange={e => setForm(f => ({ ...f, recipient_id: e.target.value }))}
                      placeholder={`Enter ${form.recipient_type} ID`}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={120}
                    placeholder="e.g. Your order has been confirmed"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Message *</label>
                    <span className={`text-[10px] font-medium ${charCount > 500 ? 'text-red-400' : 'text-slate-300'}`}>{charCount}/500</span>
                  </div>
                  <textarea value={form.content} onChange={e => { setForm(f => ({ ...f, content: e.target.value })); setCharCount(e.target.value.length); }}
                    required maxLength={500} rows={5} placeholder="Write your notification message here…"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none" />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setTab('list')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 disabled:opacity-50 transition flex items-center gap-2">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Notification
                  </button>
                </div>
              </form>
            </div>

            {/* Live preview */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live Preview</span>
                </div>
                <div className="p-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-indigo-600" /></div>
                      <p className="text-xs text-slate-400">AquaGas · now</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">{form.title || 'Your notification title'}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{form.content || 'Your message will appear here…'}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {form.recipient_type && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${RECIPIENT_META[form.recipient_type]?.color}`}>
                        To: {RECIPIENT_META[form.recipient_type]?.label}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">{form.notification_type}</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 text-xs text-indigo-600 space-y-1.5">
                <p className="font-semibold mb-2">Tips</p>
                <p>• Keep titles under 60 characters for best display on mobile</p>
                <p>• Messages with a clear action get higher engagement</p>
                <p>• Use templates for consistent branding</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === 'templates' && (
          <div>
            {templates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-3 text-slate-400">
                <LayoutTemplate className="w-8 h-8 opacity-40" />
                <p className="text-sm font-medium">No templates found</p>
                <p className="text-xs text-slate-300">Templates created in the backend will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(t => (
                  <div key={t.template_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{t.name}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600">{t.template_type}</span>
                      </div>
                      <button onClick={() => { applyTemplate(t.template_id); setTab('compose'); }}
                        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition">
                        Use
                      </button>
                    </div>
                    {t.subject && <p className="text-xs font-semibold text-slate-600">{t.subject}</p>}
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{t.content}</p>
                    {t.variables && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Variables</p>
                        <p className="text-xs text-slate-500 font-mono">{t.variables}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
