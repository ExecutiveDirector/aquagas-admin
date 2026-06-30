// src/pages/settings/settings.tsx
import React, { useState, useEffect, useCallback, type JSX } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  CreditCard,
  Truck,
  Activity,
  Database,
  RefreshCw,
  Save,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Server,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSystemSettings,
  updateSystemSetting,
  createSystemSetting,
  deleteSystemSetting,
  getSystemHealth,
  enableMaintenanceMode,
  disableMaintenanceMode,
  getMaintenanceStatus,
  clearSystemCache,
  getAuditLogs,
  getSystemEvents,
  updateNotificationPreferences,
  type SystemSetting,
  type SystemHealth,
} from '../../services/systemService';

// ============================================================
// TYPES
// ============================================================

type Tab = 'system' | 'business' | 'notifications' | 'security' | 'health' | 'audit';

interface GroupedSettings {
  [category: string]: SystemSetting[];
}

// ============================================================
// HELPERS
// ============================================================

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const castValue = (setting: SystemSetting): string => {
  if (setting.value !== undefined && setting.value !== null) return String(setting.value);
  return setting.setting_value ?? '';
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const SettingRow: React.FC<{
  setting: SystemSetting;
  onSave: (key: string, value: string | number | boolean) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
  saving: boolean;
}> = ({ setting, onSave, onDelete, saving }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(castValue(setting));
  const [showValue, setShowValue] = useState(false);

  const isSensitive = /password|secret|token|key|api/i.test(setting.key || setting.setting_key || '');
  const displayKey = setting.key || setting.setting_key || '';
  const displayType = setting.setting_type || setting.type || 'string';

  const handleSave = async () => {
    let parsed: string | number | boolean = draft;
    if (displayType === 'number') parsed = Number(draft);
    if (displayType === 'boolean') parsed = draft === 'true';
    await onSave(displayKey, parsed);
    setEditing(false);
  };

  return (
    <div className="flex items-start justify-between py-4 px-6 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">{displayKey}</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{displayType}</span>
          {!setting.is_public && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">private</span>}
        </div>
        {setting.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{setting.description}</p>
        )}
        <div className="mt-2">
          {editing ? (
            displayType === 'boolean' ? (
              <select
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full max-w-xs px-3 py-1.5 text-sm border border-blue-400 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={displayType === 'number' ? 'number' : 'text'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setDraft(castValue(setting)); } }}
                autoFocus
                className="w-full max-w-xs px-3 py-1.5 text-sm border border-blue-400 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {isSensitive && !showValue ? '••••••••••' : castValue(setting)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSensitive && !editing && (
          <button onClick={() => setShowValue((v) => !v)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500">
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {editing ? (
          <>
            <button disabled={saving} onClick={handleSave} className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={() => { setEditing(false); setDraft(castValue(setting)); }} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(displayKey)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const Pagination: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const HealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { cls: string; label: string }> = {
    healthy: { cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', label: 'Healthy' },
    degraded: { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', label: 'Degraded' },
    unhealthy: { cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', label: 'Unhealthy' },
    unknown: { cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'Unknown' },
  };
  const conf = map[status] || map.unknown;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${conf.cls}`}>{conf.label}</span>;
};

// ============================================================
// MAIN PAGE
// ============================================================

const SettingPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Settings
  const [grouped, setGrouped] = useState<GroupedSettings>({});
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', type: 'string', category: 'general', description: '' });

  // Health
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message?: string } | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    email_enabled: true, sms_enabled: true, push_enabled: true, in_app_enabled: true,
    order_updates: true, delivery_updates: true, payment_updates: true,
    promotional: false, system_alerts: true, reminders: true,
  });
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditFilter, setAuditFilter] = useState('');

  // System events
  const [systemEvents, setSystemEvents] = useState<any[]>([]);
  const [eventPage, setEventPage] = useState(1);
  const [eventTotalPages, setEventTotalPages] = useState(1);
  const [eventSeverity, setEventSeverity] = useState('all');

  const loadSettings = useCallback(async () => {
    try {
      const res = await getSystemSettings();
      const data = res.data || [];
      const grp: GroupedSettings = {};
      for (const s of data) {
        const cat = s.category || 'general';
        if (!grp[cat]) grp[cat] = [];
        grp[cat].push(s);
      }
      setGrouped(grp);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings');
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const [healthRes, maintRes] = await Promise.all([
        getSystemHealth(),
        getMaintenanceStatus(),
      ]);
      setHealth(healthRes.data);
      setMaintenance(maintRes.data);
      setMaintenanceMsg(maintRes.data?.message || '');
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const params: any = { page: auditPage, limit: 50 };
      if (auditFilter) params.entity_type = auditFilter;
      const res = await getAuditLogs(params);
      setAuditLogs(res.data || []);
      setAuditTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    }
  }, [auditPage, auditFilter]);

  const loadEvents = useCallback(async () => {
    try {
      const params: any = { page: eventPage, limit: 50 };
      if (eventSeverity !== 'all') params.severity = eventSeverity;
      const res = await getSystemEvents(params);
      setSystemEvents(res.data || []);
      setEventTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
    }
  }, [eventPage, eventSeverity]);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSettings(), loadHealth()]);
    setLoading(false);
  }, [loadSettings, loadHealth]);

  useEffect(() => { initialLoad(); }, [initialLoad]);
  useEffect(() => { if (!loading && tab === 'audit') loadAuditLogs(); }, [tab, auditPage, auditFilter, loading, loadAuditLogs]);
  useEffect(() => { if (!loading && tab === 'health') loadEvents(); }, [tab, eventPage, eventSeverity, loading, loadEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSettings(), loadHealth(), loadAuditLogs(), loadEvents()]);
    setRefreshing(false);
    toast.success('Refreshed');
  };

  const handleSaveSetting = async (key: string, value: string | number | boolean) => {
    setSaving(true);
    try {
      await updateSystemSetting(key, value);
      await loadSettings();
      toast.success(`${key} updated`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetting = async (key: string) => {
    if (!window.confirm(`Delete setting "${key}"? This cannot be undone.`)) return;
    try {
      await deleteSystemSetting(key);
      await loadSettings();
      toast.success(`${key} deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete setting');
    }
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key || !newSetting.value) {
      toast.error('Key and value are required');
      return;
    }
    try {
      await createSystemSetting({
        key: newSetting.key,
        value: newSetting.value,
        setting_type: newSetting.type,
        category: newSetting.category,
        description: newSetting.description || undefined,
      });
      setNewSetting({ key: '', value: '', type: 'string', category: 'general', description: '' });
      setShowAddSetting(false);
      await loadSettings();
      toast.success('Setting created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create setting');
    }
  };

  const handleToggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      if (maintenance?.enabled) {
        await disableMaintenanceMode();
        toast.success('Maintenance mode disabled');
      } else {
        await enableMaintenanceMode(maintenanceMsg || undefined);
        toast.success('Maintenance mode enabled');
      }
      await loadHealth();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle maintenance mode');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all cache layers? Active sessions are not affected.')) return;
    setClearingCache(true);
    try {
      const res = await clearSystemCache('all');
      toast.success('Cache cleared');
      console.log('Cache clear results:', res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  const handleSaveNotifPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifPrefs(true);
    try {
      await updateNotificationPreferences(notifPrefs);
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'system', label: 'System', icon: <SettingsIcon className="w-4 h-4" /> },
    { key: 'business', label: 'Business', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { key: 'health', label: 'Health & Events', icon: <Activity className="w-4 h-4" /> },
    { key: 'audit', label: 'Audit Logs', icon: <Database className="w-4 h-4" /> },
  ];

  // Map tabs to categories in the grouped settings
  const tabCategoryMap: Record<Tab, string[]> = {
    system: ['contact', 'general', 'system'],
    business: ['delivery', 'orders', 'finance', 'payments', 'loyalty', 'integrations'],
    notifications: ['notifications'],
    security: ['security'],
    health: [],
    audit: [],
  };

  const getSettingsForTab = (t: Tab): SystemSetting[] => {
    const cats = tabCategoryMap[t];
    return cats.flatMap((cat) => grouped[cat] || []);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  const systemSettings = getSettingsForTab(tab);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform configuration, maintenance, and monitoring.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.key
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* SYSTEM / BUSINESS / SECURITY — settings CRUD tabs */}
      {['system', 'business', 'security'].includes(tab) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">{tab} Settings</h2>
            <button
              onClick={() => setShowAddSetting(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Setting
            </button>
          </div>
          {systemSettings.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              No {tab} settings found. Use "Add Setting" to create one.
            </div>
          ) : (
            systemSettings.map((s) => (
              <SettingRow
                key={s.setting_id || s.key || s.setting_key}
                setting={s}
                onSave={handleSaveSetting}
                onDelete={handleDeleteSetting}
                saving={saving}
              />
            ))
          )}
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">My Notification Preferences</h2>
            <form onSubmit={handleSaveNotifPrefs}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Channels */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Channels</h3>
                  {(['email_enabled', 'sms_enabled', 'push_enabled', 'in_app_enabled'] as const).map((field) => (
                    <label key={field} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{field.replace('_enabled', '').replace('_', ' ')}</span>
                      <button
                        type="button"
                        onClick={() => setNotifPrefs((p) => ({ ...p, [field]: !p[field] }))}
                        className={`relative w-10 h-6 rounded-full transition-colors ${notifPrefs[field] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifPrefs[field] ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>
                  ))}
                </div>
                {/* Event types */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Event Types</h3>
                  {(['order_updates', 'delivery_updates', 'payment_updates', 'promotional', 'system_alerts', 'reminders'] as const).map((field) => (
                    <label key={field} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{field.replace(/_/g, ' ')}</span>
                      <button
                        type="button"
                        onClick={() => setNotifPrefs((p) => ({ ...p, [field]: !p[field] }))}
                        className={`relative w-10 h-6 rounded-full transition-colors ${notifPrefs[field] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifPrefs[field] ? 'translate-x-4' : ''}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={savingNotifPrefs}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingNotifPrefs ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>

          {/* Notification system settings */}
          {(grouped['notifications'] || []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notification System Settings</h2>
              </div>
              {(grouped['notifications'] || []).map((s) => (
                <SettingRow key={s.setting_id} setting={s} onSave={handleSaveSetting} onDelete={handleDeleteSetting} saving={saving} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEALTH & EVENTS TAB */}
      {tab === 'health' && (
        <div className="space-y-6">
          {/* Maintenance mode */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-yellow-500" />
                  Maintenance Mode
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  When enabled, the platform will display a maintenance notice to end users. Admin access is not affected.
                </p>
              </div>
              {maintenance && (
                <HealthBadge status={maintenance.enabled ? 'degraded' : 'healthy'} />
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Message (optional)</label>
                <input
                  type="text"
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  placeholder="We're performing scheduled maintenance. Back shortly!"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <button
                onClick={handleToggleMaintenance}
                disabled={togglingMaintenance}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-white text-sm font-medium disabled:opacity-50 ${
                  maintenance?.enabled ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                {togglingMaintenance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                {maintenance?.enabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
              </button>
            </div>
          </div>

          {/* Health status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                System Health
              </h2>
              {health && <HealthBadge status={health.status} />}
            </div>
            {health ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Memory</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{health.memoryUsageMb} MB</p>
                  </div>
                  {health.checks && Object.entries(health.checks).map(([service, check]: [string, any]) => (
                    <div key={service} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{service.replace(/([A-Z])/g, ' $1')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <HealthBadge status={check.status} />
                        {check.latencyMs !== undefined && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{check.latencyMs}ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Health data unavailable.</p>
            )}
          </div>

          {/* Cache clear */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-blue-500" />
              Cache Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Clears both the in-memory cache and Redis cache layers. Active user sessions are not affected.
            </p>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
            >
              {clearingCache ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {clearingCache ? 'Clearing…' : 'Clear All Cache'}
            </button>
          </div>

          {/* System events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">System Events</h2>
              <select
                value={eventSeverity}
                onChange={(e) => { setEventSeverity(e.target.value); setEventPage(1); }}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Event Type</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Severity</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {systemEvents.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No system events found.</td></tr>
                  ) : (
                    systemEvents.map((e) => (
                      <tr key={e.event_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-3 font-medium">{e.event_type}</td>
                        <td className="px-6 py-3 capitalize">{e.event_category}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            e.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                            e.severity === 'error' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                            e.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>{e.severity}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{e.source_system || '—'}</td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(e.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={eventPage} totalPages={eventTotalPages} onChange={setEventPage} />
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {tab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Audit Logs</h2>
            <select
              value={auditFilter}
              onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Entities</option>
              <option value="system_settings">System Settings</option>
              <option value="orders">Orders</option>
              <option value="users">Users</option>
              <option value="vendors">Vendors</option>
              <option value="riders">Riders</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-800 dark:text-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Performed By</th>
                  <th className="px-6 py-3">IP</th>
                  <th className="px-6 py-3">Path</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No audit logs found.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.action?.includes('delete') ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                          log.action?.includes('create') ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                          log.action?.includes('enable') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>{log.action}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{log.entity_type}</span>
                        {log.entity_id && <span className="ml-1 text-xs text-gray-400">#{log.entity_id}</span>}
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        {log.performed_by_type} {log.performed_by_id ? `#${log.performed_by_id}` : ''}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{log.ip_address || '—'}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{log.request_path || '—'}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={auditPage} totalPages={auditTotalPages} onChange={setAuditPage} />
        </div>
      )}

      {/* Add Setting Modal */}
      {showAddSetting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSetting(false)}>
          <form
            onSubmit={handleAddSetting}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Add Setting</h3>
              <button type="button" onClick={() => setShowAddSetting(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Key', field: 'key', placeholder: 'e.g. min_order_amount' },
                { label: 'Value', field: 'value', placeholder: 'e.g. 500' },
                { label: 'Description (optional)', field: 'description', placeholder: 'What this setting controls' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input
                    type="text"
                    value={(newSetting as any)[field]}
                    onChange={(e) => setNewSetting((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={newSetting.type}
                    onChange={(e) => setNewSetting((p) => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={newSetting.category}
                    onChange={(e) => setNewSetting((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {['general', 'delivery', 'orders', 'payments', 'finance', 'loyalty', 'integrations', 'contact', 'security', 'system', 'notifications'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAddSetting(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">
                Create Setting
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SettingPage;
