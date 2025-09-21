// services/auth.ts
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
    console.log('Attempting login to /v1/auth/login');
    const response = await api.post('/v1/auth/login', { email, password });
    console.log('Login successful:', response.data);
    
    const { token, account, role, admin_role } = response.data;
    
    if (token) {
      // Store token consistently
      localStorage.setItem('token', token);
      
      // Store user info with the exact structure needed for auth checks
      const userInfo = {
        account,
        role,
        admin_role,
        // Store all response data for compatibility
        ...response.data
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Also store account separately for backward compatibility
      if (account) {
        localStorage.setItem('account', JSON.stringify(account));
      }
      
      console.log('Stored userInfo:', userInfo);
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
  return !!token; // Just check for token presence since we verify it on backend
}

// Updated admin check to match backend logic exactly
export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      console.warn('isAdmin: No userInfo found in localStorage');
      return false;
    }
    
    const parsed = JSON.parse(userInfo);
    
    // Must have admin role
    if (parsed.role !== 'admin') {
      console.warn('isAdmin: User role is not admin:', parsed.role);
      return false;
    }
    
    // Admin role is sufficient, admin_role is for sub-permissions
    console.log('Admin check passed:', { role: parsed.role, admin_role: parsed.admin_role });
    return true;
  } catch (error) {
    console.error('isAdmin: Error parsing userInfo:', error);
    return false;
  }
}

// Additional helper to get admin role
export function getAdminRole(): string | null {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.admin_role || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting admin role:', error);
    return null;
  }
}

// Helper to check if user is super admin
export function isSuperAdmin(): boolean {
  return isAdmin() && getAdminRole() === 'super_admin';
}