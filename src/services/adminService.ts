// services/adminService.ts
import api from './api';

// Type definitions
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AdminDashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
}

interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
}

interface Vendor {
  vendor_id: string;
  business_name: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
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
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

import type { User } from '../pages/users/types';

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
// Authentication Check
// export function isAdmin(): boolean {
//   try {
//     const userInfo = localStorage.getItem('userInfo');
//     if (!userInfo) {
//       console.warn('isAdmin: No userInfo found in localStorage');
//       return false;
//     }
//     const parsed = JSON.parse(userInfo);
//     const isAdminUser = parsed.role === 'admin' || parsed.admin_role === 'super_admin';
//     if (!isAdminUser) {
//       console.warn('isAdmin: User is not an admin or super_admin', {
//         role: parsed.role,
//         admin_role: parsed.admin_role,
//       });
//     }
//     return isAdminUser;
//   } catch (error) {
//     console.error('isAdmin: Error parsing userInfo:', error);
//     return false;
//   }
// }
export function isAdmin(): boolean {
  try {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) return false;
    const parsed = JSON.parse(userInfo);

    return (
      parsed.role === 'admin' &&
      (
        parsed.admin_role === 'super_admin' ||
        ['finance', 'support', 'operations', 'marketing', 'inventory'].includes(parsed.admin_role)
      )
    );
  } catch {
    return false;
  }
}

// Authentication Functions
export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  try {
    const res = await api.post<LoginResponse>('/v1/auth/login', { email, password });
    
    const { token, account, role, admin_role } = res.data;
    if (token) {
      localStorage.setItem('token', token);
      const userInfo = { account, role, admin_role };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      console.log('Stored userInfo:', userInfo);
    }
    
    return res.data;
  } catch (error: any) {
    console.error('Admin login error:', error);
    throw error;
  }
}

export function adminLogout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('sg_admin_token');
  localStorage.removeItem('account');
  localStorage.removeItem('sg_admin_account');
  localStorage.removeItem('userInfo');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
}

export function getAdminToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('sg_admin_token');
}

export function getAdminAccount(): any {
  const account = localStorage.getItem('account') || localStorage.getItem('sg_admin_account');
  return account ? JSON.parse(account) : null;
}

// Dashboard Functions
export async function getDashboardStats(vendorId?: string): Promise<AdminDashboardStats> {
  try {
    const endpoint = vendorId ? `/v1/admin/vendors/${vendorId}/dashboard` : '/v1/admin/dashboard';
    console.log('Fetching dashboard stats from:', endpoint);
    
    const res = await api.get(endpoint);
    console.log('Dashboard response:', res.data);
    
    const data = res.data.data || res.data;
    
    return {
      users: data.users || 0,
      vendors: data.vendors || 0,
      riders: data.riders || 0,
      orders: data.orders || 0,
      todayRevenue: data.todayRevenue || 0,
      totalRevenue: data.totalRevenue,
      pendingOrders: data.pendingOrders,
      completedOrders: data.completedOrders,
    };
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      adminLogout();
      window.location.href = '/login';
    }
    throw error;
  }
}

// Backward compatibility
export const login = adminLogin;
export const logout = adminLogout;
export const getToken = getAdminToken;
export const getAccount = getAdminAccount;

// Vendor Management Functions
export async function listVendors(page: number = 1, limit: number = 20, search?: string): Promise<ApiResponse> {
  const params: any = { page, limit };
  if (search) params.search = search;
  const res = await api.get('/v1/admin/vendors', { params });
  return res.data;
}

export async function approveVendor(vendorId: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/approve`);
  return res.data;
}

export async function updateVendorStatus(vendorId: string, status: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/status`, { status });
  return res.data;
}

export async function updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<ApiResponse> {
  try {
    const res = await api.patch<ApiResponse>(`/v1/admin/vendors/${vendorId}`, updates);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to update vendor');
  }
}

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

// Vendor Authentication
export async function vendorLogin(credentials: { business_email: string; password: string }): Promise<ApiResponse> {
  const res = await api.post('/v1/vendors/login', credentials);
  return res.data;
}

// Vendor Details
export async function getVendorDetails(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}`);
  return res.data;
}

export async function getVendorProducts(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/products`);
  return res.data;
}

export async function getVendorReviews(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/reviews`);
  return res.data;
}

export async function getRecentOrders(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/orders/recent`);
  return res.data;
}

// Inventory Management
export async function getInventory(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/inventory`);
  return res.data;
}

export async function updateInventory(vendorId: string, productId: string, updates: any): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/inventory/${productId}`, updates);
  return res.data;
}

export async function recordInventoryMovement(vendorId: string, movement: {
  product_id: string;
  quantity: number;
  type: 'in' | 'out';
}): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/vendors/${vendorId}/inventory/movements`, movement);
  return res.data;
}

export async function getLowStockAlerts(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/inventory/low-stock`);
  return res.data;
}

// Vendor Order Management
export async function getVendorOrders(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/orders`);
  return res.data;
}

export async function updateVendorOrderStatus(vendorId: string, orderId: string, update: { status: string }): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/orders/${orderId}/status`, update);
  return res.data;
}

export async function getVendorOrderDetails(vendorId: string, orderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/orders/${orderId}`);
  return res.data;
}

// Vendor Analytics
export async function getSalesAnalytics(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/analytics/sales`);
  return res.data;
}

export async function getProductAnalytics(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/analytics/products`);
  return res.data;
}

// Outlets Management
export async function getOutlets(vendorId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/vendors/${vendorId}/outlets`);
  return res.data;
}

