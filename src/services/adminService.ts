// src/services/adminService.ts
// This file aggregates and re-exports from specialized services

import api from './api';
import type { 
  ApiResponse, 
  DashboardStats,
  User,
  Product,
  Category,
} from '../types';

// Re-export auth functions
export { 
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
} from './authService';

// Re-export vendor functions
export {
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
} from './vendorService';

// Import auth and vendor services for use in default export
import * as authService from './authService';
import * as vendorService from './vendorService';
import type { Vendor, VendorOutlet } from './vendorService';

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

export async function getDashboardStats(vendorId?: string): Promise<DashboardStats> {
  try {
    const endpoint = vendorId 
      ? `/v1/admin/vendors/${vendorId}/dashboard` 
      : '/v1/admin/dashboard';
    
    console.log('📊 Fetching dashboard stats from:', endpoint);
    const res = await api.get(endpoint);
    const data = res.data.data || res.data;
    
    return {
      users: data.users || 0,
      vendors: data.vendors || 0,
      riders: data.riders || 0,
      orders: data.orders || 0,
      todayRevenue: data.todayRevenue || data.today_revenue || 0,
    };
  } catch (error: any) {
    console.error('📊 Dashboard stats error:', error);
    throw error;
  }
}

export async function getDailyAnalytics(date: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/analytics/daily/${date}`);
  return res.data;
}

export async function getRevenueReport(startDate: string, endDate: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/reports/revenue`, { 
    params: { start_date: startDate, end_date: endDate } 
  });
  return res.data;
}

export async function getPerformanceReport(
  entityType: 'vendor' | 'rider' | 'user', 
  entityId: string
): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/reports/performance/${entityType}/${entityId}`);
  return res.data;
}

export async function exportReport(
  reportType: 'orders' | 'users' | 'revenue', 
  format: 'csv' | 'pdf', 
  filters?: any
): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/reports/${reportType}/export/${format}`, { 
    params: filters, 
    responseType: 'blob' 
  });
  return res.data;
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function listUsers(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<ApiResponse<User[]>> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    
    const res = await api.get('/v1/admin/users', { params });
    const mappedUsers = (res.data.data || []).map((user: any) => ({
      id: user.id?.toString(),
      fullName: user.fullName,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      status: user.status,
      walletBalance: user.walletBalance ?? 0,
      lastLogin: user.lastLogin,
    }));
    
    return {
      ...res.data,
      data: mappedUsers,
    };
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to fetch users");
  }
}

export async function getUserDetails(userId: string): Promise<ApiResponse<User>> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}`);
    const user = res.data.data || res.data;
    return {
      ...res.data,
      data: {
        id: user.id?.toString(),
        fullName: user.fullName,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        status: user.status,
        walletBalance: user.walletBalance ?? 0,
        lastLogin: user.lastLogin,
      },
    };
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to fetch user details");
  }
}

export async function createUser(userData: {
  fullName: string;
  email?: string;
  phone_number?: string;
  password: string;
  role: string;
  status?: string;
  // Only required/used when role === 'admin' — matches admin_users columns.
  // The backend now rejects admin creation unless the caller is super_admin
  // and admin_role is one of the valid ENUM values.
  admin_role?: 'super_admin' | 'operations_admin' | 'finance_admin' | 'support_admin' | 'marketing_admin';
  employee_id?: string;
  department?: string;
  permissions?: Record<string, string[]>;
}): Promise<ApiResponse<User>> {
  try {
    const res = await api.post('/v1/admin/users', {
      ...userData,
      role: userData.role.toLowerCase(),
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to create user");
  }
}

export async function updateUser(
  userId: string,
  updates: Partial<{
    fullName: string;
    email: string;
    phone_number: string;
    password: string;
    role: string;
    status: string;
  }>
): Promise<ApiResponse<User>> {
  try {
    const res = await api.put(`/v1/admin/users/${userId}`, {
      ...updates,
      role: updates.role ? updates.role.toLowerCase() : undefined,
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to update user");
  }
}

export async function updateUserStatus(
  userId: string,
  status: string
): Promise<ApiResponse<User>> {
  try {
    const res = await api.put(`/v1/admin/users/${userId}/status`, { status });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to update user status");
  }
}

export const toggleUserStatus = updateUserStatus;

export async function deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await api.delete(`/v1/admin/users/${userId}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || "Failed to delete user");
  }
}

