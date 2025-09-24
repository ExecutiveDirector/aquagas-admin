import React, { useState, useEffect, type FormEvent } from 'react';
import { getSystemSettings, updateSystemSettings, type ApiResponse } from '../../services/adminService';
import { toast } from 'react-toastify';

// Define interface for system setting
interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'payment' | 'delivery' | 'notification' | 'security';
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Define interface for form data
interface SettingFormData {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'payment' | 'delivery' | 'notification' | 'security';
  description?: string;
  is_public: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPublic, setFilterPublic] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [formData, setFormData] = useState<SettingFormData>({
    key: '',
    value: '',
    type: 'string',
    category: 'general',
    description: '',
    is_public: false,
  });

  // Fetch settings on mount and when filters change
  useEffect(() => {
    fetchSettings();
  }, [filterCategory, filterPublic]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<SystemSetting[]> = await getSystemSettings();
      setSettings(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
      toast.error(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        key: formData.key,
        value: formData.value,
        type: formData.type,
        category: formData.category,
        description: formData.description || undefined,
        is_public: formData.is_public,
      };

      if (editingSetting) {
        // Update existing setting
        await updateSystemSettings({ [formData.key]: payload });
        toast.success(`Setting '${formData.key}' updated successfully`);
      } else {
        // Create new setting
        await updateSystemSettings(payload);
        toast.success(`Setting '${formData.key}' created successfully`);
      }

      setFormData({
        key: '',
        value: '',
        type: 'string',
        category: 'general',
        description: '',
        is_public: false,
      });
      setEditingSetting(null);
      setShowForm(false);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save setting');
      toast.error(err.message || 'Failed to save setting');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setFormData({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      category: setting.category,
      description: setting.description || '',
      is_public: setting.is_public,
    });
    setShowForm(true);
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete the setting '${key}'?`)) return;

    setLoading(true);
    setError(null);
    try {
      await updateSystemSettings({ key, _delete: true });
      toast.success(`Setting '${key}' deleted successfully`);
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete setting');
      toast.error(err.message || 'Failed to delete setting');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      key: '',
      value: '',
      type: 'string',
      category: 'general',
      description: '',
      is_public: false,
    });
    setEditingSetting(null);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Filter by Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">All Categories</option>
            <option value="general">General</option>
            <option value="payment">Payment</option>
            <option value="delivery">Delivery</option>
            <option value="notification">Notification</option>
            <option value="security">Security</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Filter by Visibility</label>
          <select
            value={filterPublic}
            onChange={(e) => setFilterPublic(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">All</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Setting Button */}
      <button
        onClick={() => setShowForm(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        Add New Setting
      </button>

      {/* Settings Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-white shadow rounded-lg">
          <h2 className="text-lg font-semibold mb-4">
            {editingSetting ? 'Edit Setting' : 'Create New Setting'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Key</label>
              <input
                type="text"
                name="key"
                value={formData.key}
                onChange={handleInputChange}
                disabled={!!editingSetting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Value</label>
              <input
                type={formData.type === 'number' ? 'number' : 'text'}
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="delivery">Delivery</option>
                <option value="notification">Notification</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={4}
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData .is_public}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Is Public</span>
              </label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingSetting ? 'Update Setting' : 'Create Setting'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Public</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : settings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No settings found
                </td>
              </tr>
            ) : (
              settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{setting.key}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {setting.type === 'json' ? JSON.stringify(setting.value) : setting.value}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{setting.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{setting.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{setting.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {setting.is_public ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(setting)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(setting.key)}
                      className="text-red-600 hover:text-red-800"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Settings;
