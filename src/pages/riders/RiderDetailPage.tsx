import React, { useEffect, useState } from 'react';
import { 
  Settings,
  TrendingUp,
  AlertTriangle,
  Activity,
  CheckCircle,
  Key,
  BarChart
} from 'lucide-react';
import { 
  updateRiderStatus, 
  approveRider, 
  resetRiderPassword,
  getRiderAnalytics
} from '../../services/adminService';

interface Rider {
  rider_id: string;
  account_id?: string;
  vendor_id?: string | null;
  employee_id?: string | null;
  vehicle_type: string;
  vehicle_registration?: string | null;
  driving_license_no?: string | null;
  license_expiry_date?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  rating: number;
  total_reviews: number;
  total_deliveries: number;
  current_status: 'offline' | 'available' | 'busy' | 'on_delivery' | 'on_break';
  max_delivery_distance_km: number;
  vehicle_capacity_kg: number;
  commission_rate: number;
  is_verified: boolean;
  is_active: boolean;
  last_location_update?: string | null;
  full_name?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  account?: {
    email: string;
    phone_number: string;
    is_active: boolean;
  };
}

interface RiderAnalytics {
  analytics_id: string;
  rider_id: string;
  report_date: string;
  completed_deliveries: number;
  total_distance_km: number;
  total_delivery_time_minutes: number;
  online_time_minutes: number;
  total_earnings: number;
  delivery_fees: number;
  tips_received: number;
}

interface RiderDetailsPageProps {
  rider: Rider;
  onBack: () => void;
  onRiderUpdated: () => void;
}

export default function RiderDetailsPage({ rider, onBack, onRiderUpdated }: RiderDetailsPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<RiderAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    loadRiderAnalytics();
  }, [rider.rider_id]);

  const loadRiderAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await getRiderAnalytics(rider.rider_id);
      setAnalytics(response.data || []);
    } catch (err) {
      console.error('Failed to load rider analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      await updateRiderStatus(rider.rider_id, { status: newStatus });
      onRiderUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update rider status');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRider = async () => {
    setLoading(true);
    setError(null);
    try {
      await approveRider(rider.rider_id);
      onRiderUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve rider');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = rider.email || rider.account?.email || '';
    if (window.confirm(`Reset password for ${email}?`)) {
      setLoading(true);
      setError(null);
      try {
        await resetRiderPassword(rider.rider_id);
        alert('Password reset email sent successfully');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to reset rider password');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'busy':
      case 'on_delivery':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'on_break':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to List
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {rider.full_name} - Rider Details
        </h2>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Basic Information
          </h3>
          <div className="space-y-3">
            <div><strong>Name:</strong> {rider.full_name || 'N/A'}</div>
            <div><strong>Email:</strong> {rider.email || rider.account?.email || 'N/A'}</div>
            <div><strong>Phone:</strong> {rider.phone || rider.account?.phone_number || 'N/A'}</div>
            <div><strong>National ID:</strong> {rider.national_id || 'N/A'}</div>
            <div><strong>Vehicle Type:</strong> {rider.vehicle_type || 'N/A'}</div>
            <div><strong>Vehicle Registration:</strong> {rider.vehicle_registration || 'N/A'}</div>
            <div><strong>License Number:</strong> {rider.driving_license_no || 'N/A'}</div>
            <div><strong>License Expiry:</strong> {formatDate(rider.license_expiry_date)}</div>
            <div><strong>Joined:</strong> {formatDate(rider.created_at)}</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {rider.rating ? Number(rider.rating).toFixed(1) : '0.0'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {rider.total_deliveries || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Deliveries</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {rider.max_delivery_distance_km || 0}km
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Max Distance</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {rider.commission_rate ? (Number(rider.commission_rate) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Commission Rate</div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Emergency Contact
          </h3>
          <div className="space-y-3">
            <div><strong>Name:</strong> {rider.emergency_contact_name || 'N/A'}</div>
            <div><strong>Phone:</strong> {rider.emergency_contact_phone || 'N/A'}</div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Status & Actions
          </h3>
          <div className="space-y-4">
            <div>
              <strong>Current Status:</strong>
              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rider.current_status)}`}>
                {rider.current_status?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div>
              <strong>Verification Status:</strong>
              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                rider.is_verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {rider.is_verified ? 'Verified' : 'Pending'}
              </span>
            </div>
            
            <div className="flex gap-2 pt-4">
              {!rider.is_verified && (
                <button
                  onClick={handleApproveRider}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Verify Rider
                </button>
              )}
              <button
                onClick={() => handleUpdateStatus(
                  rider.current_status === 'available' ? 'offline' : 'available'
                )}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  rider.current_status === 'available'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {rider.current_status === 'available' ? 'Set Offline' : 'Set Available'}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Key className="w-4 h-4 inline mr-2" />
                Reset Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {analytics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChart className="w-5 h-5 mr-2" />
            Recent Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.slice(0, 3).map((analyticsItem) => (
              <div key={analyticsItem.analytics_id} className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {formatDate(analyticsItem.report_date)}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Deliveries:</span>
                    <span className="text-sm font-medium">{analyticsItem.completed_deliveries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Distance:</span>
                    <span className="text-sm font-medium">{analyticsItem.total_distance_km || 0}km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Earnings:</span>
                    <span className="text-sm font-medium">${Number(analyticsItem.total_earnings || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Online Time:</span>
                    <span className="text-sm font-medium">{Math.round((analyticsItem.online_time_minutes || 0) / 60)}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analyticsLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
}