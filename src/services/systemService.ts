// src/services/systemService.ts
import api from './api';
import type { ApiResponse } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SystemSetting {
  setting_id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  description?: string;
  is_public: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface SystemEvent {
  event_id: string;
  event_type: 'order_placed' | 'payment_completed' | 'delivery_assigned' | 'delivery_completed' | 'user_registered' | 'vendor_approved' | 'system_alert';
  event_category: 'business' | 'technical' | 'security' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  event_data?: any;
  related_entity_type?: 'order' | 'user' | 'vendor' | 'rider';
  related_entity_id?: string;
  source_system: string;
  correlation_id?: string;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  user_id?: string;
  user_type: 'admin' | 'vendor' | 'rider' | 'user' | 'system';
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// SYSTEM SETTINGS
// ============================================

export async function getSystemSettings(
  filters?: {
    category?: string;
    is_public?: boolean;
  }
): Promise<ApiResponse<SystemSetting[]>> {
  try {
    const params: any = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.is_public !== undefined) params.is_public = filters.is_public;
    
    const res = await api.get('/v1/admin/system/settings', { params });
    console.log('📋 Fetched system settings:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Get system settings error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch system settings');
  }
}

export async function getSystemSetting(settingKey: string): Promise<ApiResponse<SystemSetting>> {
  try {
    const res = await api.get(`/v1/admin/system/settings/${settingKey}`);
    console.log(`📋 Fetched setting ${settingKey}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📋 Get setting ${settingKey} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch setting');
  }
}

export async function updateSystemSettings(
  settings: Record<string, any>
): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/system/settings', settings);
    console.log('📋 Updated system settings:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Update system settings error:', error);
    throw new Error(error.response?.data?.error || 'Failed to update system settings');
  }
}

export async function updateSystemSetting(
  settingKey: string,
  settingValue: any
): Promise<ApiResponse<SystemSetting>> {
  try {
    const res = await api.put(`/v1/admin/system/settings/${settingKey}`, {
      setting_value: settingValue
    });
    console.log(`📋 Updated setting ${settingKey}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📋 Update setting ${settingKey} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to update setting');
  }
}

export async function createSystemSetting(data: {
  setting_key: string;
  setting_value: string;
  setting_type?: SystemSetting['setting_type'];
  description?: string;
  is_public?: boolean;
  category?: string;
}): Promise<ApiResponse<SystemSetting>> {
  try {
    const res = await api.post('/v1/admin/system/settings', data);
    console.log('📋 Created system setting:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Create system setting error:', error);
    throw new Error(error.response?.data?.error || 'Failed to create system setting');
  }
}

export async function deleteSystemSetting(settingKey: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/system/settings/${settingKey}`);
    console.log(`📋 Deleted setting ${settingKey}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📋 Delete setting ${settingKey} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to delete setting');
  }
}

// ============================================
// SYSTEM EVENTS
// ============================================

export async function getSystemEvents(
  page: number = 1,
  limit: number = 20,
  filters?: {
    event_type?: SystemEvent['event_type'];
    event_category?: SystemEvent['event_category'];
    severity?: SystemEvent['severity'];
    start_date?: string;
    end_date?: string;
    correlation_id?: string;
  }
): Promise<ApiResponse<SystemEvent[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/system/events', { params });
    console.log('📊 Fetched system events:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get system events error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch system events');
  }
}

