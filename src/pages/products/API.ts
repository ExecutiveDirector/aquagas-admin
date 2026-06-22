// ============================================
// api.ts — API service + auth utilities
// ============================================

import type { Product, Category } from './types';

export const API_BASE_URL = 'https://aquagas-backend.onrender.com/api';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ── Auth ──────────────────────────────────────────────────────
export const checkAdminAccess = (): {
  hasAccess: boolean;
  role: string;
  adminRole: string | null;
  error?: string;
} => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');

  if (!token) return { hasAccess: false, role: '', adminRole: null, error: 'No authentication token found' };
  if (!userInfo) return { hasAccess: false, role: '', adminRole: null, error: 'No user information found' };

  try {
    const parsed = JSON.parse(userInfo);
    if (parsed.role !== 'admin') {
      return { hasAccess: false, role: parsed.role, adminRole: null, error: 'Access denied. Admin privileges required.' };
    }
    return { hasAccess: true, role: parsed.role, adminRole: parsed.admin_role || 'admin' };
  } catch {
    return { hasAccess: false, role: '', adminRole: null, error: 'Invalid user information' };
  }
};

// ── Products ──────────────────────────────────────────────────
const extractList = <T>(data: unknown, keys: string[]): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val)) return val as T[];
    }
    // nested data.products / data.data.products
    const nested = (data as Record<string, unknown>).data;
    if (nested && typeof nested === 'object') {
      for (const key of keys) {
        const val = (nested as Record<string, unknown>)[key];
        if (Array.isArray(val)) return val as T[];
      }
    }
  }
  return [];
};

export const productsApi = {
  getAll: async (page = 1, limit = 100): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/admin/products?page=${page}&limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      return extractList<Product>(data, ['products', 'data']);
    } catch (err) {
      console.error('Products fetch error:', err);
      return [];
    }
  },

  create: async (payload: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to create product');
    }
    const result = await res.json();
    return result.data || result;
  },

  update: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to update product');
    }
    const result = await res.json();
    return result.data || result;
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to delete product');
    }
  },
};

// ── Categories ────────────────────────────────────────────────
export const categoriesApi = {
  getAll: async (page = 1, limit = 100): Promise<Category[]> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/categories?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);
    const data = await res.json();
    return extractList<Category>(data, ['categories', 'data']);
  },

  create: async (payload: Partial<Category>): Promise<Category> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to create category');
    }
    const result = await res.json();
    return result.data || result;
  },

  update: async (id: string, payload: Partial<Category>): Promise<Category> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to update category');
    }
    const result = await res.json();
    return result.data || result;
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/v1/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || 'Failed to delete category');
    }
  },
};