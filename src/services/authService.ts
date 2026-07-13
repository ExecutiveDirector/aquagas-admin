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
  // NOTE: was '/v1/admin/forgot-password', which does not exist on the
  // backend (admin.js has no forgot-password route) and 404'd silently.
  // The real, role-agnostic endpoint lives under /v1/auth and works for
  // user/vendor/rider/admin accounts alike.
  const res = await api.post('/v1/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await api.post('/v1/auth/reset-password', { token, newPassword });
  return res.data;
};

export const verifyEmail = async (token: string) => {
  const res = await api.post('/v1/auth/verify-email', { token });
  return res.data;
};

export const resendVerificationEmail = async (email: string) => {
  const res = await api.post('/v1/auth/resend-verification', { email });
  return res.data;
};

export function isAdmin(): boolean {
  try {
    const userInfo =
      localStorage.getItem('userInfo') ||
      sessionStorage.getItem('userInfo');

    if (!userInfo) {
      console.warn('🔐 isAdmin: No userInfo found');
      return false;
    }

    const parsed = JSON.parse(userInfo);

    if (parsed.role !== 'admin') {
      console.warn('🔐 isAdmin: role is not admin:', parsed.role);
      return false;
    }

    // 'admin' is included because the backend defaults admin_role to plain
    // 'admin' when no specialised sub-role is set — omitting it here used
    // to block every non-specialised admin from vendor creation and other
    // admin features. A falsy admin_role (null/undefined) skips this check
    // entirely and passes, since "no sub-role" means "generic admin", not
    // "invalid admin".
    if (parsed.admin_role) {
      const validAdminRoles = [
        'admin',
        'super_admin',
        'operations_admin',
        'finance_admin',
        'support_admin',
        'marketing_admin',
      ];

      if (!validAdminRoles.includes(parsed.admin_role)) {
        console.warn('🔐 isAdmin: Invalid admin_role:', parsed.admin_role);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('🔐 isAdmin error:', error);
    return false;
  }
}

export function getAdminRole(): string | null {
  try {
    // Must check sessionStorage too, matching isAdmin()'s fallback — when
    // "Remember me" is unchecked, Login.tsx moves userInfo into
    // sessionStorage only. Reading localStorage alone made isSuperAdmin()
    // silently return false (hiding the Admins nav item) for anyone who
    // didn't check "Remember me", even genuine super_admins.
    const userInfo =
      localStorage.getItem('userInfo') ||
      sessionStorage.getItem('userInfo');
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

    // NOTE: adminController.adminLogin returns a flat payload (role,
    // admin_id, admin_role, permissions, full_access) — there is no nested
    // `data.account`. Build one here so the header/sidebar (which read
    // getAccount().email / .role) have something to show, using the email
    // the person just typed in since the backend doesn't echo it back.
    const account = {
      admin_id: data.admin_id,
      email: credentials.email,
      role: data.role,
    };

    localStorage.setItem('userInfo', JSON.stringify({
      role: data.role,
      admin_role: data.admin_role,
      admin_id: data.admin_id,
      permissions: data.permissions || {},
      full_access: !!data.full_access,
      email: credentials.email,
    }));
    localStorage.setItem('account', JSON.stringify(account));
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
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  adminLogin,
  adminLogout,
  getAdminToken,
  getAdminAccount,
};
