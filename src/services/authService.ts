// src/services/authService.ts
// ✅ FIXED: isAdmin() was validating admin_role against wrong values
//    ('finance', 'support', etc.) instead of the real DB ENUM values
//    ('finance_admin', 'support_admin', etc.) — this was blocking valid admins
//    on the frontend even when the token was perfectly valid.

import api from './api';
import type { ApiResponse } from '../types';
import axios from 'axios';
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
//  — use the same api instance as everything else
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

    // ✅ FIXED: validate against actual DB ENUM values, not shortened aliases
    if (parsed.admin_role) {
      const validAdminRoles = [
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
