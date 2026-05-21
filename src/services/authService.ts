// src/services/authService.ts
// FIXES:
//   1. Added 'admin' to validAdminRoles — backend defaults admin_role to 'admin'
//      when no specific sub-role is set. Without this, ALL non-specialised admins
//      were blocked and could not create vendors or access admin features.
//   2. When admin_role is null/undefined (token signed without it), isAdmin()
//      now correctly passes instead of rejecting — role: 'admin' is enough.

import api from './api';
import type { ApiResponse } from '../types';

// ============================================
// TOKEN / SESSION HELPERS
// ============================================

export function getToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getAccount(): any {
  try {
    const raw = localStorage.getItem('account') || sessionStorage.getItem('account');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn('🔐 Token is expired');
      return false;
    }
  } catch {
    console.warn('🔐 Could not parse token');
    return false;
  }

  return true;
}

export const forgotPassword = async (email: string) => {
  const res = await api.post('/v1/admin/forgot-password', { email });
  return res.data;
};

export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      console.warn('🔐 isAdmin: No userInfo in localStorage');
      return false;
    }

    const parsed = JSON.parse(userInfo);

    if (parsed.role !== 'admin') {
      console.warn('🔐 isAdmin: role is not admin:', parsed.role);
      return false;
    }

    // FIX: admin_role is optional — if absent or null, role: 'admin' is sufficient.
    // When present, validate against all known values including the default 'admin'.
    if (parsed.admin_role) {
      const validAdminRoles = [
        'admin',               // ← default when no specific sub-role is assigned
        'super_admin',
        'operations_admin',
        'finance_admin',
        'support_admin',
        'marketing_admin',
      ];
      if (!validAdminRoles.includes(parsed.admin_role)) {
        console.warn('🔐 isAdmin: Unrecognised admin_role:', parsed.admin_role);
        return false;
      }
    }

    console.log('🔐 Admin check passed:', { role: parsed.role, admin_role: parsed.admin_role });
    return true;
  } catch (error) {
    console.error('🔐 isAdmin error:', error);
    return false;
  }
}

export function getAdminRole(): string | null {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      return JSON.parse(userInfo).admin_role || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  return isAdmin() && getAdminRole() === 'super_admin';
}

// ============================================
// AUTH API CALLS
// ============================================

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/login', credentials);
  const data = res.data;

  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userInfo', JSON.stringify({
      role: data.role,
      admin_role: data.admin_role,
      account_id: data.account?.account_id,
      email: data.account?.email,
    }));
    localStorage.setItem('account', JSON.stringify(data.account || {}));
  }

  return data;
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('account');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
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