// ============================================
// RIDER MANAGEMENT
// ============================================

interface NewRiderForm {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_registration?: string;
  driving_license_no?: string;
  license_expiry_date?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export async function listRiders(
  page: number = 1, 
  limit: number = 20, 
  search?: string
): Promise<ApiResponse> {
  const params: any = { page, limit };
  if (search) params.search = search;
  const res = await api.get('/v1/admin/riders', { params });
  return res.data;
}

export async function createRider(data: NewRiderForm): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/riders', data);
  return res.data;
}

export async function approveRider(riderId: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}/approve`);
  return res.data;
}

export async function updateRiderStatus(
  riderId: string,
  data: { status: string }
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}/status`, data);
  return res.data;
}

export async function resetRiderPassword(riderId: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/riders/${riderId}/reset-password`);
  return res.data;
}

export async function getRiderDetails(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}`);
  return res.data;
}

export async function updateRiderProfile(
  riderId: string,
  updates: Partial<NewRiderForm>
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}`, updates);
  return res.data;
}

// GET /riders/:riderId/orders?page=1&limit=10
export const getRiderOrders = async (
  riderId: string,
  params: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 10 } = params;
  const res = await api.get(`/riders/${riderId}/orders`, { params: { page, limit } });
  return res.data; // { data: Order[], total: number, page: number }
};
 
// GET /riders/:riderId/analytics
// Returns the summary object from getRiderAnalyticsAdmin
export const getRiderAnalytics = async (riderId: string) => {
  const res = await api.get(`/riders/${riderId}/analytics`);
  return res.data; // { data: { totalDeliveries, completedDeliveries, completionRate, avgRating, totalEarnings } }
};

// ============================================
// ORDER MANAGEMENT
// ============================================

export async function listOrders(
  page: number = 1, 
  limit: number = 20, 
  filters?: {
    status?: string;
    vendor_id?: string;
    rider_id?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }
): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/orders', { params });
  return res.data;
}

export async function getOrderDetails(orderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/orders/${orderId}`);
  return res.data;
}

export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  notes?: string
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/orders/${orderId}/status`, { status, notes });
  return res.data;
}

export async function assignRiderToOrder(
  orderId: string, 
  riderId: string
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/orders/${orderId}/assign-rider`, { rider_id: riderId });
  return res.data;
}

export async function refundOrder(
  orderId: string, 
  amount: number, 
  reason: string
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/orders/${orderId}/refund`, { amount, reason });
  return res.data;
}

// ============================================
// PRODUCT & CATEGORY MANAGEMENT
// ============================================

export async function listProducts(
  page: number = 1, 
  limit: number = 20, 
  search?: string
): Promise<ApiResponse<Product[]>> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const res = await api.get('/v1/admin/products', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch products');
  }
}

export async function createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
  try {
    const res = await api.post('/v1/admin/products', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to create product');
  }
}

export async function updateProduct(
  productId: string, 
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  try {
    const res = await api.put(`/v1/admin/products/${productId}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to update product');
  }
}

export async function deleteProduct(productId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/products/${productId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to delete product');
  }
}

export async function listCategories(
  page: number = 1, 
  limit: number = 20, 
  search?: string
): Promise<ApiResponse<Category[]>> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const res = await api.get('/v1/admin/categories', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch categories');
  }
}