export async function createOutlet(vendorId: string, outletData: { name: string; address: string }): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/vendors/${vendorId}/outlets`, outletData);
  return res.data;
}

export async function updateOutlet(vendorId: string, outletId: string, updates: { name?: string; address?: string }): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/vendors/${vendorId}/outlets/${outletId}`, updates);
  return res.data;
}

// Rider Management Functions
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

export async function listRiders(page: number = 1, limit: number = 20, search?: string): Promise<ApiResponse> {
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
  updates: Partial<{
    full_name: string;
    phone: string;
    vehicle_type: string;
    vehicle_registration: string;
    national_id: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  }>
): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}`, updates);
  return res.data;
}

export async function getRiderAnalytics(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/analytics`);
  return res.data;
}

export async function getRiderOrders(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/orders`);
  return res.data;
}

// Notifications Management Functions
export async function listNotifications(page: number = 1, limit: number = 20, search?: string): Promise<ApiResponse> {
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

export async function updateNotification(notificationId: string, updates: {
  title?: string;
  content?: string;
  notification_type?: string;
}): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/notifications/${notificationId}`, updates);
  return res.data;
}

// Notification Templates Management
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

export async function updateNotificationTemplate(templateId: string, updates: {
  name?: string;
  subject?: string;
  content?: string;
  variables?: string;
}): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/notification-templates/${templateId}`, updates);
  return res.data;
}

export async function deleteNotificationTemplate(templateId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/notification-templates/${templateId}`);
  return res.data;
}

// System Management Functions
export async function getSystemSettings(): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/system/settings');
  return res.data;
}

export async function updateSystemSettings(settings: Record<string, any>): Promise<ApiResponse> {
  const res = await api.put('/v1/admin/system/settings', settings);
  return res.data;
}

export async function getAuditLogs(page: number = 1, limit: number = 20, filters?: {
  user_id?: string;
  action_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/audit-logs', { params });
  return res.data;
}

export async function getSystemEvents(page: number = 1, limit: number = 20, filters?: {
  event_type?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/system/events', { params });
  return res.data;
}

// User CRUD Management
export async function createUser(userData: {
  fullName: string;
  email?: string;
  phone_number?: string;
  password: string;
  role: string;
  status?: string;
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

export async function listUsers(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<ApiResponse<User[]>> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    const res = await api.get('/v1/admin/users', { params });
    const mappedUsers = res.data.data.map((user: any) => ({
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
    const user = res.data.data;
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

// Role & Permission Management
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

// Support Ticket Management
export async function listSupportTickets(page: number = 1, limit: number = 20, filters?: {
  status?: string;
  type?: string;
  assigned_to?: string;
  user_id?: string;
  vendor_id?: string;
  rider_id?: string;
}): Promise<ApiResponse> {
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

export async function assignSupportTicket(ticketId: string, adminId: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/support-tickets/${ticketId}/assign`, { admin_id: adminId });
  return res.data;
}

export async function closeSupportTicket(ticketId: string, resolution: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/support-tickets/${ticketId}/close`, { resolution });
  return res.data;
}

// Order Management
export async function listOrders(page: number = 1, limit: number = 20, filters?: {
  status?: string;
  vendor_id?: string;
  rider_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ApiResponse> {
  const params: any = { page, limit, ...filters };
  const res = await api.get('/v1/admin/orders', { params });
  return res.data;
}

export async function getOrderDetails(orderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/orders/${orderId}`);
  return res.data;
}

export async function updateOrderStatus(orderId: string, status: string, notes?: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/orders/${orderId}/status`, { status, notes });
  return res.data;
}

export async function assignRiderToOrder(orderId: string, riderId: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/orders/${orderId}/assign-rider`, { rider_id: riderId });
  return res.data;
}

export async function refundOrder(orderId: string, amount: number, reason: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/orders/${orderId}/refund`, { amount, reason });
  return res.data;
}

// Reports & Analytics
export async function getDailyAnalytics(date: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/analytics/daily/${date}`);
  return res.data;
}

export async function getRevenueReport(startDate: string, endDate: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/reports/revenue`, { params: { start_date: startDate, end_date: endDate } });
  return res.data;
}

export async function getPerformanceReport(entityType: 'vendor' | 'rider' | 'user', entityId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/reports/performance/${entityType}/${entityId}`);
  return res.data;
}

export async function exportReport(reportType: 'orders' | 'users' | 'revenue', format: 'csv' | 'pdf', filters?: any): Promise<ApiResponse> {
  const params = { ...filters };
  const res = await api.get(`/v1/admin/reports/${reportType}/export/${format}`, { params, responseType: 'blob' });
  return res.data;
}


// Finance Management Functions
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
    console.log('Fetched transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Get transactions error:', error);
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch transactions');
  }
}

export async function getTransactionDetails(transactionId: string): Promise<ApiResponse<Transaction>> {
  try {
    const res = await api.get(`/v1/payments/transactions/${transactionId}`);
    console.log('Fetched transaction details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Get transaction details error:', error);
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
    console.log('Fetched refunds:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Get refunds error:', error);
    if (error.response?.status === 401) {
      console.error('Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
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
    console.log('Processed refund:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Process refund error:', error);
    throw new Error(error.response?.data?.error || 'Failed to process refund');
  }
}

// Test API connectivity
export async function testApiConnection(): Promise<{success: boolean, data?: any, error?: any, status?: number}> {
  try {
    console.log('Testing API connection to:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api');
    
    // First try the test endpoint
    const response = await api.get('/v1/admin/test');
    console.log('API test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('API test failed:', error);
    
    // Return detailed error info
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