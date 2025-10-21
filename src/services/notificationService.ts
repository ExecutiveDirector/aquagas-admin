// src/services/notificationService.ts
import api from './api';
import type { ApiResponse } from '../types';

// ============================================
// NOTIFICATION CRUD
// ============================================

export interface Notification {
  notification_id: string;
  notification_type: string;
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_id?: string;
  template_id?: string;
  status: 'draft' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
}

export async function listNotifications(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<ApiResponse> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    
    const res = await api.get('/v1/admin/notifications', { params });
    console.log('🔔 Fetched notifications:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔔 List notifications error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch notifications');
  }
}

export async function getNotificationById(notificationId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/notifications/${notificationId}`);
    console.log('🔔 Fetched notification details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔔 Get notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch notification details');
  }
}

export async function createNotification(notificationData: {
  notification_type: string;
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_id?: string;
  template_id?: string;
  scheduled_at?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications', notificationData);
    console.log('🔔 Created notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔔 Create notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create notification');
  }
}

export async function updateNotification(
  notificationId: string,
  updates: {
    title?: string;
    content?: string;
    notification_type?: string;
    scheduled_at?: string;
  }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/notifications/${notificationId}`, updates);
    console.log('🔔 Updated notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔔 Update notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update notification');
  }
}

export async function deleteNotification(notificationId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/notifications/${notificationId}`);
    console.log('🔔 Deleted notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔔 Delete notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to delete notification');
  }
}

// ============================================
// SEND NOTIFICATIONS
// ============================================

export async function sendNotification(notificationId: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/notifications/${notificationId}/send`);
    console.log('📤 Sent notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📤 Send notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send notification');
  }
}

export async function sendBulkNotification(data: {
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_ids?: string[];
  notification_type?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/bulk-send', data);
    console.log('📤 Sent bulk notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📤 Send bulk notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send bulk notification');
  }
}

export async function scheduleNotification(data: {
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  scheduled_at: string;
  recipient_id?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/schedule', data);
    console.log('⏰ Scheduled notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⏰ Schedule notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to schedule notification');
  }
}

export async function cancelScheduledNotification(notificationId: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/notifications/${notificationId}/cancel`);
    console.log('❌ Cancelled scheduled notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Cancel notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to cancel notification');
  }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export interface NotificationTemplate {
  template_id: string;
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listNotificationTemplates(): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/notification-templates');
    console.log('📋 Fetched notification templates:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 List templates error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch notification templates');
  }
}

export async function getTemplateById(templateId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/notification-templates/${templateId}`);
    console.log('📋 Fetched template details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Get template error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch template details');
  }
}

export async function createNotificationTemplate(templateData: {
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notification-templates', templateData);
    console.log('📋 Created template:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Create template error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create template');
  }
}

export async function updateNotificationTemplate(
  templateId: string,
  updates: {
    name?: string;
    subject?: string;
    content?: string;
    variables?: string;
    is_active?: boolean;
  }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/notification-templates/${templateId}`, updates);
    console.log('📋 Updated template:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Update template error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update template');
  }
}

export async function deleteNotificationTemplate(templateId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/notification-templates/${templateId}`);
    console.log('📋 Deleted template:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📋 Delete template error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to delete template');
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export async function sendPushNotification(data: {
  user_ids?: string[];
  title: string;
  body: string;
  data?: any;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/push', data);
    console.log('📱 Sent push notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Send push notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send push notification');
  }
}

export async function sendTopicNotification(data: {
  topic: string;
  title: string;
  body: string;
  data?: any;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/topic', data);
    console.log('📱 Sent topic notification:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Send topic notification error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send topic notification');
  }
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

export async function sendEmail(data: {
  recipients: string[];
  subject: string;
  body: string;
  html?: string;
  template_id?: string;
  variables?: any;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/email', data);
    console.log('📧 Sent email:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📧 Send email error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send email');
  }
}

export async function sendBulkEmail(data: {
  recipient_type: 'all' | 'users' | 'vendors' | 'riders';
  subject: string;
  body: string;
  html?: string;
  filters?: any;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/email/bulk', data);
    console.log('📧 Sent bulk email:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📧 Send bulk email error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send bulk email');
  }
}

// ============================================
// SMS NOTIFICATIONS
// ============================================

export async function sendSMS(data: {
  phone_numbers: string[];
  message: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/sms', data);
    console.log('📱 Sent SMS:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Send SMS error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send SMS');
  }
}

export async function sendBulkSMS(data: {
  recipient_type: 'all' | 'users' | 'vendors' | 'riders';
  message: string;
  filters?: any;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/notifications/sms/bulk', data);
    console.log('📱 Sent bulk SMS:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Send bulk SMS error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to send bulk SMS');
  }
}

// ============================================
// NOTIFICATION ANALYTICS
// ============================================

export async function getNotificationStats(): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/notifications/stats');
    console.log('📊 Fetched notification stats:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get notification stats error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch notification stats');
  }
}

export async function getNotificationDeliveryReport(
  notificationId: string
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/notifications/${notificationId}/delivery-report`);
    console.log('📊 Fetched delivery report:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get delivery report error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch delivery report');
  }
}

// ============================================
// USER NOTIFICATION PREFERENCES
// ============================================

export async function getUserNotificationPreferences(userId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/notification-preferences`);
    console.log('⚙️ Fetched user notification preferences:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⚙️ Get preferences error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch notification preferences');
  }
}

export async function updateUserNotificationPreferences(
  userId: string,
  preferences: {
    email_notifications?: boolean;
    sms_notifications?: boolean;
    push_notifications?: boolean;
    order_updates?: boolean;
    promotional?: boolean;
  }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/users/${userId}/notification-preferences`, preferences);
    console.log('⚙️ Updated notification preferences:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⚙️ Update preferences error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update notification preferences');
  }
}

// Backward compatibility aliases
export const getNotificationDetails = getNotificationById;
export const getTemplateDetails = getTemplateById;

export default {
  listNotifications,
  getNotificationById,
  getNotificationDetails,
  createNotification,
  updateNotification,
  deleteNotification,
  sendNotification,
  sendBulkNotification,
  scheduleNotification,
  cancelScheduledNotification,
  listNotificationTemplates,
  getTemplateById,
  getTemplateDetails,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendPushNotification,
  sendTopicNotification,
  sendEmail,
  sendBulkEmail,
  sendSMS,
  sendBulkSMS,
  getNotificationStats,
  getNotificationDeliveryReport,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
};