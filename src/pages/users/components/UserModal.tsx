import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import toast from 'react-hot-toast';

interface UserModalProps {
  isOpen: boolean;
  user?: User;
  onClose: () => void;
  onSave: (data: Partial<User>) => Promise<void>;
  loading: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, user, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    password: user?.password || '',
    role: user?.role || 'user',
    status: user?.status || 'active',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      password: user?.password || '',
      role: user?.role || 'user',
      status: user?.status || 'active',
    });
    setErrors({});
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.email && !formData.phone_number) {
      newErrors.email = 'Either email or phone number is required';
      newErrors.phone_number = 'Either email or phone number is required';
    }
    if (!user && !formData.password) newErrors.password = 'Password is required for new users';
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.status) newErrors.status = 'Status is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSave({
        ...formData,
        role: formData.role?.toLowerCase() as any,
        status: formData.status?.toLowerCase() as any,
      });
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {user ? 'Edit User' : 'Add User'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.first_name ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.last_name ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input
              type="text"
              name="phone_number"
              placeholder="E.164 format (e.g., +254712345678)"
              value={formData.phone_number || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.phone_number ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.phone_number && <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>}
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              name="role"
              value={formData.role || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select Role</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="rider">Rider</option>
              <option value="vendor">Vendor</option>
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              name="status"
              value={formData.status || 'active'}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md px-3 py-2 border ${errors.status ? 'border-red-500' : 'border-gray-300'} dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} transition-colors`}
            >
              {loading ? 'Saving...' : user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;