export async function createCategory(data: Partial<Category>): Promise<ApiResponse<Category>> {
  try {
    const res = await api.post('/v1/admin/categories', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to create category');
  }
}

export async function updateCategory(
  categoryId: string, 
  data: Partial<Category>
): Promise<ApiResponse<Category>> {
  try {
    const res = await api.put(`/v1/admin/categories/${categoryId}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to update category');
  }
}

export async function deleteCategory(categoryId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/categories/${categoryId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to delete category');
  }
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================

export async function listNotifications(
  page: number = 1, 
  limit: number = 20, 
  search?: string
): Promise<ApiResponse> {
  const params: any = { page, limit };
  if (search) params.search = search;
  const res = await api.get('/v1/admin/notifications', { params });
  return res.data;
}

export async function getNotificationDetails(notificationId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/notifications/${notificationId}`);
  return res.data;
}

export async function createNotification(notificationData: {
  notification_type: string;
  title: string;
  content: string;
  recipient_type: 'user' | 'vendor' | 'rider' | 'all';
  recipient_id?: string;
  template_id?: string;
}): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/notifications', notificationData);
  return res.data;
}

export async function sendNotification(notificationId: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/notifications/${notificationId}/send`);
  return res.data;
}

export async function deleteNotification(notificationId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/notifications/${notificationId}`);
  return res.data;
}

export async function updateNotification(
  notificationId: string, 
  updates: {
    title?: string;
    content?: string;
    notification_type?: string;
  }
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/notifications/${notificationId}`, updates);
  return res.data;
}

// ============================================
// SYSTEM & SETTINGS
// ============================================

export async function getSystemSettings(): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/system/settings');
  return res.data;
}

export async function updateSystemSettings(settings: Record<string, any>): Promise<ApiResponse> {
  const res = await api.put('/v1/admin/system/settings', settings);
  return res.data;
}

export async function getAuditLogs(
  page: number = 1, 
  limit: number = 20, 
  filters?: {
    user_id?: string;
    action_type?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/audit-logs', { params });
  return res.data;
}

export async function getSystemEvents(
  page: number = 1, 
  limit: number = 20, 
  filters?: {
    event_type?: string;
    severity?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/system/events', { params });
  return res.data;
}

// ============================================
// SUPPORT TICKETS
// ============================================

export async function listSupportTickets(
  page: number = 1, 
  limit: number = 20, 
  filters?: {
    status?: string;
    type?: string;
    assigned_to?: string;
    user_id?: string;
    vendor_id?: string;
    rider_id?: string;
  }
): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/support-tickets', { params });
  return res.data;
}

export async function getSupportTicketDetails(ticketId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/support-tickets/${ticketId}`);
  return res.data;
}

export async function updateSupportTicket(
  ticketId: string,
  updates: {
    status?: string;
    priority?: string;
    assigned_admin_id?: string;
    notes?: string;
  }
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/support-tickets/${ticketId}`, updates);
  return res.data;
}

export async function addSupportMessage(
  ticketId: string,
  message: {
    content: string;
    is_internal?: boolean;
  }
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/support-tickets/${ticketId}/messages`, message);
  return res.data;
}

export async function assignSupportTicket(
  ticketId: string, 
  adminId: string
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/support-tickets/${ticketId}/assign`, { admin_id: adminId });
  return res.data;
}

export async function closeSupportTicket(
  ticketId: string, 
  resolution: string
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/support-tickets/${ticketId}/close`, { resolution });
  return res.data;
}

// ============================================
// ADMIN MANAGEMENT (super_admin only)
//
// These call the real endpoints added to routes/admin.js. Unlike
// listRoles/createRole/etc below — which hit /v1/admin/roles and
// /v1/admin/users/:id/assign-role, neither of which exist on the backend —
// these are wired to controllers/adminController.js's listAdmins/
// getAdminDetails/updateAdminRole/updateAdminStatus.
// ============================================

export interface AdminPermissions {
  // Per-section dashboard access overrides — true grants a section this
  // admin's admin_role wouldn't normally include; false withdraws a section
  // it would. Absent = falls back to the admin_role default. See
  // src/config/rolePermissions.ts and middleware/authMiddleware.js.
  sections?: Record<string, boolean>;
  // Legacy fine-grained resource:action permissions (e.g. { vendors: ["approve"] }),
  // still honoured by requirePermission() on routes that use it directly.
  [resource: string]: string[] | Record<string, boolean> | undefined;
}

