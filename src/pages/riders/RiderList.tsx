import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  Phone, 
  Eye, 
  UserPlus, 
  CheckCircle,
  Key,
  Star,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { 
  listRiders, 
  updateRiderStatus, 
  approveRider, 
  resetRiderPassword
} from '../../services/adminService';
import CreateRiderModal from './CreateRiderModal';

// Enhanced Rider interface
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

interface RidersListProps {
  onViewDetails: (rider: Rider) => void;
  onNavigateToAnalytics: () => void;
  onNavigateToMap: () => void;
}

export default function RidersListPage({ onViewDetails, onNavigateToAnalytics, onNavigateToMap }: RidersListProps) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listRiders();
      setRiders(response.data || []);
    } catch (err: any) {
      console.error('Riders fetch error:', err);
      setError(err?.response?.data?.error || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (riderId: string, status: string) => {
    try {
      setError(null);
      await updateRiderStatus(riderId, { status });
      await fetchRiders();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update rider status');
    }
  };

  const handleApproveRider = async (riderId: string) => {
    try {
      setError(null);
      await approveRider(riderId);
      await fetchRiders();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve rider');
    }
  };

  const handleResetPassword = async (riderId: string, email: string) => {
    if (window.confirm(`Reset password for ${email}?`)) {
      try {
        setError(null);
        await resetRiderPassword(riderId);
        alert('Password reset email sent successfully');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to reset rider password');
      }
    }
  };

  const handleRiderCreated = () => {
    setShowCreateModal(false);
    fetchRiders();
  };

  // Filter riders based on search and filter criteria
  const filteredRiders = riders.filter(rider => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (rider.full_name || '').toLowerCase().includes(searchLower) ||
      (rider.phone || '').includes(searchTerm) ||
      (rider.email || rider.account?.email || '').toLowerCase().includes(searchLower) ||
      (rider.national_id || '').includes(searchTerm) ||
      (rider.vehicle_registration || '').toLowerCase().includes(searchLower)
    );

    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'active') return matchesSearch && rider.current_status === 'available';
    if (selectedFilter === 'inactive') return matchesSearch && rider.current_status === 'offline';
    if (selectedFilter === 'verified') return matchesSearch && rider.is_verified;
    if (selectedFilter === 'pending') return matchesSearch && !rider.is_verified;
    if (selectedFilter === 'busy') return matchesSearch && (rider.current_status === 'busy' || rider.current_status === 'on_delivery');
    
    return matchesSearch;
  });

  // Utility functions
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

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorcycle': return '🏍️';
      case 'bicycle': return '🚲';
      case 'tuk_tuk': return '🛺';
      case 'van': return '🚐';
      case 'pickup': return '🚚';
      default: return '🚗';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading riders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Truck className="w-8 h-8 mr-3 text-blue-500" />
            Riders Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and monitor platform riders ({filteredRiders.length} total)
          </p>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onNavigateToMap}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Truck className="w-4 h-4 mr-1 inline" />
            Map View
          </button>
          <button
            onClick={onNavigateToAnalytics}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Truck className="w-4 h-4 mr-1 inline" />
            Analytics
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-1 inline" />
            Add Rider
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search riders by name, phone, email, ID, or vehicle registration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Riders</option>
              <option value="active">Available</option>
              <option value="busy">Busy/On Delivery</option>
              <option value="inactive">Offline</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending Verification</option>
            </select>
          </div>
        </div>
      </div>

      {/* Riders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact & Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle & Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verification</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRiders.map((rider) => (
                <tr key={rider.rider_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {rider.full_name?.[0]?.toUpperCase() || 'R'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {rider.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {rider.rider_id}
                        </div>
                        {rider.national_id && (
                          <div className="text-xs text-gray-400">
                            National ID: {rider.national_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {rider.phone || rider.account?.phone_number || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {rider.email || rider.account?.email || 'N/A'}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rider.current_status)}`}>
                        {rider.current_status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <div className="text-xs text-gray-400">
                        Joined: {formatDate(rider.created_at)}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getVehicleIcon(rider.vehicle_type)}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {rider.vehicle_type?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      {rider.vehicle_registration && (
                        <div className="text-xs text-gray-500">
                          Reg: {rider.vehicle_registration}
                        </div>
                      )}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          <span className="text-sm">{rider.rating ? Number(rider.rating).toFixed(1) : '0.0'}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {rider.total_deliveries || 0} deliveries
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rider.is_verified 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {rider.is_verified ? 'Verified' : 'Pending'}
                      </span>
                      {rider.driving_license_no && (
                        <div className="text-xs text-gray-500">
                          License: {rider.driving_license_no}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onViewDetails(rider)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        View
                      </button>
                      
                      {!rider.is_verified && (
                        <button
                          onClick={() => handleApproveRider(rider.rider_id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Verify
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleUpdateStatus(
                          rider.rider_id, 
                          rider.current_status === 'available' ? 'offline' : 'available'
                        )}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          rider.current_status === 'available'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={rider.current_status === 'busy' || rider.current_status === 'on_delivery'}
                      >
                        {rider.current_status === 'available' ? 'Set Offline' : 'Set Available'}
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(rider.rider_id, rider.email || rider.account?.email || '')}
                        className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
                      >
                        <Key className="w-3 h-3 inline mr-1" />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRiders.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No riders found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No riders have been registered yet'}
            </p>
          </div>
        )}
      </div>

      {/* Create Rider Modal */}
      <CreateRiderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRiderCreated={handleRiderCreated}
      />
    </div>
  );
}