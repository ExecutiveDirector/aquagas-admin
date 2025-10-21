// src/services/vendorService.ts
import api from './api';
import type { ApiResponse } from '../types';
import { adminLogout } from './adminService';

// Define vendor types based on actual DB schema
export interface Vendor {
  vendor_id: string;
  account_id: string;
  business_name: string;
  trading_name?: string;
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

// ✅ Fetch all vendors (paginated)
export async function listVendors(page = 1, limit = 10): Promise<VendorListResponse> {
  try {
    const response = await api.get<ApiResponse<VendorListResponse>>(
      `/v1/admin/vendors?page=${page}&limit=${limit}`
    );

    const vendorData = response.data?.data;
    if (!vendorData) {
      throw new Error('Invalid API response: Missing data field');
    }

    return vendorData;
  } catch (error: any) {
    console.error('📦 listVendors error:', error);
    handleAuthError(error);
    throw error;
  }
}


// ✅ Get single vendor by ID with outlets
export async function getVendorById(id: string): Promise<Vendor> {
  try {
    const res = await api.get<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}`);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error(`📦 getVendorById(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor details with outlets (public endpoint)
export async function getVendorDetails(vendorId: string): Promise<Vendor> {
  try {
    const res = await api.get<ApiResponse<Vendor>>(`/v1/vendors/${vendorId}`);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error(`📦 getVendorDetails(${vendorId}) error:`, error);
    throw error;
  }
}

// ✅ Create a new vendor
export async function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  try {
    const res = await api.post<ApiResponse<Vendor>>('/v1/admin/vendors', data);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error('📦 createVendor error:', error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Update vendor details
export async function updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
  try {
    const res = await api.put<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}`, data);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error(`📦 updateVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Delete vendor
export async function deleteVendor(id: string): Promise<void> {
  try {
    await api.delete(`/v1/admin/vendors/${id}`);
  } catch (error: any) {
    console.error(`📦 deleteVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor dashboard stats
export async function getVendorDashboardStats(id: string): Promise<VendorDashboardStats> {
  try {
    const res = await api.get(`/v1/vendors/${id}/dashboard`);
    const data = res.data.data || res.data;

    return {
      totalOrders: data.totalOrders || 0,
      pendingOrders: data.pendingOrders || 0,
      revenue: data.revenue || 0,
      totalProducts: data.totalProducts || 0,
    };
  } catch (error: any) {
    console.error(`📊 getVendorDashboardStats(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Suspend or activate vendor
export async function toggleVendorStatus(id: string, active: boolean): Promise<Vendor> {
  try {
    const action = active ? 'activate' : 'suspend';
    const res = await api.post<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}/${action}`);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error(`📦 toggleVendorStatus(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Approve vendor
export async function approveVendor(id: string): Promise<Vendor> {
  try {
    const res = await api.post<ApiResponse<Vendor>>(`/v1/admin/vendors/${id}/approve`);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as Vendor;
  } catch (error: any) {
    console.error(`📦 approveVendor(${id}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor products
export async function getVendorProducts(vendorId: string, page = 1, limit = 20) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/products?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorProducts(${vendorId}) error:`, error);
    throw error;
  }
}

// ✅ Get vendor reviews
export async function getVendorReviews(vendorId: string, page = 1, limit = 20) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/reviews?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorReviews(${vendorId}) error:`, error);
    throw error;
  }
}

// ✅ Get vendor outlets
export async function getVendorOutlets(vendorId: string, page = 1, limit = 20): Promise<VendorOutlet[]> {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/outlets?page=${page}&limit=${limit}`);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as VendorOutlet[];
  } catch (error: any) {
    console.error(`📦 getVendorOutlets(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Create vendor outlet
export async function createVendorOutlet(vendorId: string, data: Partial<VendorOutlet>): Promise<VendorOutlet> {
  try {
    const res = await api.post<ApiResponse<VendorOutlet>>(`/v1/vendors/${vendorId}/outlets`, data);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as VendorOutlet;
  } catch (error: any) {
    console.error(`📦 createVendorOutlet(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Update vendor outlet
export async function updateVendorOutlet(vendorId: string, outletId: string, data: Partial<VendorOutlet>): Promise<VendorOutlet> {
  try {
    const res = await api.put<ApiResponse<VendorOutlet>>(`/v1/vendors/${vendorId}/outlets/${outletId}`, data);
    if (res.data.data) {
      return res.data.data;
    }
    return res.data as VendorOutlet;
  } catch (error: any) {
    console.error(`📦 updateVendorOutlet(${vendorId}, ${outletId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor inventory
export async function getVendorInventory(vendorId: string, page = 1, limit = 20) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/inventory?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorInventory(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Update vendor inventory item
export async function updateVendorInventory(vendorId: string, inventoryId: string, data: any) {
  try {
    const res = await api.put(`/v1/vendors/${vendorId}/inventory/${inventoryId}`, data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 updateVendorInventory(${vendorId}, ${inventoryId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get low stock alerts for vendor
export async function getVendorLowStockAlerts(vendorId: string, threshold = 5) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/low-stock?threshold=${threshold}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorLowStockAlerts(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor orders
export async function getVendorOrders(vendorId: string, page = 1, limit = 20, status?: string) {
  try {
    const statusParam = status ? `&status=${status}` : '';
    const res = await api.get(`/v1/vendors/${vendorId}/orders?page=${page}&limit=${limit}${statusParam}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorOrders(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor order details
export async function getVendorOrderDetails(vendorId: string, orderId: string) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/orders/${orderId}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorOrderDetails(${vendorId}, ${orderId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Update vendor order status
export async function updateVendorOrderStatus(vendorId: string, orderId: string, status: string) {
  try {
    const res = await api.put(`/v1/vendors/${vendorId}/orders/${orderId}/status`, { status });
    return res.data;
  } catch (error: any) {
    console.error(`📦 updateVendorOrderStatus(${vendorId}, ${orderId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor sales analytics
export async function getVendorSalesAnalytics(vendorId: string, period: 'week' | 'month' | 'year' = 'month') {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/analytics/sales?period=${period}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorSalesAnalytics(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Get vendor product analytics
export async function getVendorProductAnalytics(vendorId: string, page = 1, limit = 20) {
  try {
    const res = await api.get(`/v1/vendors/${vendorId}/analytics/products?page=${page}&limit=${limit}`);
    return res.data;
  } catch (error: any) {
    console.error(`📦 getVendorProductAnalytics(${vendorId}) error:`, error);
    handleAuthError(error);
    throw error;
  }
}

// ✅ Internal helper for auth handling
function handleAuthError(error: any) {
  if (error.response?.status === 401) {
    console.warn('Unauthorized — logging out admin...');
    adminLogout();
    window.location.href = '/login';
  }
}

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