export interface AdminUser {
  admin_id: string;
  account_id?: string;
  email?: string;
  phone_number?: string;
  admin_role: 'super_admin' | 'operations_admin' | 'finance_admin' | 'support_admin' | 'marketing_admin';
  employee_id?: string | null;
  department?: string | null;
  permissions?: AdminPermissions;
  is_active: boolean;
  account_is_active?: boolean;
  last_active_at?: string | null;
  last_login_at?: string | null;
  created_at?: string;
}

export async function listAdmins(): Promise<ApiResponse<AdminUser[]>> {
  try {
    const res = await api.get('/v1/admin/admins');
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || 'Failed to fetch admins');
  }
}

export async function getAdminDetails(adminId: string): Promise<ApiResponse<AdminUser>> {
  try {
    const res = await api.get(`/v1/admin/admins/${adminId}`);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || 'Failed to fetch admin details');
  }
}

export async function updateAdminRole(
  adminId: string,
  updates: Partial<{
    admin_role: string;
    permissions: AdminPermissions;
    department: string;
    employee_id: string;
  }>
): Promise<ApiResponse<AdminUser>> {
  try {
    const res = await api.put(`/v1/admin/admins/${adminId}`, updates);
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || 'Failed to update admin');
  }
}

export async function updateAdminStatus(
  adminId: string,
  is_active: boolean
): Promise<ApiResponse<AdminUser>> {
  try {
    const res = await api.put(`/v1/admin/admins/${adminId}/status`, { is_active });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error || 'Failed to update admin status');
  }
}

// ============================================
// ROLES & PERMISSIONS
//
// ⚠️ Dead code — nothing in the UI calls these, and none of these routes
// exist on the backend (/v1/admin/roles, /v1/admin/users/:id/assign-role,
// /v1/admin/users/:id/permissions all 404). Left in place rather than
// deleted in case something external depends on the exports, but use the
// Admin Management functions above instead — they're wired to real
// endpoints. See adminController.js's admin_role ENUM system, which this
// generic "roles" concept doesn't map onto.
// ============================================

export async function listRoles(): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/roles');
  return res.data;
}

export async function getRoleDetails(roleId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/roles/${roleId}`);
  return res.data;
}

export async function createRole(roleData: {
  name: string;
  description?: string;
  permissions?: string[];
}): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/roles', roleData);
  return res.data;
}

export async function updateRole(
  roleId: string,
  updates: Partial<{
    name: string;
    description: string;
    permissions: string[];
  }>
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/roles/${roleId}`, updates);
  return res.data;
}

export async function deleteRole(roleId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/roles/${roleId}`);
  return res.data;
}

export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/users/${userId}/assign-role`, { roleId });
  return res.data;
}

export async function updateUserPermissions(
  userId: string,
  permissions: string[]
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/users/${userId}/permissions`, { permissions });
  return res.data;
}

// Test API connectivity
export async function testApiConnection(): Promise<{
  success: boolean;
  data?: any;
  error?: any;
  status?: number;
}> {
  try {
    console.log('🧪 Testing API connection to:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api');
    const response = await api.get('/v1/admin/test');
    console.log('🧪 API test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('🧪 API test failed:', error);
    return { 
      success: false, 
      error: {
        message: error.response?.data?.error || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        headers: error.config?.headers?.Authorization ? 'Bearer [TOKEN]' : 'No Auth Header'
      },
      status: error.response?.status
    };
  }
}

// Backward compatibility - vendor functions that were in adminService
export async function vendorRegister(vendorData: {
  business_name: string;
  contact_person: string;
  business_email: string;
  business_phone: string;
  password: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
}): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/vendors/register', vendorData);
  return res.data;
}

export async function vendorLogin(credentials: { 
  business_email: string; 
  password: string 
}): Promise<ApiResponse> {
  const res = await api.post('/v1/vendors/login', credentials);
  return res.data;
}

// Backward compatibility exports
export async function getInventory(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorInventory(vendorId);
}

export async function updateInventory(
  vendorId: string, 
  productId: string, 
  updates: any
): Promise<ApiResponse> {
  return vendorService.updateVendorInventory(vendorId, productId, updates);
}

export async function recordInventoryMovement(
  vendorId: string, 
  movement: {
    product_id: string;
    quantity: number;
    type: 'in' | 'out';
  }
): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/vendors/${vendorId}/inventory/movements`, movement);
  return res.data;
}

