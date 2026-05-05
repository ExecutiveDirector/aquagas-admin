import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
//import type { ApiResponse } from '../../services/adminService';  // Assume this has order types
import OrdersList from './OrdersList';
import OrderDetails from './OrderDetails';
import VendorDashboard from '../vendors/VendorDashboard';  // Reuse for order-focused dashboard
import { listOrders, getOrderDetails, updateOrderStatus, assignRiderToOrder, refundOrder, getDashboardStats, testApiConnection } from '../../services/adminService';
import { isAuthenticated, logout, isAdmin, getToken } from '../../services/authService';

interface Order {
  order_id: string;
  order_number: string;
  customer_id: string;
  outlet_id: string;
  vendor_id: string;
  vendor_name?: string;
  order_status: 'draft' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed';
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  delivery_type: 'home_delivery' | 'pickup' | 'scheduled';
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
  // From includes: order_items, etc.
  order_items?: OrderItem[];
  customer?: { full_name: string; phone: string };
  rider?: { full_name: string; phone: string };
}

interface OrderItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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

interface UpdateOrderStatusData {
  status: Order['order_status'];
  notes?: string;
}

interface AssignRiderData {
  rider_id: string;
}

interface RefundData {
  amount: number;
  reason: string;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: 0,
    vendors: 0,
    riders: 0,
    orders: 0,
    todayRevenue: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'list' | 'details' | 'debug'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  const fetchDashboard = useCallback(async () => {
    try {
      const statsResponse = await getDashboardStats();
      setDashboardStats(statsResponse);
    } catch (err: any) {
      throw err;
    }
  }, []);

  const fetchOrders = useCallback(async (page: number = 1, search: string = '') => {
    try {
      const params = { page, limit: 20, search };
      const ordersResponse = await listOrders(params.page, params.limit, { search: params.search });
      setOrders((ordersResponse.data as Order[]) || []);
      setTotalPages(ordersResponse.pagination?.totalPages || 1);
      setCurrentPage(page);
    } catch (err: any) {
      throw err;
    }
  }, []);

  const fetchData = useCallback(async (retryAttempt = 0) => {
    setIsLoading(true);
    setError(null);

    try {
    // ❌ REMOVE THIS BLOCK — /v1/admin/test doesn't exist
    // if (retryAttempt === 0) {
    //   const apiTest = await testApiConnection();
    //   if (!apiTest.success) throw new Error(`API test failed: ${apiTest.error}`);
    // }

      await Promise.all([
        fetchDashboard(),
        fetchOrders(currentPage, searchQuery)
      ]);

      setRetryCount(0);
    } catch (err: any) {
      const errorDetails = createErrorDetails(err, 'data-fetch');
      setError(errorDetails);

      if (!errorDetails.isAuthError && retryAttempt < 2) {
        setTimeout(() => fetchData(retryAttempt + 1), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, fetchDashboard, fetchOrders]);

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      setError({
        message: !isAuthenticated() ? 'Please login.' : 'Admin access required.',
        isAuthError: true,
        canRetry: false
      });
      return;
    }
    fetchData();
  }, []);

  useEffect(() => {
    fetchOrders(1, searchQuery);
  }, [searchQuery, fetchOrders]);

  const retryFetch = () => fetchData();

  const handleLogin = () => logout();

  const runApiTest = async () => {
    try {
      setIsLoading(true);
      const result = await testApiConnection();
      alert(result.success ? '✅ API OK: ' + JSON.stringify(result.data, null, 2) : '❌ API Error: ' + JSON.stringify(result.error, null, 2));
    } catch (err: any) {
      alert('❌ Test Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOrder = orders.find(order => order.order_id === selectedOrderId);

  const handleUpdateOrderStatus = async (orderId: string, data: UpdateOrderStatusData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await updateOrderStatus(orderId, data.status, data.notes);
      setOrders(prev =>
        prev.map(order =>
          order.order_id === orderId ? { ...order, order_status: data.status, updated_at: new Date().toISOString() } : order
        )
      );
    } catch (err: any) {
      setError(createErrorDetails(err, 'update-order-status'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await assignRiderToOrder(orderId, riderId);
      setOrders(prev =>
        prev.map(order =>
          order.order_id === orderId ? { ...order, rider_id: riderId } : order
        )
      );
    } catch (err: any) {
      setError(createErrorDetails(err, 'assign-rider'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundOrder = async (orderId: string, data: RefundData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await refundOrder(orderId, data.amount, data.reason);
      setOrders(prev =>
        prev.map(order =>
          order.order_id === orderId ? { ...order, order_status: 'refunded', payment_status: 'refunded' } : order
        )
      );
    } catch (err: any) {
      setError(createErrorDetails(err, 'refund-order'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

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
              {error.status && <p className="text-sm opacity-75">HTTP Status: {error.status}</p>}
              {error.endpoint && <p className="text-sm opacity-75">Endpoint: {error.endpoint}</p>}
              <div className="flex gap-2 mt-3">
                {error.isAuthError ? (
                  <button onClick={handleLogin} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
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
          { id: 'list', label: 'Orders List' },
          { id: 'debug', label: 'Debug' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
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
              <p><strong>Orders Count:</strong> {orders.length}</p>
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
        <VendorDashboard stats={dashboardStats} loading={isLoading} />  // Reuse, or create OrdersDashboard
      )}

      {activeSection === 'list' && (
        <OrdersList
          orders={orders}
          onSelectOrder={(orderId) => {
            setSelectedOrderId(orderId);
            setActiveSection('details');
          }}
          loading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      {activeSection === 'details' && selectedOrderId && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onUpdateStatus={handleUpdateOrderStatus}
          onAssignRider={handleAssignRider}
          onRefund={handleRefundOrder}
          loading={isLoading}
        />
      )}
    </div>
  );
};

export default OrdersPage;
