import React, { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Plus, Search, Filter, Edit3, Trash2,
  Save, X, Eye, EyeOff, AlertTriangle, CheckCircle2, Info,
  Database, Shield, Bell, CreditCard, Truck
} from 'lucide-react';

// Define interface for system setting (updated to match your model)
interface SystemSetting {
  setting_id: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'payment' | 'delivery' | 'notification' | 'security';
  description?: string;
  is_public: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define interface for form data
interface SettingFormData {
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'payment' | 'delivery' | 'notification' | 'security';
  description?: string;
  is_public: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [filteredSettings, setFilteredSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPublic, setFilterPublic] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [formData, setFormData] = useState<SettingFormData>({
    setting_key: '',
    setting_value: '',
    setting_type: 'string',
    category: 'general',
    description: '',
    is_public: false,
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'success' | 'error', message: string}>>([]);

  const categories = [
    { value: 'general', label: 'General', icon: Database, color: 'bg-blue-500', description: 'Basic system settings' },
    { value: 'payment', label: 'Payment', icon: CreditCard, color: 'bg-green-500', description: 'Payment gateway settings' },
    { value: 'delivery', label: 'Delivery', icon: Truck, color: 'bg-orange-500', description: 'Delivery and logistics settings' },
    { value: 'notification', label: 'Notifications', icon: Bell, color: 'bg-purple-500', description: 'Notification preferences' },
    { value: 'security', label: 'Security', icon: Shield, color: 'bg-red-500', description: 'Security and authentication settings' },
  ];

  const typeOptions = [
    { value: 'string', label: 'Text', description: 'Plain text value' },
    { value: 'number', label: 'Number', description: 'Numeric value' },
    { value: 'boolean', label: 'Yes/No', description: 'True or false value' },
    { value: 'json', label: 'JSON', description: 'Complex structured data' },
  ];

  // Mock data for development - replace with actual API calls
  const mockSettings: SystemSetting[] = [
    {
      setting_id: 1,
      setting_key: 'max_order_amount',
      setting_value: '10000',
      setting_type: 'number',
      category: 'general',
      description: 'Maximum order amount allowed',
      is_public: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      setting_id: 2,
      setting_key: 'stripe_publishable_key',
      setting_value: 'pk_test_...',
      setting_type: 'string',
      category: 'payment',
      description: 'Stripe publishable key for payments',
      is_public: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      setting_id: 3,
      setting_key: 'enable_notifications',
      setting_value: 'true',
      setting_type: 'boolean',
      category: 'notification',
      description: 'Enable push notifications',
      is_public: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Filter settings when search query or filters change
  useEffect(() => {
    let filtered = settings;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(setting =>
        setting.setting_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setting.setting_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (setting.description && setting.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(setting => setting.category === filterCategory);
    }

    // Apply public/private filter
    if (filterPublic) {
      filtered = filtered.filter(setting => 
        setting.is_public === (filterPublic === 'true')
      );
    }

    setFilteredSettings(filtered);
  }, [settings, searchQuery, filterCategory, filterPublic]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSettings(mockSettings);
      showNotification('success', 'Settings loaded successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
      showNotification('error', err.message || 'Failed to fetch settings');
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

  const validateForm = (): boolean => {
    if (!formData.setting_key.trim()) {
      showNotification('error', 'Key is required');
      return false;
    }
    if (!formData.setting_value.trim()) {
      showNotification('error', 'Value is required');
      return false;
    }
    if (formData.setting_type === 'json') {
      try {
        JSON.parse(formData.setting_value);
      } catch {
        showNotification('error', 'Invalid JSON format');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError(null);
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (editingSetting) {
        // Update existing setting
        setSettings(prev => prev.map(setting => 
          setting.setting_id === editingSetting.setting_id 
            ? { 
                ...setting, 
                setting_key: formData.setting_key,
                setting_value: formData.setting_value,
                setting_type: formData.setting_type,
                category: formData.category,
                description: formData.description,
                is_public: formData.is_public,
                updatedAt: new Date().toISOString()
              }
            : setting
        ));
        showNotification('success', `Setting '${formData.setting_key}' updated successfully`);
      } else {
        // Create new setting
        const newSetting: SystemSetting = {
          setting_id: Math.max(...settings.map(s => s.setting_id)) + 1,
          setting_key: formData.setting_key,
          setting_value: formData.setting_value,
          setting_type: formData.setting_type,
          category: formData.category,
          description: formData.description,
          is_public: formData.is_public,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setSettings(prev => [...prev, newSetting]);
        showNotification('success', `Setting '${formData.setting_key}' created successfully`);
      }

      handleCancel();
    } catch (err: any) {
      setError(err.message || 'Failed to save setting');
      showNotification('error', err.message || 'Failed to save setting');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setFormData({
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      setting_type: setting.setting_type,
      category: setting.category,
      description: setting.description || '',
      is_public: setting.is_public,
    });
    setShowForm(true);
  };

  const handleDelete = async (settingId: number, key: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the setting '${key}'?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSettings(prev => prev.filter(s => s.setting_id !== settingId));
      showNotification('success', `Setting '${key}' deleted successfully`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete setting');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      setting_key: '',
      setting_value: '',
      setting_type: 'string',
      category: 'general',
      description: '',
      is_public: false,
    });
    setEditingSetting(null);
    setShowForm(false);
    setError(null);
  };

  const getCategoryConfig = (category: string) => {
    return categories.find(cat => cat.value === category) || categories[0];
  };

  const formatValue = (value: string, type: string) => {
    if (type === 'json') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    if (type === 'boolean') {
      return value === 'true' ? 'Yes' : 'No';
    }
    return value;
  };

  const getStatsByCategory = () => {
    const stats = categories.map(category => ({
      ...category,
      count: settings.filter(s => s.category === category.value).length
    }));
    return stats;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
                notification.type === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">Configure and manage your application settings</p>
            </div>
          </div>
          
          {/* Category Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {getStatsByCategory().map((category) => {
              const IconComponent = category.icon;
              return (
                <motion.div
                  key={category.value}
                  whileHover={{ scale: 1.02 }}
                  className={`${category.color} bg-opacity-10 dark:bg-opacity-20 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                    filterCategory === category.value ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setFilterCategory(filterCategory === category.value ? '' : category.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${category.color.replace('bg-', 'text-')}`}>
                        {category.count}
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {category.label}
                      </p>
                    </div>
                    <IconComponent className={`h-6 w-6 ${category.color.replace('bg-', 'text-')}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors ${
                    showFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter size={16} />
                  Filters
                </button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm"
                  disabled={loading}
                >
                  <Plus size={16} />
                  Add Setting
                </motion.button>
              </div>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Visibility
                    </label>
                    <select
                      value={filterPublic}
                      onChange={(e) => setFilterPublic(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">All</option>
                      <option value="true">Public</option>
                      <option value="false">Private</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Settings Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && handleCancel()}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {editingSetting ? 'Edit Setting' : 'Create New Setting'}
                    </h2>
                    <button
                      onClick={handleCancel}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="setting_key"
                        value={formData.setting_key}
                        onChange={handleInputChange}
                        disabled={!!editingSetting}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        maxLength={100}
                        placeholder="e.g., max_order_amount"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="setting_type"
                        value={formData.setting_type}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {typeOptions.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {typeOptions.find(t => t.value === formData.setting_type)?.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Value <span className="text-red-500">*</span>
                    </label>
                    {formData.setting_type === 'json' ? (
                      <textarea
                        name="setting_value"
                        value={formData.setting_value}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                        required
                        rows={6}
                        placeholder='{"key": "value"}'
                      />
                    ) : formData.setting_type === 'boolean' ? (
                      <select
                        name="setting_value"
                        value={formData.setting_value}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <input
                        type={formData.setting_type === 'number' ? 'number' : 'text'}
                        name="setting_value"
                        value={formData.setting_value}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                        placeholder={formData.setting_type === 'number' ? '0' : 'Enter value'}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {categories.find(c => c.value === formData.category)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                      placeholder="Describe what this setting does..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="is_public"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Public Setting
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Public settings can be accessed by client applications
                      </p>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {editingSetting ? 'Update Setting' : 'Create Setting'}
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Grid */}
        <div className="space-y-4">
          {loading && !showForm ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
            </div>
          ) : filteredSettings.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || filterCategory || filterPublic ? 'No settings found' : 'No settings configured'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery || filterCategory || filterPublic 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first system setting'
                }
              </p>
              {!searchQuery && !filterCategory && !filterPublic && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create First Setting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSettings.map((setting) => {
                const categoryConfig = getCategoryConfig(setting.category);
                const IconComponent = categoryConfig.icon;

                return (
                  <motion.div
                    key={setting.setting_id}
                    layout
                    whileHover={{ y: -2 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryConfig.color} bg-opacity-10 dark:bg-opacity-20`}>
                          <IconComponent className={`h-5 w-5 ${categoryConfig.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {setting.setting_key}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.color} bg-opacity-10 dark:bg-opacity-20 ${categoryConfig.color.replace('bg-', 'text-')}`}>
                              {categoryConfig.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              {setting.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
                              {setting.is_public ? 'Public' : 'Private'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                              {setting.setting_type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEdit(setting)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          disabled={loading}
                          title="Edit setting"
                        >
                          <Edit3 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(setting.setting_id, setting.setting_key)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          disabled={loading}
                          title="Delete setting"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value:</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                          {formatValue(setting.setting_value, setting.setting_type)}
                        </pre>
                      </div>
                    </div>

                    {setting.description && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description:</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {setting.description}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span>Created: {new Date(setting.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(setting.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {settings.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Settings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {settings.filter(s => s.is_public).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Public</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {settings.filter(s => !s.is_public).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Private</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(settings.map(s => s.category)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;