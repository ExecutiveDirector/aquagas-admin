import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createRider } from '../../services/riderService';

interface NewRiderForm {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_registration?: string;
  driving_license_no?: string;
  license_expiry_date?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface CreateRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRiderCreated: () => void;
}

export default function CreateRiderModal({ isOpen, onClose, onRiderCreated }: CreateRiderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewRiderForm>({
    full_name: '',
    email: '',
    phone: '',
    vehicle_type: 'motorcycle',
    vehicle_registration: '',
    driving_license_no: '',
    license_expiry_date: '',
    national_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createRider(formData);
      
      // Reset form
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        vehicle_type: 'motorcycle',
        vehicle_registration: '',
        driving_license_no: '',
        license_expiry_date: '',
        national_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });

      onRiderCreated();
      toast.success('Rider created successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to create rider';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Rider</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="tuk_tuk">Tuk Tuk</option>
                <option value="van">Van</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>
            
            {/* Vehicle Registration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vehicle Registration
              </label>
              <input
                type="text"
                value={formData.vehicle_registration}
                onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Driving License */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Driving License No
              </label>
              <input
                type="text"
                value={formData.driving_license_no}
                onChange={(e) => setFormData({ ...formData, driving_license_no: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* License Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                License Expiry Date
              </label>
              <input
                type="date"
                value={formData.license_expiry_date}
                onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                National ID
              </label>
              <input
                type="text"
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Emergency Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* Emergency Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Creating...' : 'Create Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}