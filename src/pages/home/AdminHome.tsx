//src/pages/AdminHome.tsx
import  { useState, useEffect } from 'react';
import { getDashboardStats } from '../../services/api'; // Make sure this import path is correct

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

interface DebugInfo {
  fetchStarted?: boolean;
  timestamp?: string;
  dataReceived?: boolean;
  dataContent?: any;
  success?: boolean;
  error?: boolean;
  errorDetails?: any;
  fetchCompleted?: boolean;
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  useEffect(() => {
    const fetchStats = async () => {
      console.log('🔍 AdminHome: Starting to fetch stats...');
      setDebugInfo((prev: DebugInfo) => ({
        ...prev,
        fetchStarted: true,
        timestamp: new Date().toISOString(),
      }));

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 AdminHome: Calling getDashboardStats...');
        const data = await getDashboardStats();
        console.log('🔍 AdminHome: Received data:', data);

        setStats(data);
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          dataReceived: true,
          dataContent: data,
          success: true,
        }));
      } catch (err: any) {
        console.error('❌ AdminHome: Dashboard stats error:', err);

        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load dashboard stats';

        setError(errorMessage);
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          error: true,
          errorDetails: {
            message: err?.message,
            status: err?.response?.status,
            statusText: err?.response?.statusText,
            data: err?.response?.data,
            config: {
              url: err?.config?.url,
              method: err?.config?.method,
              headers: err?.config?.headers,
            },
          },
        }));
      } finally {
        setLoading(false);
        setDebugInfo((prev: DebugInfo) => ({
          ...prev,
          fetchCompleted: true,
        }));
        console.log('🔍 AdminHome: Fetch completed');
      }
    };

    fetchStats();
  }, []);

  // Debug render
  console.log('🔍 AdminHome render state:', { loading, error, stats, debugInfo });

  return (
    <div className="space-y-6">
      {/* Debug Panel - Remove this in production */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '300px',
          backgroundColor: '#000',
          color: '#00ff00',
          padding: '10px',
          fontSize: '12px',
          zIndex: 9999,
          maxHeight: '50vh',
          overflow: 'auto',
        }}
      >
        {/* <div><strong>DEBUG PANEL</strong></div>
        <div>Loading: {loading ? 'YES' : 'NO'}</div>
        <div>Error: {error ? 'YES' : 'NO'}</div>
        <div>Stats: {stats ? 'YES' : 'NO'}</div>
        <div>Debug: {JSON.stringify(debugInfo, null, 2)}</div> */}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
      )}

      {/* Main Dashboard */}
      {!loading && !error && stats && (
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back! Here's what's happening with your platform.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Users */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total Users</h3>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                {stats.users.toLocaleString()}
              </p>
            </div>
            {/* Vendors */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Total Vendors</h3>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                {stats.vendors.toLocaleString()}
              </p>
            </div>
            {/* Riders */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Total Riders</h3>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                {stats.riders.toLocaleString()}
              </p>
            </div>
            {/* Today's Revenue */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
              <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">Today's Revenue</h3>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">
                ${stats.todayRevenue?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Additional Stats if available */}
          {(stats.totalRevenue !== undefined || stats.pendingOrders !== undefined || stats.completedOrders !== undefined) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {stats.totalRevenue !== undefined && (
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-xl p-6 border border-teal-200 dark:border-teal-800">
                  <h3 className="text-sm font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">Total Revenue</h3>
                  <p className="text-2xl font-bold text-teal-900 dark:text-teal-100 mt-2">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
              )}
              {stats.pendingOrders !== undefined && (
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                  <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Pending Orders</h3>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
                    {stats.pendingOrders.toLocaleString()}
                  </p>
                </div>
              )}
              {stats.completedOrders !== undefined && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Completed Orders</h3>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                    {stats.completedOrders.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No Data */}
      {!loading && !error && !stats && (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600">Unable to load dashboard data.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      )}
    </div>
  );
}