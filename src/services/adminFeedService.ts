// The signed-in admin's own notification feed (the bell).
import api from './api';

export interface AdminNotification {
  notification_id: string;
  title: string;
  message: string;
  priority?: string;
  is_read: boolean;
  related_entity_type?: string | null;
  related_entity_id?: string | number | null;
  created_at: string;
}

export interface AdminFeed {
  data: AdminNotification[];
  unread_count: number;
}

export async function fetchMyNotifications(limit = 20): Promise<AdminFeed> {
  const res = await api.get('/v1/admin/my-notifications', { params: { limit } });
  return { data: res.data?.data ?? [], unread_count: res.data?.unread_count ?? 0 };
}

export async function markMyNotificationRead(id: string | number): Promise<void> {
  await api.put(`/v1/admin/my-notifications/${id}/read`);
}

export async function markAllMyNotificationsRead(): Promise<void> {
  await api.post('/v1/admin/my-notifications/read-all');
}

/** Socket.IO lives on the API host, without the /api suffix. */
export function socketUrl(): string {
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return base || window.location.origin;
}
