// services/api.ts
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
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
  
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  console.log('Token present:', !!token);
  
  return config;
}, (error) => {
  console.error('API Request Error:', error);
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Authentication failed - clearing tokens');
      
      // Clear all possible token storage locations
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('account');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        console.log('Redirecting to login page');
        window.location.href = '/login';
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

// Authentication Functions
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('Attempting login to /v1/auth/login');
    const response = await api.post('/v1/auth/login', { email, password });
    console.log('Login successful:', response.data);
    
    const { token, account, role, admin_role } = response.data;
    
    if (token) {
      // Store token consistently
      localStorage.setItem('token', token);
      
      // Store user info
      if (account || role || admin_role) {
        const userInfo = {
          account,
          role,
          admin_role,
          ...response.data
        };
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // Also store account separately for backward compatibility
        if (account) {
          localStorage.setItem('account', JSON.stringify(account));
        }
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export function logout(): void {
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
  return !!(token && account);
}

export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.role === 'admin' || parsed.admin_role === 'super_admin';
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Dashboard Functions
export async function getDashboardStats(vendorId?: string): Promise<DashboardStats> {
  try {
    // Use the correct endpoint that matches your backend
    const endpoint = vendorId ? `/v1/admin/vendors/${vendorId}/dashboard` : '/v1/admin/dashboard';
    console.log('Fetching dashboard stats from:', endpoint);
    
    const res = await api.get(endpoint);
    console.log('Dashboard response:', res.data);
    
    // Handle different response formats from your backend
    const data = res.data.data || res.data;
    
    // Ensure all required fields exist with defaults
    return {
      users: data.users || 0,
      vendors: data.vendors || 0,
      riders: data.riders || 0,
      orders: data.orders || 0,
      todayRevenue: data.todayRevenue || data.today_revenue || 0,
      totalRevenue: data.totalRevenue || data.total_revenue,
      pendingOrders: data.pendingOrders || data.pending_orders,
      completedOrders: data.completedOrders || data.completed_orders,
    };
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    
    // Better error handling
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      logout();
    }
    
    throw error;
  }
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
  
  const res = await api.get(`/v1/admin/vendors?${queryParams}`);
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
// Export default api instance for other uses

export default api;