export async function getSystemEventDetails(eventId: string): Promise<ApiResponse<SystemEvent>> {
  try {
    const res = await api.get(`/v1/admin/system/events/${eventId}`);
    console.log(`📊 Fetched event ${eventId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📊 Get event ${eventId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch event details');
  }
}

export async function createSystemEvent(data: {
  event_type: SystemEvent['event_type'];
  event_category: SystemEvent['event_category'];
  severity?: SystemEvent['severity'];
  event_data?: any;
  related_entity_type?: SystemEvent['related_entity_type'];
  related_entity_id?: string;
  source_system?: string;
  correlation_id?: string;
}): Promise<ApiResponse<SystemEvent>> {
  try {
    const res = await api.post('/v1/admin/system/events', data);
    console.log('📊 Created system event:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Create system event error:', error);
    throw new Error(error.response?.data?.error || 'Failed to create system event');
  }
}

// ============================================
// AUDIT LOGS
// ============================================

export async function getAuditLogs(
  page: number = 1,
  limit: number = 20,
  filters?: {
    user_id?: string;
    user_type?: AuditLog['user_type'];
    action_type?: string;
    entity_type?: string;
    entity_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<AuditLog[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/audit-logs', { params });
    console.log('📝 Fetched audit logs:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📝 Get audit logs error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch audit logs');
  }
}

export async function getAuditLogDetails(logId: string): Promise<ApiResponse<AuditLog>> {
  try {
    const res = await api.get(`/v1/admin/audit-logs/${logId}`);
    console.log(`📝 Fetched audit log ${logId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📝 Get audit log ${logId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch audit log details');
  }
}

// ============================================
// SYSTEM HEALTH & MONITORING
// ============================================

export async function getSystemHealth(): Promise<ApiResponse<{
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    database: boolean;
    cache: boolean;
    storage: boolean;
    payment_gateway: boolean;
  };
  uptime: number;
  last_check: string;
}>> {
  try {
    const res = await api.get('/v1/admin/system/health');
    console.log('🏥 System health:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏥 Get system health error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch system health');
  }
}

export async function getSystemMetrics(
  timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
): Promise<ApiResponse<{
  cpu_usage: number[];
  memory_usage: number[];
  disk_usage: number[];
  request_count: number[];
  error_rate: number[];
  response_time: number[];
  timestamps: string[];
}>> {
  try {
    const res = await api.get('/v1/admin/system/metrics', {
      params: { time_range: timeRange }
    });
    console.log('📈 System metrics:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📈 Get system metrics error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch system metrics');
  }
}

// ============================================
// SYSTEM MAINTENANCE
// ============================================

export async function enableMaintenanceMode(message?: string): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/system/maintenance/enable', { message });
    console.log('🔧 Maintenance mode enabled:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔧 Enable maintenance mode error:', error);
    throw new Error(error.response?.data?.error || 'Failed to enable maintenance mode');
  }
}

export async function disableMaintenanceMode(): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/system/maintenance/disable');
    console.log('🔧 Maintenance mode disabled:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔧 Disable maintenance mode error:', error);
    throw new Error(error.response?.data?.error || 'Failed to disable maintenance mode');
  }
}

export async function clearSystemCache(cacheType?: 'all' | 'redis' | 'application'): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/system/cache/clear', { cache_type: cacheType || 'all' });
    console.log('🗑️ Cache cleared:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🗑️ Clear cache error:', error);
    throw new Error(error.response?.data?.error || 'Failed to clear cache');
  }
}

// ---- SystemHealth type (used in settings.tsx) ----
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  checks: Record<string, { status: string; latencyMs?: number; error?: string; detail?: string; stats?: any }>;
}

// ---- Maintenance status ----
export async function getMaintenanceStatus(): Promise<ApiResponse<{ enabled: boolean; message?: string }>> {
  try {
    const res = await api.get('/v1/admin/system/maintenance');
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to get maintenance status');
  }
}

// ---- Admin notification preferences ----
export async function getNotificationPreferences(): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/system/notification-preferences');
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to get notification preferences');
  }
}

export async function updateNotificationPreferences(prefs: Record<string, boolean>): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/system/notification-preferences', prefs);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to update notification preferences');
  }
}

// Default export
export default {
  // Settings
  getSystemSettings,
  getSystemSetting,
  updateSystemSettings,
  updateSystemSetting,
  createSystemSetting,
  deleteSystemSetting,
  
  // Events
  getSystemEvents,
  getSystemEventDetails,
  createSystemEvent,
  
  // Audit Logs
  getAuditLogs,
  getAuditLogDetails,
  
  // Health & Monitoring
  getSystemHealth,
  getSystemMetrics,
  
  // Maintenance
  enableMaintenanceMode,
  disableMaintenanceMode,
  clearSystemCache,

  // Maintenance status & notification preferences (added for settings page)
  getMaintenanceStatus,
  updateNotificationPreferences,
};