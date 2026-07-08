// src/services/vendorService.ts
//   1. All admin-context functions now call /v1/admin/vendors/:vendorId/... routes
//      (not /v1/vendors/:vendorId/... which requires vendor token)
//   2. Circular import REMOVED: no longer imports adminLogout from adminService.
//      handleAuthError now redirects to /login directly without calling adminLogout.

import api from './api';
import type { ApiResponse } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface Vendor {
  vendor_id: string;
  account_id: string;
  business_name: string;
  trading_name?: string;
  vendor_type: 'gas' | 'general';
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
  business_registration_no?: string;
  tax_pin?: string;
  license_number?: string;
  contact_person: string;
  business_phone?: string;
  business_email?: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_featured: boolean;
  commission_rate: number;
  minimum_order_amount: number;
  delivery_radius_km: number;
  average_prep_time_minutes: number;
  business_hours?: any;
  verification_documents?: any;
  bank_account_details?: any;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VendorListResponse {
  data: Vendor[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface VendorDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  totalProducts: number;
}

export interface VendorOutlet {
  outlet_id: string;
  vendor_id: string;
  outlet_name: string;
  outlet_code: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  contact_phone?: string;
  manager_name?: string;
  operating_hours?: any;
  facilities?: any;
  created_at?: string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

// ✅ FIXED: No longer imports adminLogout from adminService (circular dependency).
// Clears tokens directly and redirects.
function handleAuthError(error: any) {
  if (error?.response?.status === 401) {
    console.warn('Unauthorized — clearing session and redirecting to login');
    // Clear all known token keys used by the app
    try {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('token');
      localStorage.removeItem('account');
    } catch (_) {
      // localStorage may not be available in SSR
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

// ============================================================================
// VENDOR LIST & CRUD (Admin)
// ============================================================================

export async function listVendors(page = 1, limit = 10): Promise<VendorListResponse> {
  try {
    const res = await api.get(`/v1/admin/vendors?page=${page}&limit=${limit}`);
    // Backend returns { data: Vendor[], total, page, limit } — no nested .data wrapper
    const raw = res.data;
    return {
      data:  raw.data  ?? raw,        // rows array
      total: raw.total ?? 0,
      page:  raw.page  ?? page,
      limit: raw.limit ?? limit,
    };
  } catch (error: any) {
    console.error('📦 listVendors error:', error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorById(id: string): Promise<Vendor> {
  try {
    const res = await api.get<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}`);
    return res.data.data ?? (res.data as unknown as Vendor);
  } catch (error: any) {
    console.error(`📦 getVendorById(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// Public endpoint — no admin prefix needed
export async function getVendorDetails(vendorId: string): Promise<Vendor> {
  try {
    const res = await api.get<ApiResponse<Vendor>>(`/v1/vendors/${vendorId}`);
    return res.data.data ?? (res.data as unknown as Vendor);
  } catch (error: any) {
    console.error(`📦 getVendorDetails(${vendorId}) error:`, error);
    throw error;
  }
}

export async function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  try {
    const res = await api.post<ApiResponse<Vendor>>('/v1/admin/vendors', data);
    return res.data.data ?? (res.data as unknown as Vendor);
  } catch (error: any) {
    console.error('📦 createVendor error:', error);
    handleAuthError(error);
    throw error;
  }
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
  try {
    const res = await api.put<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}`, data);
    return res.data.data ?? (res.data as unknown as Vendor);
  } catch (error: any) {
    console.error(`📦 updateVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function deleteVendor(id: string): Promise<void> {
  try {
    await api.delete(`/v1/admin/vendors/${id}`);
  } catch (error: any) {
    console.error(`📦 deleteVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}


export async function toggleVendorStatus(id: string, active: boolean): Promise<Vendor> {
  try {
    const action = active ? 'activate' : 'suspend';
    const res = await api.post(`/v1/admin/vendors/${id}/${action}`);
    // Controller returns { message, data: vendor }
    return res.data.data ?? res.data;
  } catch (error: any) {
    console.error(`📦 toggleVendorStatus(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function approveVendor(id: string): Promise<Vendor> {
  try {
    const res = await api.put(`/v1/admin/vendors/${id}/approve`);
    return res.data.data ?? res.data;
  } catch (error: any) {
    console.error(`📦 approveVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ============================================================================
// VENDOR DETAIL DATA (Admin — all use /v1/admin/vendors/:id/...)
// ✅ FIXED: Previously called /v1/vendors/:id/... which requires vendor token
// ============================================================================

export async function getVendorDashboardStats(id: string): Promise<VendorDashboardStats> {
  try {
    // ✅ Admin endpoint, not vendor self-service endpoint
    const res = await api.get(`/v1/admin/vendors/${id}/dashboard`);
    const data = res.data.data ?? res.data;
    return {
      totalOrders:   data.totalOrders   ?? 0,
      pendingOrders: data.pendingOrders ?? 0,
      revenue:       data.revenue       ?? 0,
      totalProducts: data.totalProducts ?? 0,
    };
  } catch (error: any) {
    console.error(`📊 getVendorDashboardStats(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorProducts(vendorId: string, page = 1, limit = 20) {
  try {
    // ✅ Public endpoint — fine for admin to read
    const res = await api.get(`/v1/vendors/${vendorId}/products?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorProducts(${vendorId}) error:`, error);
    throw error;
  }
}

export async function getVendorReviews(vendorId: string, page = 1, limit = 20) {
  try {
    // ✅ Public endpoint — fine for admin to read
    const res = await api.get(`/v1/vendors/${vendorId}/reviews?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorReviews(${vendorId}) error:`, error);
    throw error;
  }
}

export async function getVendorOutlets(vendorId: string, page = 1, limit = 20): Promise<VendorOutlet[]> {
  try {
    // ✅ admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/outlets?page=${page}&limit=${limit}`);
    return res.data.data ?? res.data;
  } catch (error: any) {
    console.error(`📦 getVendorOutlets(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function createVendorOutlet(vendorId: string, data: Partial<VendorOutlet>): Promise<VendorOutlet> {
  try {
    //  admin route
    const res = await api.post<ApiResponse<VendorOutlet>>(`/v1/admin/vendors/${vendorId}/outlets`, data);
    return res.data.data ?? (res.data as unknown as VendorOutlet);
  } catch (error: any) {
    console.error(`📦 createVendorOutlet(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function updateVendorOutlet(vendorId: string, outletId: string, data: Partial<VendorOutlet>): Promise<VendorOutlet> {
  try {
    // ✅  admin route
    const res = await api.put<ApiResponse<VendorOutlet>>(`/v1/admin/vendors/${vendorId}/outlets/${outletId}`, data);
    return res.data.data ?? (res.data as unknown as VendorOutlet);
  } catch (error: any) {
    console.error(`📦 updateVendorOutlet(${vendorId}, ${outletId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorInventory(vendorId: string, page = 1, limit = 20) {
  try {
    // ✅ admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/inventory?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorInventory(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function updateVendorInventory(vendorId: string, inventoryId: string, data: any) {
  try {
    // ✅ admin route
    const res = await api.put(`/v1/admin/vendors/${vendorId}/inventory/${inventoryId}`, data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 updateVendorInventory(${vendorId}, ${inventoryId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorLowStockAlerts(vendorId: string, threshold = 5) {
  try {
    // ✅  admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/low-stock?threshold=${threshold}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorLowStockAlerts(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorOrders(vendorId: string, page = 1, limit = 20, status?: string) {
  try {
    // ✅  admin route
    const statusParam = status ? `&status=${status}` : '';
    const res = await api.get(`/v1/admin/vendors/${vendorId}/orders?page=${page}&limit=${limit}${statusParam}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorOrders(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorOrderDetails(vendorId: string, orderId: string) {
  try {
    // ✅ FIXED: admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/orders/${orderId}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorOrderDetails(${vendorId}, ${orderId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function updateVendorOrderStatus(vendorId: string, orderId: string, status: string) {
  try {
    // ✅  admin route
    const res = await api.put(`/v1/admin/vendors/${vendorId}/orders/${orderId}/status`, { status });
    return res.data;
  } catch (error: any) {
    console.error(`📦 updateVendorOrderStatus(${vendorId}, ${orderId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorSalesAnalytics(vendorId: string, period: 'week' | 'month' | 'year' = 'month') {
  try {
    // ✅  admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/analytics/sales?period=${period}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorSalesAnalytics(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

export async function getVendorProductAnalytics(vendorId: string, page = 1, limit = 20) {
  try {
    // ✅  admin route
    const res = await api.get(`/v1/admin/vendors/${vendorId}/analytics/products?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorProductAnalytics(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  listVendors,
  getVendorById,
  getVendorDetails,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorDashboardStats,
  toggleVendorStatus,
  approveVendor,
  getVendorProducts,
  getVendorReviews,
  getVendorOutlets,
  createVendorOutlet,
  updateVendorOutlet,
  getVendorInventory,
  updateVendorInventory,
  getVendorLowStockAlerts,
  getVendorOrders,
  getVendorOrderDetails,
  updateVendorOrderStatus,
  getVendorSalesAnalytics,
  getVendorProductAnalytics,
};