export async function getLowStockAlerts(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorLowStockAlerts(vendorId);
}

export async function approveVendorCompat(vendorId: string): Promise<ApiResponse<Vendor>> {
  const data = await vendorService.approveVendor(vendorId);
  return { data };
}

export async function updateVendorStatusCompat(
  vendorId: string, 
  status: string
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/status`, { status });
  return res.data;
}

// Additional backward compatibility aliases
export async function getRecentOrders(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorOrders(vendorId, 1, 10);
}

export async function getVendorProductsCompat(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorProducts(vendorId);
}

export async function getVendorReviewsCompat(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorReviews(vendorId);
}

export async function createOutlet(
  vendorId: string, 
  outletData: { name: string; address: string }
): Promise<ApiResponse<VendorOutlet>> {
  const data = await vendorService.createVendorOutlet(vendorId, outletData as any);
  return { data };
}

export async function updateOutlet(
  vendorId: string, 
  outletId: string, 
  updates: { name?: string; address?: string }
): Promise<ApiResponse<VendorOutlet>> {
  const data = await vendorService.updateVendorOutlet(vendorId, outletId, updates as any);
  return { data };
}

export async function getOutlets(vendorId: string): Promise<ApiResponse<VendorOutlet[]>> {
  const data = await vendorService.getVendorOutlets(vendorId);
  return { data };
}

export async function getSalesAnalytics(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorSalesAnalytics(vendorId);
}

export async function getProductAnalytics(vendorId: string): Promise<ApiResponse> {
  return vendorService.getVendorProductAnalytics(vendorId);
}

// Notification Templates
export async function listNotificationTemplates(): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/notification-templates');
  return res.data;
}

export async function createNotificationTemplate(templateData: {
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables?: string;
}): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/notification-templates', templateData);
  return res.data;
}

export async function updateNotificationTemplate(
  templateId: string, 
  updates: {
    name?: string;
    subject?: string;
    content?: string;
    variables?: string;
  }
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/notification-templates/${templateId}`, updates);
  return res.data;
}

export async function deleteNotificationTemplate(templateId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/notification-templates/${templateId}`);
  return res.data;
}

// Finance Management (Payments & Refunds)
interface Transaction {
  id: string;
  type: 'revenue' | 'expense' | 'commission' | 'payout';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  date: string;
  vendor?: string;
  rider?: string;
  mpesa_code?: string;
  order_id?: string;
  category: string;
}

interface Refund {
  id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requested_at: string;
  processed_at?: string;
  user_id?: string;
}

export async function getTransactions(
  page: number = 1,
  limit: number = 20,
  filters?: {
    user_id?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<Transaction[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/payments/transactions', { params });
    console.log('📊 Fetched transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get transactions error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch transactions');
  }
}

export async function getTransactionDetails(transactionId: string): Promise<ApiResponse<Transaction>> {
  try {
    const res = await api.get(`/v1/payments/transactions/${transactionId}`);
    console.log('📊 Fetched transaction details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get transaction details error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch transaction details');
  }
}

export async function getRefunds(
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<Refund[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/payments/refunds', { params });
    console.log('💰 Fetched refunds:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Get refunds error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch refunds');
  }
}

export async function processRefund(
  refundId: string,
  data: {
    status: 'approved' | 'rejected';
    notes?: string;
  }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/payments/refunds/${refundId}`, data);
    console.log('💰 Processed refund:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Process refund error:', error);
    throw new Error(error.response?.data?.error || 'Failed to process refund');
  }
}

