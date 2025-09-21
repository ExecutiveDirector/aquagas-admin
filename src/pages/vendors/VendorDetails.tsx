import React, { useState } from 'react';
import { Building2, MapPin, Phone, Mail, Star, Shield, Crown, DollarSign, Clock, Truck } from 'lucide-react';

interface Vendor {
  vendor_id: string;
  business_name: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
  contact_person: string;
  business_phone?: string;
  business_email?: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_featured: boolean;
  commission_rate: number;
  minimum_order_amount: number;
  delivery_radius_km: number;
  average_prep_time_minutes: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateVendorFormData {
  business_name: string;
  contact_person: string;
  business_phone: string;
  business_email: string;
  trading_name: string;
}

interface VendorDetailsProps {
  vendor: Vendor;
  onUpdate: (data: UpdateVendorFormData) => Promise<void>;
  loading?: boolean;
}

export default function VendorDetails({ vendor, onUpdate, loading }: VendorDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateVendorFormData>({
    business_name: vendor.business_name || '',
    contact_person: vendor.contact_person || '',
    business_phone: vendor.business_phone || '',
    business_email: vendor.business_email || '',
    trading_name: vendor.trading_name || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleCancel = () => {
    setFormData({
      business_name: vendor.business_name || '',
      contact_person: vendor.contact_person || '',
      business_phone: vendor.business_phone || '',
      business_email: vendor.business_email || '',
      trading_name: vendor.trading_name || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {vendor.business_name}
          </h2>
          {vendor.trading_name && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Trading as: {vendor.trading_name}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {vendor.is_verified && (
            <div className="flex items-center bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-3 py-1 rounded-full text-sm">
              <Shield className="w-4 h-4 mr-1" />
              Verified
            </div>
          )}
          {vendor.is_featured && (
            <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-3 py-1 rounded-full text-sm">
              <Crown className="w-4 h-4 mr-1" />
              Featured
            </div>
          )}
          <div className={`px-3 py-1 rounded-full text-sm ${
            vendor.is_active 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
          }`}>
            {vendor.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Vendor Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Star className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Rating</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {vendor.rating.toFixed(1)}/5.0
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {vendor.total_reviews} reviews
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Commission</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {(vendor.commission_rate * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Prep Time</p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {vendor.average_prep_time_minutes}min
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Delivery</p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {vendor.delivery_radius_km}km
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Update Form or Details Display */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Business Information
          </h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Details
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={formData.trading_name}
                  onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={formData.business_phone}
                  onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Vendor'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Vendor ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.vendor_id}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Business Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.business_email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Business Phone</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.business_phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contact Person</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.contact_person}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Min Order Amount</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.currency} {vendor.minimum_order_amount}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Brand</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.brand || 'Independent'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(vendor.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(vendor.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}