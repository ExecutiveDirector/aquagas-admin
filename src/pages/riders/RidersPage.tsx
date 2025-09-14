import { useEffect, useState } from 'react';
import { Truck, Search, Filter, Phone, Eye, BarChart, UserPlus, Key } from 'lucide-react';
import { listRiders, updateRiderStatus, approveRider, resetRiderPassword, createRider } from '../../services/adminService';

// Rider interface (updated to match Sequelize model)
interface Rider {
  rider_id: string;
  full_name: string;
  vehicle_type: string;
  phone?: string;
  email?: string;
  status?: string;
  current_status?: string;
  created_at?: string;
  approved?: boolean;
  account_id?: string;
  vendor_id?: string | null;
  employee_id?: string | null;
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
  max_delivery_distance_km: number;
  vehicle_capacity_kg: number;
  hourly_rate?: number | null;
  commission_rate: number;
  verification_documents?: string | null;
  is_verified: boolean;
  is_active: boolean;
  last_location_update?: string | null;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
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

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);
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

  useEffect(() => {
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
    fetchRiders();
  }, []);

  const handleUpdateStatus = async (riderId: string, status: string) => {
    try {
      setError(null);
      await updateRiderStatus(riderId, { status });
      const response = await listRiders() as ApiResponse<Rider[]>;
      setRiders(response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update rider status');
    }
  };

  const handleApproveRider = async (riderId: string) => {
    try {
      setError(null);
      await approveRider(riderId);
      const response = await listRiders() as ApiResponse<Rider[]>;
      setRiders(response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve rider');
    }
  };

  const handleResetPassword = async (riderId: string, email: string) => {
    if (window.confirm(`Are you sure you want to reset the password for ${email}?`)) {
      try {
        setError(null);
        await resetRiderPassword(riderId);
        alert('Password reset email sent successfully');
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to reset rider password');
      }
    }
  };

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await createRider(newRider);
      setShowAddRiderModal(false);
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
      const response = await listRiders() as ApiResponse<Rider[]>;
      setRiders(response.data || []);
      alert('Rider added successfully');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to add rider');
    }
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = (
      (rider.full_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (rider.phone || '').includes(searchTerm || '') ||
      (rider.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (rider.national_id || '').includes(searchTerm || '') ||
      (rider.vehicle_registration || '').includes(searchTerm || '')
    );
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'active') return matchesSearch && rider.current_status === 'active';
    if (selectedFilter === 'inactive') return matchesSearch && rider.current_status !== 'active';
    if (selectedFilter === 'approved') return matchesSearch && rider.is_verified;
    if (selectedFilter === 'pending') return matchesSearch && !rider.is_verified;
    return matchesSearch;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'offline':
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'busy':
      case 'on_delivery':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'on_break':
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 mr-2" />
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
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddRiderModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Rider
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add Rider Modal */}
      {showAddRiderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Rider</h2>
            <form onSubmit={handleAddRider} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input
                  type="text"
                  value={newRider.full_name}
                  onChange={(e) => setNewRider({ ...newRider, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={newRider.email}
                  onChange={(e) => setNewRider({ ...newRider, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={newRider.phone}
                  onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Type</label>
                <select
                  value={newRider.vehicle_type}
                  onChange={(e) => setNewRider({ ...newRider, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="tuk_tuk">Tuk Tuk</option>
                  <option value="van">Van</option>
                  <option value="pickup">Pickup</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Registration</label>
                <input
                  type="text"
                  value={newRider.vehicle_registration}
                  onChange={(e) => setNewRider({ ...newRider, vehicle_registration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Driving License No</label>
                <input
                  type="text"
                  value={newRider.driving_license_no}
                  onChange={(e) => setNewRider({ ...newRider, driving_license_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">License Expiry Date</label>
                <input
                  type="date"
                  value={newRider.license_expiry_date}
                  onChange={(e) => setNewRider({ ...newRider, license_expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">National ID</label>
                <input
                  type="text"
                  value={newRider.national_id}
                  onChange={(e) => setNewRider({ ...newRider, national_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Name</label>
                <input
                  type="text"
                  value={newRider.emergency_contact_name}
                  onChange={(e) => setNewRider({ ...newRider, emergency_contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={newRider.emergency_contact_phone}
                  onChange={(e) => setNewRider({ ...newRider, emergency_contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddRiderModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search riders by name, phone, email, national ID, or vehicle registration..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="approved">Verified</option>
              <option value="pending">Pending Verification</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRiders.map((rider) => (
                <tr key={rider.rider_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {rider.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {rider.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {rider.rider_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      {rider.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {rider.email}
                        </div>
                      )}
                      {rider.phone && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {rider.phone}
                        </div>
                      )}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rider.current_status || rider.status)}`}>
                        {(rider.current_status || rider.status || 'Unknown').charAt(0).toUpperCase() + (rider.current_status || rider.status || 'unknown').slice(1)}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Joined: {formatDate(rider.created_at)}
                      </div>
                      {rider.national_id && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          National ID: {rider.national_id}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>{rider.vehicle_type || 'N/A'}</div>
                    {rider.vehicle_registration && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Reg: {rider.vehicle_registration}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rider.is_verified ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                      {rider.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 flex-wrap gap-y-2">
                      {!rider.is_verified && (
                        <button
                          onClick={() => handleApproveRider(rider.rider_id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(rider.rider_id, rider.current_status === 'available' ? 'offline' : 'available')}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        disabled={rider.current_status === 'busy' || rider.current_status === 'on_delivery'}
                      >
                        Toggle Status
                      </button>
                      <button
                        onClick={() => handleResetPassword(rider.rider_id, rider.email || '')}
                        className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <Key className="w-4 h-4 inline-block mr-1" />
                        Reset Password
                      </button>
                      <button
                        onClick={() => alert('View Profile: Implement profile modal or page')}
                        className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 inline-block mr-1" />
                        Profile
                      </button>
                      <button
                        onClick={() => alert('View Analytics: Implement analytics modal or page')}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <BarChart className="w-4 h-4 inline-block mr-1" />
                        Analytics
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
    </div>
  );
}