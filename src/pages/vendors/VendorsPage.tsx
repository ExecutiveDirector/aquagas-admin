import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import VendorsList from './VendorList';
import type { UpdateVendorFormData } from './VendorDetails';
import VendorDetails from './VendorDetails';
import VendorDashboard from './VendorDashboard';
import type { InventoryMovement } from './InventoryManagement';
import InventoryManagement from './InventoryManagement';
import type { AddVendorFormData } from './AddVendorForm';
import AddVendorForm from './AddVendorForm';
import { listVendors, getDashboardStats, updateVendor, vendorRegister, getInventory, updateInventory, recordInventoryMovement, getLowStockAlerts, testApiConnection } from '../../services/adminService';
import { isAuthenticated, logout, isAdmin, getToken } from '../../services/auth';

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

interface Product {
  product_id: string;
  name: string;
  stock: number;
  price: number;
  vendor_id: string;
}

interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
}

interface ErrorDetails {
  message: string;
  status?: number;
  endpoint?: string;
  canRetry: boolean;
  isAuthError: boolean;
}

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: 0,
    vendors: 0,
    riders: 0,
    orders: 0,
    todayRevenue: 0,
  });
  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'list' | 'add' | 'details' | 'inventory' | 'debug'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Helper function to create detailed error info
  const createErrorDetails = (err: any, endpoint?: string): ErrorDetails => {
    const status = err.response?.status;
    const isAuthError = status === 401 || status === 403;
    
    return {
      message: err.response?.data?.error || err.message || 'An unknown error occurred',
      status,
      endpoint,
      canRetry: !isAuthError && status !== 404,
      isAuthError
    };
  };

  // Enhanced data fetching with better error handling
  const fetchData = async (retryAttempt = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('VendorsPage: Starting data fetch attempt', retryAttempt + 1);
      
      // Test API connectivity first
      const apiTest = await testApiConnection();
      if (!apiTest.success) {
        throw new Error(`API connectivity test failed: ${apiTest.error}`);
      }

      // Fetch dashboard stats
      console.log('Fetching dashboard stats...');
      const statsResponse = await getDashboardStats();
      setDashboardStats(statsResponse);
      console.log('✅ Dashboard stats loaded');

      // Fetch vendors list
      console.log('Fetching vendors list...');
      const vendorsResponse = await listVendors({ page: 1, limit: 20, search: searchQuery });
      setVendors((vendorsResponse.data as Vendor[]) || []);
      console.log('✅ Vendors loaded:', vendorsResponse.data?.length || 0);

      // Fetch inventory if a vendor is selected
      if (selectedVendorId) {
        console.log('Fetching inventory for vendor:', selectedVendorId);
        try {
          const inventoryResponse = await getInventory(selectedVendorId);
          setInventory((inventoryResponse.data as Product[]) || []);
          
          const lowStockResponse = await getLowStockAlerts(selectedVendorId);
          setLowStockAlerts((lowStockResponse.data as Product[]) || []);
          console.log('✅ Inventory loaded');
        } catch (inventoryErr: any) {
          console.warn('⚠️ Inventory fetch failed but continuing:', inventoryErr.message);
          // Don't fail the whole page if inventory fails
        }
      }

      setRetryCount(0); // Reset retry count on success

    } catch (err: any) {
      console.error('❌ VendorsPage: Data fetch error:', err);
      const errorDetails = createErrorDetails(err, 'data-fetch');
      setError(errorDetails);

      // Don't auto-retry auth errors
      if (!errorDetails.isAuthError && retryAttempt < 2) {
        console.log(`⏳ Retrying in 2 seconds... (attempt ${retryAttempt + 2}/3)`);
        setTimeout(() => {
          setRetryCount(retryAttempt + 1);
          fetchData(retryAttempt + 1);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication check on mount only
  useEffect(() => {
    console.log('🔍 VendorsPage: Checking authentication...');
    
    if (!isAuthenticated()) {
      console.warn('❌ User is not authenticated');
      setError({
        message: 'You are not authenticated. Please login again.',
        isAuthError: true,
        canRetry: false
      });
      return;
    }

    if (!isAdmin()) {
      console.warn('❌ User is not an admin');
      setError({
        message: 'You do not have admin privileges to access this page.',
        isAuthError: true,
        canRetry: false
      });
      return;
    }

    console.log('✅ Authentication check passed');
    fetchData();
  }, [selectedVendorId, searchQuery]);

  const retryFetch = () => {
    setRetryCount(0);
    fetchData();
  };

  const handleLogin = () => {
    logout(); // This will clear tokens and redirect
  };

  // Test API connection manually
  const runApiTest = async () => {
    try {
      setIsLoading(true);
      const result = await testApiConnection();
      if (result.success) {
        alert('✅ API connection successful!\n\n' + JSON.stringify(result.data, null, 2));
      } else {
        alert('❌ API connection failed!\n\n' + JSON.stringify(result.error, null, 2));
      }
    } catch (err: any) {
      alert('❌ API test error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.business_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedVendor = vendors.find(vendor => vendor.vendor_id === selectedVendorId);

  // Enhanced error handlers that don't auto-redirect
  const handleUpdateVendor = async (data: UpdateVendorFormData): Promise<void> => {
    if (!selectedVendorId) return;
    setIsLoading(true);
    setError(null);
    try {
      await updateVendor(selectedVendorId, data);
      setVendors(prev =>
        prev.map(vendor =>
          vendor.vendor_id === selectedVendorId
            ? { ...vendor, ...data, updated_at: new Date().toISOString() }
            : vendor
        )
      );
    } catch (err: any) {
      console.error('VendorsPage: Update vendor error:', err);
      const errorDetails = createErrorDetails(err, 'update-vendor');
      setError(errorDetails);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVendor = async (data: AddVendorFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await vendorRegister(data);
      const newVendor: Vendor = {
        ...data,
        vendor_id: (response.data as any)?.vendor_id || String(Date.now()),
        rating: 0,
        total_reviews: 0,
        is_verified: false,
        is_featured: false,
        commission_rate: 0.1,
        minimum_order_amount: 1000,
        delivery_radius_km: 5,
        average_prep_time_minutes: 30,
        currency: 'KES',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setVendors(prev => [...prev, newVendor]);
      setActiveSection('list');
    } catch (err: any) {
      console.error('VendorsPage: Add vendor error:', err);
      const errorDetails = createErrorDetails(err, 'add-vendor');
      setError(errorDetails);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInventory = async (productId: string, updates: any): Promise<void> => {
    if (!selectedVendorId) return;
    setIsLoading(true);
    setError(null);
    try {
      await updateInventory(selectedVendorId, productId, updates);
      setInventory(prev =>
        prev.map(item =>
          item.product_id === productId ? { ...item, ...updates } : item
        )
      );
      const lowStockResponse = await getLowStockAlerts(selectedVendorId);
      setLowStockAlerts((lowStockResponse.data as Product[]) || []);
    } catch (err: any) {
      console.error('VendorsPage: Update inventory error:', err);
      const errorDetails = createErrorDetails(err, 'update-inventory');
      setError(errorDetails);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordMovement = async (movement: InventoryMovement): Promise<void> => {
    if (!selectedVendorId) return;
    setIsLoading(true);
    setError(null);
    try {
      await recordInventoryMovement(selectedVendorId, movement);
      setInventory(prev =>
        prev.map(item =>
          item.product_id === movement.product_id
            ? {
                ...item,
                stock:
                  movement.type === 'in'
                    ? item.stock + movement.quantity
                    : item.stock - movement.quantity,
              }
            : item
        )
      );
      const lowStockResponse = await getLowStockAlerts(selectedVendorId);
      setLowStockAlerts((lowStockResponse.data as Product[]) || []);
    } catch (err: any) {
      console.error('VendorsPage: Record inventory movement error:', err);
      const errorDetails = createErrorDetails(err, 'record-movement');
      setError(errorDetails);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vendor Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => setActiveSection('add')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className={`mb-4 p-4 rounded-lg ${error.isAuthError 
          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-grow">
              <h4 className="font-semibold mb-1">
                {error.isAuthError ? 'Authentication Error' : 'Connection Error'}
              </h4>
              <p className="mb-2">{error.message}</p>
              {error.status && (
                <p className="text-sm opacity-75">HTTP Status: {error.status}</p>
              )}
              {error.endpoint && (
                <p className="text-sm opacity-75">Endpoint: {error.endpoint}</p>
              )}
              
              <div className="flex gap-2 mt-3">
                {error.isAuthError ? (
                  <button
                    onClick={handleLogin}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Go to Login
                  </button>
                ) : error.canRetry ? (
                  <button
                    onClick={retryFetch}
                    disabled={isLoading}
                    className="flex items-center px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </button>
                ) : null}
                
                <button
                  onClick={runApiTest}
                  disabled={isLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Test API
                </button>
                
                <button
                  onClick={() => setActiveSection('debug')}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Debug Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retry indicator */}
      {retryCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-lg">
          <div className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Retrying connection... (Attempt {retryCount + 1}/3)
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'list', label: 'Vendors List' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'debug', label: 'Debug' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSection(tab.id as any);
              if (tab.id !== 'debug') setSelectedVendorId(null);
            }}
            className={`px-4 py-2 text-sm font-medium ${
              activeSection === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            disabled={isLoading}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'debug' && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Debug Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Token:</strong> {getToken() ? 'Present' : 'Missing'}</p>
              <p><strong>Authenticated:</strong> {isAuthenticated() ? 'Yes' : 'No'}</p>
              <p><strong>Admin:</strong> {isAdmin() ? 'Yes' : 'No'}</p>
              <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}</p>
              <p><strong>Current Path:</strong> {window.location.pathname}</p>
              <p><strong>Vendors Count:</strong> {vendors.length}</p>
              {error && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded">
                  <p><strong>Last Error:</strong> {JSON.stringify(error, null, 2)}</p>
                </div>
              )}
            </div>
            <button
              onClick={runApiTest}
              disabled={isLoading}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Run Full API Test
            </button>
          </div>
        </div>
      )}

      {activeSection === 'dashboard' && (
        <VendorDashboard stats={dashboardStats} loading={isLoading} />
      )}

      {activeSection === 'list' && (
        <VendorsList
          vendors={filteredVendors}
          onSelectVendor={(vendorId) => {
            setSelectedVendorId(vendorId);
            setActiveSection('details');
          }}
          loading={isLoading}
        />
      )}

      {activeSection === 'details' && selectedVendor && (
        <VendorDetails
          vendor={selectedVendor}
          onUpdate={handleUpdateVendor}
          loading={isLoading}
        />
      )}

      {activeSection === 'inventory' && selectedVendorId && (
        <InventoryManagement
          inventory={inventory}
          lowStockAlerts={lowStockAlerts}
          onUpdateInventory={handleUpdateInventory}
          onRecordMovement={handleRecordMovement}
          loading={isLoading}
        />
      )}

      {activeSection === 'add' && (
        <AddVendorForm
          onSubmit={handleAddVendor}
          loading={isLoading}
        />
      )}
    </div>
  );
};

export default VendorsPage;