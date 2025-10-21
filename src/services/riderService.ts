// src/services/riderService.ts
import api from './api';
import type { ApiResponse, Rider, RiderWithAccount } from '../types';

// ============================================
// RIDER CRUD OPERATIONS
// ============================================

export interface CreateRiderData {
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
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    
    const res = await api.get('/v1/admin/riders', { params });
    console.log('🏍️ Fetched riders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ List riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch riders');
  }
}

export async function getRiderById(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}`);
    console.log('🏍️ Fetched rider details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Get rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider details');
  }
}

export async function createRider(data: CreateRiderData): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/riders', data);
    console.log('🏍️ Created rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Create rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create rider');
  }
}

export async function updateRider(
  riderId: string,
  updates: Partial<CreateRiderData>
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}`, updates);
    console.log('🏍️ Updated rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Update rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update rider');
  }
}

export async function deleteRider(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/riders/${riderId}`);
    console.log('🏍️ Deleted rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Delete rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to delete rider');
  }
}

// ============================================
// RIDER STATUS MANAGEMENT
// ============================================

export async function updateRiderStatus(
  riderId: string,
  status: 'active' | 'inactive' | 'pending' | 'busy'
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/status`, { status });
    console.log('🏍️ Updated rider status:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Update rider status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update rider status');
  }
}

export async function approveRider(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/approve`);
    console.log('✅ Approved rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✅ Approve rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to approve rider');
  }
}

export async function suspendRider(riderId: string, reason?: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/riders/${riderId}/suspend`, { reason });
    console.log('🚫 Suspended rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🚫 Suspend rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to suspend rider');
  }
}

export async function activateRider(riderId: string): Promise<ApiResponse> {
  return updateRiderStatus(riderId, 'active');
}

export async function deactivateRider(riderId: string): Promise<ApiResponse> {
  return updateRiderStatus(riderId, 'inactive');
}

// ============================================
// RIDER VERIFICATION & DOCUMENTS
// ============================================

export async function verifyRider(riderId: string, documents: {
  driving_license_verified?: boolean;
  vehicle_registration_verified?: boolean;
  national_id_verified?: boolean;
}): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/riders/${riderId}/verify`, documents);
    console.log('✅ Verified rider documents:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✅ Verify rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to verify rider');
  }
}

export async function uploadRiderDocument(
  riderId: string,
  documentType: 'license' | 'registration' | 'national_id' | 'profile_photo',
  file: File
): Promise<ApiResponse> {
  try {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);
    
    const res = await api.post(`/v1/admin/riders/${riderId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('📄 Uploaded rider document:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📄 Upload document error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to upload document');
  }
}

export async function getRiderDocuments(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/documents`);
    console.log('📄 Fetched rider documents:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📄 Get rider documents error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider documents');
  }
}

// ============================================
// RIDER ORDERS & DELIVERIES
// ============================================

export async function getRiderOrders(
  riderId: string,
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<ApiResponse> {
  try {
    const params: any = { page, limit };
    if (status) params.status = status;
    
    const res = await api.get(`/v1/admin/riders/${riderId}/orders`, { params });
    console.log('📦 Fetched rider orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get rider orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider orders');
  }
}

export async function getRiderActiveOrders(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/orders/active`);
    console.log('📦 Fetched active orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get active orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch active orders');
  }
}

export async function getRiderOrderHistory(
  riderId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/orders/history`, {
      params: { page, limit }
    });
    console.log('📜 Fetched order history:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📜 Get order history error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order history');
  }
}

// ============================================
// RIDER ANALYTICS & PERFORMANCE
// ============================================

export async function getRiderAnalytics(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/analytics`);
    console.log('📊 Fetched rider analytics:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get rider analytics error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider analytics');
  }
}

export async function getRiderStats(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/stats`);
    console.log('📈 Fetched rider stats:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📈 Get rider stats error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider stats');
  }
}

export async function getRiderPerformance(
  riderId: string,
  period: 'week' | 'month' | 'year' = 'month'
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/performance`, {
      params: { period }
    });
    console.log('📊 Fetched rider performance:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get rider performance error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider performance');
  }
}