// Default export with all functions
export default {
  // Auth
  login: authService.login,
  logout: authService.logout,
  getToken: authService.getToken,
  getAccount: authService.getAccount,
  isAuthenticated: authService.isAuthenticated,
  isAdmin: authService.isAdmin,
  getAdminRole: authService.getAdminRole,
  isSuperAdmin: authService.isSuperAdmin,
  adminLogin: authService.adminLogin,
  adminLogout: authService.adminLogout,
  getAdminToken: authService.getAdminToken,
  getAdminAccount: authService.getAdminAccount,
  
  // Dashboard
  getDashboardStats,
  getDailyAnalytics,
  getRevenueReport,
  getPerformanceReport,
  exportReport,
  
  // Users
  listUsers,
  getUserDetails,
  createUser,
  updateUser,
  updateUserStatus,
  toggleUserStatus,
  deleteUser,
  
  // Riders
  listRiders,
  createRider,
  approveRider,
  updateRiderStatus,
  resetRiderPassword,
  getRiderDetails,
  updateRiderProfile,
  getRiderAnalytics,
  getRiderOrders,
  
  // Orders
  listOrders,
  getOrderDetails,
  updateOrderStatus,
  assignRiderToOrder,
  refundOrder,
  
  // Products & Categories
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Vendors (re-exported)
  listVendors: vendorService.listVendors,
  getVendorById: vendorService.getVendorById,
  getVendorDetails: vendorService.getVendorDetails,
  createVendor: vendorService.createVendor,
  updateVendor: vendorService.updateVendor,
  deleteVendor: vendorService.deleteVendor,
  getVendorDashboardStats: vendorService.getVendorDashboardStats,
  toggleVendorStatus: vendorService.toggleVendorStatus,
  approveVendor: vendorService.approveVendor,
  getVendorProducts: vendorService.getVendorProducts,
  getVendorReviews: vendorService.getVendorReviews,
  getVendorOutlets: vendorService.getVendorOutlets,
  createVendorOutlet: vendorService.createVendorOutlet,
  updateVendorOutlet: vendorService.updateVendorOutlet,
  getVendorInventory: vendorService.getVendorInventory,
  updateVendorInventory: vendorService.updateVendorInventory,
  getVendorLowStockAlerts: vendorService.getVendorLowStockAlerts,
  getVendorOrders: vendorService.getVendorOrders,
  getVendorOrderDetails: vendorService.getVendorOrderDetails,
  updateVendorOrderStatus: vendorService.updateVendorOrderStatus,
  getVendorSalesAnalytics: vendorService.getVendorSalesAnalytics,
  getVendorProductAnalytics: vendorService.getVendorProductAnalytics,
  
  // Notifications
  listNotifications,
  getNotificationDetails,
  createNotification,
  sendNotification,
  deleteNotification,
  updateNotification,
  listNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  
  // System
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getSystemEvents,
  
  // Support
  listSupportTickets,
  getSupportTicketDetails,
  updateSupportTicket,
  addSupportMessage,
  assignSupportTicket,
  closeSupportTicket,
  
  // Roles
  listRoles,
  getRoleDetails,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  updateUserPermissions,

  // Admin Management (super_admin only, real endpoints)
  listAdmins,
  getAdminDetails,
  updateAdminRole,
  updateAdminStatus,
  
  // Finance
  getTransactions,
  getTransactionDetails,
  getRefunds,
  processRefund,
  
  // Utilities
  testApiConnection,
  
  // Backward compatibility
  vendorRegister,
  vendorLogin,
  getInventory,
  updateInventory,
  recordInventoryMovement,
  getLowStockAlerts,
  getRecentOrders,
  getOutlets,
  createOutlet,
  updateOutlet,
  getSalesAnalytics,
  getProductAnalytics,
};
