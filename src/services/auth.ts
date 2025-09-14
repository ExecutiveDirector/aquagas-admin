// services/auth.ts
import api from './api';

interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
}

// UNIFIED login function - matches your backend endpoint
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
  localStorage.removeItem('rememberMe');
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
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.account || parsed;
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

// Check if user has admin role
export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.role === 'admin';
    }
    return false;
  } catch (error) {
    return false;
  }
}