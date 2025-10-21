import React, { useEffect, useState } from 'react';
import {
  listNotifications,
  createNotification,
  sendNotification,
  deleteNotification,
  updateNotification,
  listNotificationTemplates,
} from '../../services/notificationService';
import { Bell } from 'lucide-react';

interface Notification {
  notification_id: string;
  notification_type: string;
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_id?: string;
  user_id?: string;
  vendor_id?: string;
  rider_id?: string;
  admin_id?: string;
  template_id?: string;
  is_sent: boolean;
  sent_at?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface NotificationTemplate {
  template_id: string;
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [formData, setFormData] = useState({
    notification_type: '',
    title: '',
    content: '',
    recipient_type: 'all' as 'user' | 'vendor' | 'rider' | 'all',
    recipient_id: '',
    template_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, templatesResponse] = await Promise.all([
        listNotifications(),
        listNotificationTemplates(),
      ]);
      setNotifications(notificationsResponse.data || []);
      setTemplates(templatesResponse.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNotification({
        notification_type: formData.notification_type,
        title: formData.title,
        content: formData.content,
        recipient_type: formData.recipient_type,
        recipient_id: formData.recipient_id || undefined,
        template_id: formData.template_id || undefined,
      });
      alert('Notification created successfully!');
      setFormData({
        notification_type: '',
        title: '',
        content: '',
        recipient_type: 'all',
        recipient_id: '',
        template_id: '',
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create notification');
    }
  };

  const handleSendNotification = async (id: string) => {
    if (!confirm('Are you sure you want to send this notification?')) return;
    try {
      await sendNotification(id);
      alert('Notification sent successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to send notification');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      await deleteNotification(id);
      alert('Notification deleted successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete notification');
    }
  };

  const handleUpdateNotification = async (id: string, updates: Partial<Notification>) => {
    try {
      await updateNotification(id, updates);
      alert('Notification updated successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update notification');
    }
  };

  const getRecipientDisplay = (notification: Notification) => {
    if (notification.recipient_type === 'all') return 'All Users';
    if (notification.recipient_type === 'user' && notification.user_id) return `User: ${notification.user_id}`;
    if (notification.recipient_type === 'vendor' && notification.vendor_id) return `Vendor: ${notification.vendor_id}`;
    if (notification.recipient_type === 'rider' && notification.rider_id) return `Rider: ${notification.rider_id}`;
    return notification.recipient_type;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Notifications ({notifications.length})</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No notifications found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.map((notification, index) => (
                      <tr key={notification.notification_id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/20' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{notification.notification_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{notification.notification_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{notification.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{getRecipientDisplay(notification)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={
                              notification.is_sent
                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                : 'text-yellow-600 dark:text-yellow-400 font-semibold'
                            }
                          >
                            {notification.is_sent ? 'Sent' : 'Pending'}
                          </span>
                          {notification.sent_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(notification.sent_at).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {!notification.is_sent && (
                            <button
                              onClick={() => handleSendNotification(notification.notification_id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Send
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notification.notification_id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              const newTitle = prompt('New title:', notification.title);
                              if (newTitle) {
                                handleUpdateNotification(notification.notification_id, { title: newTitle });
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'create':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Notification</h3>
            <form className="space-y-4 max-w-md" onSubmit={handleCreateNotification}>
              <input
                type="text"
                placeholder="Notification Type"
                value={formData.notification_type}
                onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <textarea
                placeholder="Content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
              />
              <select
                value={formData.recipient_type}
                onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value as 'user' | 'vendor' | 'rider' | 'all' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="user">Specific User</option>
                <option value="vendor">Specific Vendor</option>
                <option value="rider">Specific Rider</option>
              </select>
              {formData.recipient_type !== 'all' && (
                <input
                  type="text"
                  placeholder={`Recipient ID (${formData.recipient_type} ID)`}
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
              <select
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Template (Optional)</option>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Notification
              </button>
            </form>
          </div>
        );
      case 'templates':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Templates ({templates.length})</h3>
            {templates.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No templates found.</p>
            ) : (
              <ul className="space-y-4">
                {templates.map((template) => (
                  <li key={template.template_id} className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      <strong>Name:</strong> {template.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Type:</strong> {template.template_type}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Content:</strong> {template.content}
                    </p>
                    {template.variables && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Variables:</strong> {template.variables}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      default:
        return <div className="text-red-600 dark:text-red-400">Invalid tab</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading notifications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 mr-2" />
            <span className="text-lg font-semibold">Error</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Bell className="w-8 h-8 mr-3 text-blue-500" />
          Notifications Management
        </h1>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      <nav className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('list')}
        >
          Notifications List
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('create')}
        >
          Create Notification
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </nav>

      <main>{renderTabContent()}</main>
    </div>
  );
}