export async function getRiderRatings(
  riderId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/ratings`, {
      params: { page, limit }
    });
    console.log('⭐ Fetched rider ratings:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⭐ Get rider ratings error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider ratings');
  }
}

// ============================================
// RIDER EARNINGS & PAYOUTS
// ============================================

export async function getRiderEarnings(
  riderId: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse> {
  try {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const res = await api.get(`/v1/admin/riders/${riderId}/earnings`, { params });
    console.log('💰 Fetched rider earnings:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Get rider earnings error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider earnings');
  }
}

export async function getRiderPayouts(
  riderId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/payouts`, {
      params: { page, limit }
    });
    console.log('💳 Fetched rider payouts:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get rider payouts error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider payouts');
  }
}

export async function processRiderPayout(
  riderId: string,
  amount: number,
  method: 'bank_transfer' | 'mpesa'
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/riders/${riderId}/payouts`, {
      amount,
      method
    });
    console.log('💸 Processed payout:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💸 Process payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to process payout');
  }
}

// ============================================
// RIDER LOCATION & AVAILABILITY
// ============================================

export async function getRiderLocation(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/location`);
    console.log('📍 Fetched rider location:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📍 Get rider location error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider location');
  }
}

export async function updateRiderAvailability(
  riderId: string,
  available: boolean
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/availability`, { available });
    console.log('🟢 Updated rider availability:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🟢 Update availability error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update availability');
  }
}

export async function getAvailableRiders(
  latitude: number,
  longitude: number,
  radius: number = 5
): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/riders/available', {
      params: { latitude, longitude, radius }
    });
    console.log('🏍️ Fetched available riders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Get available riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch available riders');
  }
}

// ============================================
// RIDER PASSWORD & SECURITY
// ============================================

export async function resetRiderPassword(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/riders/${riderId}/reset-password`);
    console.log('🔐 Reset rider password:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔐 Reset password error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to reset password');
  }
}

export async function changeRiderPassword(
  riderId: string,
  newPassword: string
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/password`, {
      password: newPassword
    });
    console.log('🔐 Changed rider password:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔐 Change password error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to change password');
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkUpdateRiders(
  riderIds: string[],
  updates: Partial<{
    status: string;
    approved: boolean;
  }>
): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/riders/bulk-update', {
      rider_ids: riderIds,
      ...updates
    });
    console.log('🏍️ Bulk updated riders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Bulk update riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk update riders');
  }
}

export async function bulkApproveRiders(riderIds: string[]): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/riders/bulk-approve', {
      rider_ids: riderIds
    });
    console.log('✅ Bulk approved riders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✅ Bulk approve riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk approve riders');
  }
}

export async function bulkDeleteRiders(riderIds: string[]): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/riders/bulk-delete', {
      rider_ids: riderIds
    });
    console.log('🏍️ Bulk deleted riders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Bulk delete riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk delete riders');
  }
}

// ============================================
// SEARCH & FILTERS
// ============================================

export async function searchRiders(query: string): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/riders/search', {
      params: { q: query }
    });
    console.log('🔍 Search results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Search riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to search riders');
  }
}

export async function filterRiders(filters: {
  status?: string;
  approved?: boolean;
  vehicle_type?: string;
  rating_min?: number;
  available?: boolean;
}): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/riders/filter', {
      params: filters
    });
    console.log('🔍 Filter results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Filter riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to filter riders');
  }
}

// ============================================
// EXPORT
// ============================================

export async function exportRiders(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
  try {
    const res = await api.get(`/v1/admin/riders/export/${format}`, {
      responseType: 'blob'
    });
    console.log('📥 Exported riders');
    return res.data;
  } catch (error: any) {
    console.error('📥 Export riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to export riders');
  }
}

// Backward compatibility aliases
export const getRiderDetails = getRiderById;
export const updateRiderProfile = updateRider;

export default {
  listRiders,
  getRiderById,
  getRiderDetails,
  createRider,
  updateRider,
  updateRiderProfile,
  deleteRider,
  updateRiderStatus,
  approveRider,
  suspendRider,
  activateRider,
  deactivateRider,
  verifyRider,
  uploadRiderDocument,
  getRiderDocuments,
  getRiderOrders,
  getRiderActiveOrders,
  getRiderOrderHistory,
  getRiderAnalytics,
  getRiderStats,
  getRiderPerformance,
  getRiderRatings,
  getRiderEarnings,
  getRiderPayouts,
  processRiderPayout,
  getRiderLocation,
  updateRiderAvailability,
  getAvailableRiders,
  resetRiderPassword,
  changeRiderPassword,
  bulkUpdateRiders,
  bulkApproveRiders,
  bulkDeleteRiders,
  searchRiders,
  filterRiders,
  exportRiders,
};