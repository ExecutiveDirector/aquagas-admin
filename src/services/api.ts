// services/api.ts - FIXED VERSION
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Check for token in localStorage first, then sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
  console.log('🔑 Token present:', !!token);
  if (token) {
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    
    // Debug: Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
    
      if (payload.exp < now) {
        console.warn("⚠️ Token has expired — clearing session and redirecting.", {
          exp: new Date(payload.exp * 1000).toLocaleString(),
          now: new Date(now * 1000).toLocaleString(),
        });
      
        try {
          // 🚫 Remove any stored tokens
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        } catch (e) {
          console.error("Failed to clear auth tokens:", e);
        }
      
        // ✅ Redirect to login only if not already there
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          console.info("🔁 Redirecting to /login...");
          window.location.replace('/login'); // safer than href (prevents back navigation)
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        console.warn("⚠️ Could not parse token payload:", e.message);
      } else {
        console.warn("⚠️ Could not parse token payload:", e);
      }
    }
    
  }

  return config;
}, (error) => {
  console.error('❌ API Request Error:', error);
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
      data: error.response?.data
    });
    
    // Enhanced debugging for auth errors
    if (error.response?.status === 401) {
      console.group("🚫 401 UNAUTHORIZED - Detailed Analysis");
    
      console.log("URL:", error.config?.url);
      console.log("Method:", error.config?.method?.toUpperCase());
      console.log("Headers sent:", error.config?.headers);
      console.log("Server response:", error.response?.data);
    
      const token = localStorage.getItem("token");
    
      if (token) {
        try {
          interface JwtPayload {
            exp: number;
            iat?: number;
            [key: string]: any;
          }
    
          const payload = JSON.parse(
            atob(token.split(".")[1])
          ) as JwtPayload;
    
          const now = Math.floor(Date.now() / 1000);
    
          console.log("Token payload:", payload);
          console.log("Token expired:", payload.exp < now);
          console.log(
            "Token expires at:",
            new Date(payload.exp * 1000).toISOString()
          );
        } catch (e) {
          if (e instanceof Error) {
            console.log("Token parsing failed:", e.message);
          } else {
            console.log("Token parsing failed:", e);
          }
        }
      } else {
        console.log("No token found in localStorage");
      }
    
      console.groupEnd();
    }
    

    if (error.response?.status === 403) {
      console.group('🚫 403 FORBIDDEN - Access Denied');
      console.log('This means authentication passed but authorization failed');
      console.log('Check user role and permissions');
      console.log('User info:', localStorage.getItem('userInfo'));
      console.groupEnd();
    }
    
    // Handle authentication errors but don't auto-redirect during development
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('⚠️ Authentication failed - tokens will be cleared');
      
      // Clear all possible token storage locations
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('account');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
      
      // Only redirect if not on development/debug pages and not already on login
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isOnLogin = window.location.pathname === '/login';
      const isDebugPage = window.location.pathname.includes('/debug');
      
      if (!isDevelopment || (!isOnLogin && !isDebugPage)) {
        console.log('🔄 Redirecting to login page');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000); // Small delay to allow for debugging
      }
    }
    
    return Promise.reject(error);
  }
);

// Type definitions
interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
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
  sparklines?: Record<string, number[]>; // optional future extension
}

interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Test API connectivity
export async function testApiConnection(): Promise<{success: boolean, data?: any, error?: any, status?: number}> {
  try {
    console.log('🧪 Testing API connection to:', api.defaults.baseURL);
    const response = await api.get('/v1/admin/test');
    console.log('🧪 API test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('🧪 API test failed:', error);
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Authentication Functions
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('🔐 Attempting login to /v1/auth/login');
    const response = await api.post('/v1/auth/login', { email, password });
    console.log('🔐 Login successful:', response.data);
    
    const { token, account, role, admin_role } = response.data;
    
    if (token) {
      // Store token consistently
      localStorage.setItem('token', token);
      console.log('💾 Token stored successfully');
      
      // Store user info
      if (account || role || admin_role) {
        const userInfo = {
          account,
          role,
          admin_role,
          ...response.data
        };
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('💾 User info stored:', userInfo);
        
        // Also store account separately for backward compatibility
        if (account) {
          localStorage.setItem('account', JSON.stringify(account));
        }
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('🔐 Login failed:', error);
    throw error;
  }
}

export function logout(): void {
  console.log('🔐 Logging out - clearing all storage');
  // Clear all storage
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('account');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
  
  // Redirect to login
  window.location.href = '/login';
}

export function getToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getAccount(): any {
  try {
    // Try userInfo first, then fallback to account
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.account || parsed;
    }
    
    // Fallback to direct account storage
    const account = localStorage.getItem('account');
    if (account) {
      return JSON.parse(account);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  const account = getAccount();
  
  // Check if token exists and is not expired
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      
      if (isExpired) {
        console.warn('🔐 Token is expired, user not authenticated');
        return false;
      }
    } catch (e) {
      console.warn('🔐 Could not parse token, user not authenticated');
      return false;
    }
  }
  
  return !!(token && account);
}

export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      const result = parsed.role === 'admin' || parsed.admin_role === 'super_admin';
      console.log('🔐 Admin check:', { role: parsed.role, admin_role: parsed.admin_role, isAdmin: result });
      return result;
    }
    console.log('🔐 No userInfo found, not admin');
    return false;
  } catch (error) {
    console.error('🔐 Error checking admin status:', error);
    return false;
  }
}

