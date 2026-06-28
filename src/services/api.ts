// src/services/api.ts 
import axios from 'axios';
import type { AxiosInstance } from 'axios';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
}

export interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  today_revenue?: number;
  total_revenue?: number;
  pending_orders?: number;
  completed_orders?: number;
  weeklyRevenue?: Array<{ date: string; revenue: number }>;
  sparklines?: { users?: number[]; vendors?: number[]; riders?: number[]; todayRevenue?: number[] };
}

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // Increased to 30 seconds for slower connections
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
  (config) => {
    // Check for token in localStorage first, then sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    console.log('🔑 Token present:', !!token);
    
    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
      
      // Token expiration check
      try {
        interface JwtPayload {
          exp: number;
          iat?: number;
          [key: string]: any;
        }
        
        const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp < now) {
          console.warn('⚠️ Token has expired — clearing session', {
            exp: new Date(payload.exp * 1000).toLocaleString(),
            now: new Date(now * 1000).toLocaleString(),
          });
          
          // Clear expired token
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          sessionStorage.removeItem('userInfo');
          
          // Redirect to login if not already there
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login')) {
            console.info('🔁 Redirecting to /login...');
            window.location.replace('/login');
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not parse token payload:', e instanceof Error ? e.message : e);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

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
      data: error.response?.data,
    });
    
    // Enhanced debugging for 401 errors
    if (error.response?.status === 401) {
      console.group('🚫 401 UNAUTHORIZED - Detailed Analysis');
      console.log('URL:', error.config?.url);
      console.log('Method:', error.config?.method?.toUpperCase());
      console.log('Headers sent:', error.config?.headers);
      console.log('Server response:', error.response?.data);
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          interface JwtPayload {
            exp: number;
            iat?: number;
            [key: string]: any;
          }
          
          const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
          const now = Math.floor(Date.now() / 1000);
          
          console.log('Token payload:', payload);
          console.log('Token expired:', payload.exp < now);
          console.log('Token expires at:', new Date(payload.exp * 1000).toISOString());
        } catch (e) {
          console.log('Token parsing failed:', e instanceof Error ? e.message : e);
        }
      } else {
        console.log('No token found in localStorage');
      }
      console.groupEnd();
    }
    
    // Enhanced debugging for 403 errors
    if (error.response?.status === 403) {
      console.group('🚫 403 FORBIDDEN - Access Denied');
      console.log('This means authentication passed but authorization failed');
      console.log('Check user role and permissions');
      console.log('User info:', localStorage.getItem('userInfo'));
      console.groupEnd();
    }
    
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('⚠️ Authentication failed - clearing tokens');
      
      // Clear all token storage
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('account');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
      
      // Redirect to login (with environment checks)
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      const isOnLogin = window.location.pathname === '/login';
      const isDebugPage = window.location.pathname.includes('/debug');
      
      if (!isDevelopment || (!isOnLogin && !isDebugPage)) {
        console.log('🔄 Redirecting to login page');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function testApiConnection(): Promise<{
  success: boolean;
  data?: any;
  error?: any;
  status?: number;
}> {
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
      status: error.response?.status,
    };
  }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('🔐 Attempting login to /v1/auth/login');
    const response = await api.post<LoginResponse>('/v1/auth/login', { email, password });
    console.log('🔐 Login successful:', response.data);

    const { token, account, role, admin_role, ...rest } = response.data;

    if (token) {
      localStorage.setItem('token', token);
      console.log('💾 Token stored successfully');

      const userInfo = { account, role, admin_role, ...rest };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      console.log('💾 User info stored:', userInfo);

      if (account) {
        localStorage.setItem('account', JSON.stringify(account));
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
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('account');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
  window.location.href = '/login';
}

export function getToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getAccount(): any {
  try {
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.account || parsed;
    }
    
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
  
  if (token) {
    try {
      interface JwtPayload {
        exp: number;
        [key: string]: any;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
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
      console.log('🔐 Admin check:', { 
        role: parsed.role, 
        admin_role: parsed.admin_role, 
        isAdmin: result 
      });
      return result;
    }
    console.log('🔐 No userInfo found, not admin');
    return false;
  } catch (error) {
    console.error('🔐 Error checking admin status:', error);
    return false;
  }
}

export function getAdminRole(): string | null {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.admin_role || null;
    }
    return null;
  } catch (error) {
    console.error('🔐 Error getting admin role:', error);
    return null;
  }
}

export function isSuperAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.admin_role === 'super_admin';
    }
    return false;
  } catch (error) {
    console.error('🔐 Error checking super admin status:', error);
    return false;
  }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

export async function getDashboardStats(
  vendorId?: string | { id: string }
): Promise<DashboardStats> {
  try {
    const id = typeof vendorId === 'object' ? vendorId.id : vendorId;
    const endpoint = id ? `/v1/admin/vendors/${id}/dashboard` : '/v1/admin/dashboard';
    
    console.log('📊 Fetching dashboard stats from:', endpoint);
    const res = await api.get(endpoint);
    console.log('📊 Dashboard response:', res.data);
    
    const data = res.data.data || res.data;
    
    return {
      users: data.users || 0,
      vendors: data.vendors || 0,
      riders: data.riders || 0,
      orders: data.orders || 0,
      todayRevenue: data.todayRevenue || data.today_revenue || 0,
      totalRevenue: data.totalRevenue || data.total_revenue || 0,
      pendingOrders: data.pendingOrders || data.pending_orders || 0,
      completedOrders: data.completedOrders || data.completed_orders || 0,
      weeklyRevenue: data.weeklyRevenue || [],
    };
  } catch (error: any) {
    console.error('📊 Dashboard stats error:', error);
    throw error;
  }
}

// Export the axios instance as default
export default api;