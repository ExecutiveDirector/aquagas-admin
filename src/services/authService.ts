// src/services/authService.ts
import api from './api';

interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('🔐 Attempting login to /v1/auth/login');
    const response = await api.post('/v1/auth/login', { email, password });
    console.log('🔐 Login successful:', response.data);
    
    const { token, account, role, admin_role } = response.data;
    
    if (token) {
      // Store token
      localStorage.setItem('token', token);
      console.log('💾 Token stored successfully');
      
      // Store user info
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
  localStorage.removeItem('sg_admin_token');
  localStorage.removeItem('sg_admin_account');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
  
  // Redirect to login
  window.location.href = '/login';
}

export function getToken(): string | null {
  return localStorage.getItem('token') || 
         localStorage.getItem('sg_admin_token') || 
         sessionStorage.getItem('token');
}

export function getAccount(): any {
  try {
    // Try userInfo first
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.account || parsed;
    }
    
    // Fallback to direct account storage
    const account = localStorage.getItem('account') || localStorage.getItem('sg_admin_account');
    if (account) {
      return JSON.parse(account);
    }
    
    return null;
  } catch (error) {
    console.error('🔐 Error parsing user info:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  
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
  
  return !!token;
}

export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      console.warn('🔐 isAdmin: No userInfo found in localStorage');
      return false;
    }
    
    const parsed = JSON.parse(userInfo);
    
    // Must have admin role
    if (parsed.role !== 'admin') {
      console.warn('🔐 isAdmin: User role is not admin:', parsed.role);
      return false;
    }
    
    // Check for valid admin_role if present
    if (parsed.admin_role) {
      const validAdminRoles = ['super_admin', 'finance', 'support', 'operations', 'marketing', 'inventory'];
      if (!validAdminRoles.includes(parsed.admin_role)) {
        console.warn('🔐 isAdmin: Invalid admin_role:', parsed.admin_role);
        return false;
      }
    }
    
    console.log('🔐 Admin check passed:', { role: parsed.role, admin_role: parsed.admin_role });
    return true;
  } catch (error) {
    console.error('🔐 isAdmin: Error parsing userInfo:', error);
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
  return isAdmin() && getAdminRole() === 'super_admin';
}

// Backward compatibility aliases
export const adminLogin = login;
export const adminLogout = logout;
export const getAdminToken = getToken;
export const getAdminAccount = getAccount;

export default {
  login,
  logout,
  getToken,
  getAccount,
  isAuthenticated,
  isAdmin,
  getAdminRole,
  isSuperAdmin,
  adminLogin,
  adminLogout,
  getAdminToken,
  getAdminAccount,
};