// Dashboard Functions
// export async function getDashboardStats(vendorId?: string): Promise<DashboardStats> {
//   try {
//     // Use the correct endpoint that matches your backend
//     const endpoint = vendorId ? `/v1/admin/vendors/${vendorId}/dashboard` : '/v1/admin/dashboard';
//     console.log('📊 Fetching dashboard stats from:', endpoint);
    
//     const res = await api.get(endpoint);
//     console.log('📊 Dashboard response:', res.data);
    
//     // Handle different response formats from your backend
//     const data = res.data.data || res.data;
    
//     // Ensure all required fields exist with defaults
//     return {
//       users: data.users || 0,
//       vendors: data.vendors || 0,
//       riders: data.riders || 0,
//       orders: data.orders || 0,
//       todayRevenue: data.todayRevenue || data.today_revenue || 0,
//       totalRevenue: data.totalRevenue || data.total_revenue,
//       pendingOrders: data.pendingOrders || data.pending_orders,
//       completedOrders: data.completedOrders || data.completed_orders,
//     };
//   } catch (error: any) {
//     console.error('📊 Dashboard stats error:', error);
//     throw error;
//   }
// }
/**
 * Fetch dashboard statistics for the admin or specific vendor.
 * Automatically normalizes snake_case responses.
 */
export async function getDashboardStats(
  vendorId?: string,
  options?: { signal?: AbortSignal }
): Promise<DashboardStats> {
  const endpoint = vendorId
    ? `/v1/admin/vendors/${vendorId}/dashboard`
    : `/v1/admin/dashboard`;

  console.log("📊 [Dashboard] Fetching stats from:", endpoint);

  try {
    const res = await api.get(endpoint, { signal: options?.signal });
    const raw = res?.data?.data || res?.data || {};

    console.log("📊 [Dashboard] Raw response:", raw);

    // Normalize keys (handle snake_case or camelCase)
    const normalizeKey = (key: string) =>
      key
        .replace(/_([a-z])/g, (_, c) => c.toUpperCase()) // today_revenue → todayRevenue
        .replace(/^([A-Z])/, (c) => c.toLowerCase());

    const normalized: Record<string, any> = {};
    for (const key in raw) {
      normalized[normalizeKey(key)] = raw[key];
    }

    const stats: DashboardStats = {
      users: Number(normalized.users ?? 0),
      vendors: Number(normalized.vendors ?? 0),
      riders: Number(normalized.riders ?? 0),
      orders: Number(normalized.orders ?? 0),
      todayRevenue: Number(normalized.todayRevenue ?? 0),
      totalRevenue: normalized.totalRevenue
        ? Number(normalized.totalRevenue)
        : undefined,
      pendingOrders: normalized.pendingOrders
        ? Number(normalized.pendingOrders)
        : undefined,
      completedOrders: normalized.completedOrders
        ? Number(normalized.completedOrders)
        : undefined,
      sparklines: normalized.sparklines || undefined,
    };

    console.log("📊 [Dashboard] Normalized stats:", stats);
    return stats;
  } catch (error: any) {
    if (options?.signal?.aborted) {
      console.warn("⚠️ [Dashboard] Fetch aborted");
      throw new Error("Request aborted");
    }

    const status = error?.response?.status;
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to fetch dashboard stats";

    console.error("❌ [Dashboard] Error:", { status, msg, error });

    throw new Error(
      status
        ? `Dashboard request failed [${status}]: ${msg}`
        : `Dashboard request failed: ${msg}`
    );
  }
}
// Vendor Management Functions  
export async function listVendors(params: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  filter?: string 
} = {}): Promise<ApiResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, String(value));
  });
  
  const url = `/v1/admin/vendors${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  console.log('🏪 Fetching vendors from:', url);
  
  const res = await api.get(url);
  console.log('🏪 Vendors response:', res.data);
  return res.data;
}

export async function approveVendor(vendorId: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/approve`);
  return res.data;
}

export async function updateVendorStatus(vendorId: string, status: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/status`, { status });
  return res.data;
}

// User Management Functions
export async function listUsers(params: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  filter?: string 
} = {}): Promise<ApiResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, String(value));
  });
  
  const res = await api.get(`/v1/admin/users?${queryParams}`);
  return res.data;
}

export async function getUserDetails(userId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/users/${userId}`);
  return res.data;
}

export async function updateUserStatus(userId: string, status: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/users/${userId}/status`, { status });
  return res.data;
}

// Rider Management Functions
export async function listRiders(params: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  filter?: string 
} = {}): Promise<ApiResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, String(value));
  });
  
  const res = await api.get(`/v1/admin/riders?${queryParams}`);
  return res.data;
}

export async function updateRiderStatus(riderId: string, status: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}/status`, { status });
  return res.data;
}

// Order Management Functions
export async function listOrders(params: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  status?: string 
} = {}): Promise<ApiResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, String(value));
  });
  
  const res = await api.get(`/v1/admin/orders?${queryParams}`);
  return res.data;
}

export async function getOrderDetails(orderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/orders/${orderId}`);
  return res.data;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/orders/${orderId}/status`, { status });
  return res.data;
}

// Create new user
export async function createUser(data: any): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/users`, data);
  return res.data;
}

// Update existing user
export async function updateUser(userId: string, data: any): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/users/${userId}`, data);
  return res.data;
}

// Delete user
export async function deleteUser(userId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/users/${userId}`);
  return res.data;
}

// Toggle user status (active/inactive)
export async function toggleUserStatus(userId: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/users/${userId}/toggle-status`);
  return res.data;
}

export default api;