import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  Phone, 
  Eye, 
  BarChart, 
  UserPlus, 
  Key,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Star,
  Navigation,
  Activity
} from 'lucide-react';
import { 
  listRiders, 
  updateRiderStatus, 
  approveRider, 
  resetRiderPassword, 
  createRider,
  getRiderDetails,
  getRiderAnalytics,
  getRiderOrders
} from '../../services/riderService';

// Enhanced Rider interface matching your backend model
interface Rider {
  rider_id: string;
  account_id?: string;
  vendor_id?: string | null;
  employee_id?: string | null;
  vehicle_type: string;
  vehicle_registration?: string | null;
  driving_license_no?: string | null;
  license_expiry_date?: string | null;
  insurance_policy_no?: string | null;
  insurance_expiry_date?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  rating: number;
  total_reviews: number;
  total_deliveries: number;
  current_status: 'offline' | 'available' | 'busy' | 'on_delivery' | 'on_break';
  max_delivery_distance_km: number;
  vehicle_capacity_kg: number;
  hourly_rate?: number | null;
  commission_rate: number;
  verification_documents?: string | null;
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

interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

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

type ViewMode = 'list' | 'details' | 'analytics' | 'create' | 'map';

export default function EnhancedRidersPage() {
  // State management
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [riderAnalytics, setRiderAnalytics] = useState<RiderAnalytics[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [newRider, setNewRider] = useState<NewRiderForm>({
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

  // Load riders on component mount
  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listRiders() as ApiResponse<Rider[]>;
      setRiders(response.data || []);
    } catch (err: any) {
      console.error('Riders fetch error:', err);
      setError(err?.response?.data?.error || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    riderId: string,
    status: 'active' | 'inactive' | 'pending' | 'busy'
  ) => {
    try {
      setError(null);
      await updateRiderStatus(riderId, status); // pass status directly
      await fetchRiders();
    } catch (err: any) {
      setError(err?.message || 'Failed to update rider status');
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

  const handleCreateRider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await createRider(newRider);
      setShowCreateModal(false);
      setNewRider({
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
      await fetchRiders();
      alert('Rider created successfully');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create rider');
    }
  };

  const handleViewRiderDetails = async (rider: Rider) => {
    setSelectedRider(rider);
    setViewMode('details');
    
    // Load rider analytics if available
    try {
      const analytics = await getRiderAnalytics(rider.rider_id);
      setRiderAnalytics(analytics.data || []);
    } catch (err) {
      console.error('Failed to load rider analytics:', err);
    }
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

  // Render functions for different views
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Truck className="w-8 h-8 mr-3 text-blue-500" />
          Riders Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and monitor platform riders ({filteredRiders.length} total)
        </p>
      </div>
      
      {/* View Mode Navigation */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Truck className="w-4 h-4 mr-1 inline" />
          List
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'map' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <MapPin className="w-4 h-4 mr-1 inline" />
          Map
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'analytics' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <BarChart className="w-4 h-4 mr-1 inline" />
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
  );

  const renderSearchAndFilters = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
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
  );

  const renderRidersList = () => (
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
                      onClick={() => handleViewRiderDetails(rider)}
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
    rider.current_status === 'available' ? 'inactive' : 'active' // map to API statuses
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
  );

  const renderRiderDetails = () => {
    if (!selectedRider) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('list')}
            className="text-blue-600 hover:text-blue-700 flex items-center"
          >
            ← Back to List
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {selectedRider.full_name} - Rider Details
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            <div className="space-y-3">
              <div><strong>Name:</strong> {selectedRider.full_name}</div>
              <div><strong>Email:</strong> {selectedRider.email || selectedRider.account?.email}</div>
              <div><strong>Phone:</strong> {selectedRider.phone || selectedRider.account?.phone_number}</div>
              <div><strong>National ID:</strong> {selectedRider.national_id || 'N/A'}</div>
              <div><strong>Vehicle Type:</strong> {selectedRider.vehicle_type}</div>
              <div><strong>Vehicle Registration:</strong> {selectedRider.vehicle_registration || 'N/A'}</div>
              <div><strong>License Number:</strong> {selectedRider.driving_license_no || 'N/A'}</div>
              <div>
  <strong>License Expiry:</strong> {selectedRider.license_expiry_date ? formatDate(selectedRider.license_expiry_date) : 'N/A'}
</div>
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
                  {selectedRider.rating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {selectedRider.total_deliveries}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Deliveries</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {selectedRider.max_delivery_distance_km}km
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Max Distance</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(selectedRider.commission_rate * 100).toFixed(1)}%
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
              <div><strong>Name:</strong> {selectedRider.emergency_contact_name || 'N/A'}</div>
              <div><strong>Phone:</strong> {selectedRider.emergency_contact_phone || 'N/A'}</div>
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
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRider.current_status)}`}>
                  {selectedRider.current_status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <strong>Verification Status:</strong>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedRider.is_verified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedRider.is_verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              
              <div className="flex gap-2 pt-4">
                {!selectedRider.is_verified && (
                  <button
                    onClick={() => handleApproveRider(selectedRider.rider_id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Verify Rider
                  </button>
                )}
<button
  onClick={() =>
    handleUpdateStatus(
      selectedRider.rider_id,
      selectedRider.current_status === 'available' ? 'inactive' : 'active' // map to API status
    )
  }
  className={`px-4 py-2 rounded-lg transition-colors ${
    selectedRider.current_status === 'available'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-green-600 text-white hover:bg-green-700'
  }`}
>
  {selectedRider.current_status === 'available' ? 'Set Offline' : 'Set Available'}
</button>

                <button
                  onClick={() => handleResetPassword(selectedRider.rider_id, selectedRider.email || selectedRider.account?.email || '')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Key className="w-4 h-4 inline mr-2" />
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {riderAnalytics.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <BarChart className="w-5 h-5 mr-2" />
              Recent Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riderAnalytics.slice(0, 3).map((analytics, index) => (
                <div key={analytics.analytics_id} className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {formatDate(analytics.report_date)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Deliveries:</span>
                      <span className="text-sm font-medium">{analytics.completed_deliveries || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Distance:</span>
                      <span className="text-sm font-medium">{analytics.total_distance_km || 0}km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Earnings:</span>
                      <span className="text-sm font-medium">${Number(analytics.total_earnings || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Online Time:</span>
                      <span className="text-sm font-medium">{Math.round((analytics.online_time_minutes || 0) / 60)}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalyticsDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Riders Analytics Dashboard</h2>
        <button
          onClick={() => setViewMode('list')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to List
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Riders</p>
              <p className="text-3xl font-bold">{riders.length}</p>
            </div>
            <Truck className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Active Riders</p>
              <p className="text-3xl font-bold">
                {riders.filter(r => r.current_status === 'available').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Busy Riders</p>
              <p className="text-3xl font-bold">
                {riders.filter(r => r.current_status === 'busy' || r.current_status === 'on_delivery').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Verified</p>
              <p className="text-3xl font-bold">
                {riders.filter(r => r.is_verified).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Performance Overview</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <div className="text-center">
            <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Analytics charts would be integrated here</p>
            <p className="text-sm text-gray-400">Connect to your analytics service for detailed insights</p>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Performing Riders</h3>
        <div className="space-y-4">
          {riders
            .sort((a, b) => (b.rating * b.total_deliveries) - (a.rating * a.total_deliveries))
            .slice(0, 5)
            .map((rider, index) => (
              <div key={rider.rider_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900 dark:text-white">{rider.full_name}</p>
                    <p className="text-sm text-gray-500">{rider.total_deliveries} deliveries</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="font-medium">{rider.rating.toFixed(1)}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(rider.current_status)}`}>
                    {rider.current_status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderMapView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Riders Location Map</h2>
        <button
          onClick={() => setViewMode('list')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Interactive map would be displayed here</p>
            <p className="text-sm text-gray-400">Showing real-time rider locations and status</p>
          </div>
        </div>
      </div>

      {/* Active Riders List for Map */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Riders</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders
            .filter(rider => rider.current_status !== 'offline')
            .map(rider => (
              <div key={rider.rider_id} className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{rider.full_name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(rider.current_status)}`}>
                    {rider.current_status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <Navigation className="w-3 h-3 mr-1" />
                    Last updated: {rider.last_location_update ? formatDate(rider.last_location_update) : 'Never'}
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg mr-1">{getVehicleIcon(rider.vehicle_type)}</span>
                    {rider.vehicle_type}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderCreateRiderModal = () => (
    showCreateModal && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Rider</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleCreateRider} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newRider.full_name}
                  onChange={(e) => setNewRider({ ...newRider, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newRider.email}
                  onChange={(e) => setNewRider({ ...newRider, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={newRider.phone}
                  onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={newRider.vehicle_type}
                  onChange={(e) => setNewRider({ ...newRider, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="tuk_tuk">Tuk Tuk</option>
                  <option value="van">Van</option>
                  <option value="pickup">Pickup</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={newRider.vehicle_registration}
                  onChange={(e) => setNewRider({ ...newRider, vehicle_registration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Driving License No
                </label>
                <input
                  type="text"
                  value={newRider.driving_license_no}
                  onChange={(e) => setNewRider({ ...newRider, driving_license_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  value={newRider.license_expiry_date}
                  onChange={(e) => setNewRider({ ...newRider, license_expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  National ID
                </label>
                <input
                  type="text"
                  value={newRider.national_id}
                  onChange={(e) => setNewRider({ ...newRider, national_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={newRider.emergency_contact_name}
                  onChange={(e) => setNewRider({ ...newRider, emergency_contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={newRider.emergency_contact_phone}
                  onChange={(e) => setNewRider({ ...newRider, emergency_contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Rider
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  // Main render logic
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

  if (error && viewMode === 'list') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 mr-2" />
            <span className="text-lg font-semibold">Error</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRiders}
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
      {renderHeader()}
      
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

      {viewMode === 'list' && (
        <>
          {renderSearchAndFilters()}
          {renderRidersList()}
        </>
      )}

      {viewMode === 'details' && renderRiderDetails()}
      {viewMode === 'analytics' && renderAnalyticsDashboard()}
      {viewMode === 'map' && renderMapView()}
      {renderCreateRiderModal()}
    </div>
  );
}