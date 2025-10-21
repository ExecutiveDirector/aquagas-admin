// src/services/userService.ts
import api from './api';
import type { ApiResponse, User, UserWithAccount } from '../types';

// ============================================
// USER CRUD OPERATIONS
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
    console.log('👥 Fetched users:', res.data);
    
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
  } catch (error: any) {
    console.error('👥 List users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch users');
  }
}

export async function getUserById(userId: string): Promise<ApiResponse<User>> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}`);
    console.log('👤 Fetched user details:', res.data);
    
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
  } catch (error: any) {
    console.error('👤 Get user error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user details');
  }
}

export async function createUser(userData: {
  fullName: string;
  email?: string;
  phone_number?: string;
  password: string;
  role: 'admin' | 'customer' | 'vendor' | 'rider';
  status?: 'active' | 'inactive';
}): Promise<ApiResponse<User>> {
  try {
    const res = await api.post('/v1/admin/users', {
      ...userData,
      role: userData.role.toLowerCase(),
    });
    console.log('👥 Created user:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👥 Create user error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create user');
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
    console.log('👤 Updated user:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👤 Update user error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update user');
  }
}

export async function deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await api.delete(`/v1/admin/users/${userId}`);
    console.log('👤 Deleted user:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👤 Delete user error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to delete user');
  }
}

// ============================================
// USER STATUS MANAGEMENT
// ============================================

export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive'
): Promise<ApiResponse<User>> {
  try {
    const res = await api.put(`/v1/admin/users/${userId}/status`, { status });
    console.log('👤 Updated user status:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👤 Update user status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update user status');
  }
}

export async function activateUser(userId: string): Promise<ApiResponse<User>> {
  return updateUserStatus(userId, 'active');
}

export async function deactivateUser(userId: string): Promise<ApiResponse<User>> {
  return updateUserStatus(userId, 'inactive');
}

export const toggleUserStatus = updateUserStatus;

// ============================================
// USER WALLET OPERATIONS
// ============================================

export async function getUserWallet(userId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/wallet`);
    console.log('💰 Fetched user wallet:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Get user wallet error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user wallet');
  }
}

export async function getUserWalletTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/wallet/transactions`, {
      params: { page, limit }
    });
    console.log('💳 Fetched wallet transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get wallet transactions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch wallet transactions');
  }
}

export async function creditUserWallet(
  userId: string,
  amount: number,
  description: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/users/${userId}/wallet/credit`, {
      amount,
      description
    });
    console.log('💰 Credited user wallet:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Credit wallet error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to credit wallet');
  }
}

export async function debitUserWallet(
  userId: string,
  amount: number,
  description: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/users/${userId}/wallet/debit`, {
      amount,
      description
    });
    console.log('💰 Debited user wallet:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Debit wallet error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to debit wallet');
  }
}

// ============================================
// USER ORDERS & ACTIVITY
// ============================================

export async function getUserOrders(
  userId: string,
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<ApiResponse> {
  try {
    const params: any = { page, limit };
    if (status) params.status = status;
    
    const res = await api.get(`/v1/admin/users/${userId}/orders`, { params });
    console.log('📦 Fetched user orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get user orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user orders');
  }
}

export async function getUserAddresses(userId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/addresses`);
    console.log('📍 Fetched user addresses:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📍 Get user addresses error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user addresses');
  }
}

export async function getUserActivity(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/activity`, {
      params: { page, limit }
    });
    console.log('📊 Fetched user activity:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get user activity error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user activity');
  }
}

// ============================================
// USER ANALYTICS
// ============================================

export async function getUserAnalytics(userId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/analytics`);
    console.log('📊 Fetched user analytics:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get user analytics error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user analytics');
  }
}

export async function getUserStats(userId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/users/${userId}/stats`);
    console.log('📈 Fetched user stats:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📈 Get user stats error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch user stats');
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkUpdateUsers(
  userIds: string[],
  updates: Partial<{
    status: string;
    role: string;
  }>
): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/users/bulk-update', {
      user_ids: userIds,
      ...updates
    });
    console.log('👥 Bulk updated users:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👥 Bulk update users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk update users');
  }
}

export async function bulkDeleteUsers(userIds: string[]): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/users/bulk-delete', {
      user_ids: userIds
    });
    console.log('👥 Bulk deleted users:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('👥 Bulk delete users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk delete users');
  }
}

// ============================================
// USER SEARCH & FILTERS
// ============================================

export async function searchUsers(query: string): Promise<ApiResponse<User[]>> {
  try {
    const res = await api.get('/v1/admin/users/search', {
      params: { q: query }
    });
    console.log('🔍 Search results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Search users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to search users');
  }
}

export async function filterUsers(filters: {
  role?: string;
  status?: string;
  registered_from?: string;
  registered_to?: string;
  has_orders?: boolean;
}): Promise<ApiResponse<User[]>> {
  try {
    const res = await api.get('/v1/admin/users/filter', {
      params: filters
    });
    console.log('🔍 Filter results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Filter users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to filter users');
  }
}

// ============================================
// EXPORT
// ============================================

export async function exportUsers(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
  try {
    const res = await api.get(`/v1/admin/users/export/${format}`, {
      responseType: 'blob'
    });
    console.log('📥 Exported users');
    return res.data;
  } catch (error: any) {
    console.error('📥 Export users error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to export users');
  }
}

// Backward compatibility alias
export const getUserDetails = getUserById;

export default {
  listUsers,
  getUserById,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  activateUser,
  deactivateUser,
  toggleUserStatus,
  getUserWallet,
  getUserWalletTransactions,
  creditUserWallet,
  debitUserWallet,
  getUserOrders,
  getUserAddresses,
  getUserActivity,
  getUserAnalytics,
  getUserStats,
  bulkUpdateUsers,
  bulkDeleteUsers,
  searchUsers,
  filterUsers,
  exportUsers,
};