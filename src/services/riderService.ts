// src/services/riderService.ts
//
// Functions below are grouped into two sections:
//   1. IMPLEMENTED — these call real, working backend routes
//      (routes/admin.js's RIDER MANAGEMENT section). Use these.
//   2. NOT YET IMPLEMENTED — the backend has no matching route for any
//      of these. They're kept here (rather than deleted) so the intended
//      surface area is visible, but calling any of them will 404. None of
//      these are currently imported anywhere in the app.
import api from './api';
import type { ApiResponse } from '../types';

// ============================================
// IMPLEMENTED — RIDER CRUD
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
    return res.data;
  } catch (error: any) {
    console.error('🏍️ List riders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch riders');
  }
}

export async function getRiderById(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}`);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Get rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider details');
  }
}

export async function createRider(data: CreateRiderData): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/riders', data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Create rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create rider');
  }
}

/** Backed by PUT /v1/admin/riders/:riderId (riderController.updateRider). */
export async function updateRider(
  riderId: string,
  updates: Partial<CreateRiderData>
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}`, updates);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Update rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update rider');
  }
}

// ============================================
// IMPLEMENTED — STATUS & VERIFICATION
// ============================================

/** Backed by PUT /v1/admin/riders/:riderId/status. Real ENUM values only —
 * see riders.current_status in the schema. */
export async function updateRiderStatus(
  riderId: string,
  payload: { status: 'offline' | 'available' | 'busy' | 'on_delivery' | 'on_break' | 'pending' | 'inactive' | 'suspended' }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/status`, payload);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Update rider status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update rider status');
  }
}

export async function approveRider(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/riders/${riderId}/approve`);
    return res.data;
  } catch (error: any) {
    console.error('✅ Approve rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to approve rider');
  }
}

// ============================================
// IMPLEMENTED — ORDERS
// ============================================

/** Backed by GET /v1/admin/riders/:riderId/orders (riderController.getRiderOrdersAdmin). */
export async function getRiderOrders(
  riderId: string,
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/orders`, { params });
    return res.data;
  } catch (error: any) {
    console.error('📦 Get rider orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider orders');
  }
}

// ============================================
// IMPLEMENTED — ANALYTICS
// ============================================

/** Backed by GET /v1/admin/riders/:riderId/analytics (riderController.getRiderAnalyticsAdmin). */
export async function getRiderAnalytics(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/riders/${riderId}/analytics`);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get rider analytics error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider analytics');
  }
}

// ============================================
// IMPLEMENTED — LOCATIONS (for the map view)
// ============================================

/** Backed by GET /v1/admin/riders/locations (riderController.getRiderLocations).
 * rider_locations is genuinely empty in production right now — riders only
 * get a row once the rider app starts reporting position via its own
 * PUT /riders/location self-service endpoint. An empty result here is
 * accurate, not a bug. */
export async function getAllRiderLocations(): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/riders/locations');
    return res.data;
  } catch (error: any) {
    console.error('📍 Get rider locations error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch rider locations');
  }
}

// ============================================
// IMPLEMENTED — PASSWORD RESET
// ============================================

/** Backed by POST /v1/admin/riders/:riderId/reset-password
 * (riderController.resetRiderPassword). No email/SMS delivery channel is
 * wired up on the backend yet, so the response includes the temporary
 * password in plain text (data.temporary_password) for the admin to relay
 * to the rider directly. */
export async function resetRiderPassword(riderId: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/riders/${riderId}/reset-password`);
    return res.data;
  } catch (error: any) {
    console.error('🔐 Reset password error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to reset password');
  }
}

// Backward compatibility aliases
export const getRiderDetails = getRiderById;
export const updateRiderProfile = updateRider;

// ============================================================================
// NOT YET IMPLEMENTED
//
// Everything below calls a backend route that does not exist. They were
// never wired into any page (confirmed: zero usages outside this file),
// so removing them from the default export below is safe — but the
// functions stay here as a record of intended-but-unbuilt features.
// Wire these up only after building the corresponding backend route.
// ============================================================================

export async function deleteRider(riderId: string): Promise<ApiResponse> {
  const res = await api.delete(`/v1/admin/riders/${riderId}`); // ⚠️ no backend route
  return res.data;
}

export async function suspendRider(riderId: string, reason?: string): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/riders/${riderId}/suspend`, { reason }); // ⚠️ no backend route
  return res.data;
}

export async function activateRider(riderId: string): Promise<ApiResponse> {
  return updateRiderStatus(riderId, { status: 'available' });
}

export async function deactivateRider(riderId: string): Promise<ApiResponse> {
  return updateRiderStatus(riderId, { status: 'offline' });
}

export async function verifyRider(riderId: string, documents: Record<string, boolean>): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/riders/${riderId}/verify`, documents); // ⚠️ no backend route
  return res.data;
}

export async function uploadRiderDocument(riderId: string, documentType: string, file: File): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('type', documentType);
  const res = await api.post(`/v1/admin/riders/${riderId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }); // ⚠️ no backend route
  return res.data;
}

export async function getRiderDocuments(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/documents`); // ⚠️ no backend route
  return res.data;
}

export async function getRiderActiveOrders(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/orders/active`); // ⚠️ no backend route — use getRiderOrders with a status filter instead
  return res.data;
}

export async function getRiderOrderHistory(riderId: string, page = 1, limit = 20): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/orders/history`, { params: { page, limit } }); // ⚠️ no backend route — use getRiderOrders instead
  return res.data;
}

export async function getRiderStats(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/stats`); // ⚠️ no backend route — use getRiderAnalytics instead
  return res.data;
}

export async function getRiderPerformance(riderId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/performance`, { params: { period } }); // ⚠️ no backend route
  return res.data;
}

export async function getRiderRatings(riderId: string, page = 1, limit = 20): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/ratings`, { params: { page, limit } }); // ⚠️ no backend route
  return res.data;
}

export async function getRiderEarnings(riderId: string, startDate?: string, endDate?: string): Promise<ApiResponse> {
  const params: any = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const res = await api.get(`/v1/admin/riders/${riderId}/earnings`, { params }); // ⚠️ no backend route
  return res.data;
}

export async function getRiderPayouts(riderId: string, page = 1, limit = 20): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/payouts`, { params: { page, limit } }); // ⚠️ no backend route
  return res.data;
}

export async function processRiderPayout(riderId: string, amount: number, method: 'bank_transfer' | 'mpesa'): Promise<ApiResponse> {
  const res = await api.post(`/v1/admin/riders/${riderId}/payouts`, { amount, method }); // ⚠️ no backend route
  return res.data;
}

export async function getRiderLocation(riderId: string): Promise<ApiResponse> {
  const res = await api.get(`/v1/admin/riders/${riderId}/location`); // ⚠️ no backend route — use getAllRiderLocations and filter client-side instead
  return res.data;
}

export async function updateRiderAvailability(riderId: string, available: boolean): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}/availability`, { available }); // ⚠️ no backend route — use updateRiderStatus instead
  return res.data;
}

export async function getAvailableRiders(latitude: number, longitude: number, radius = 5): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/riders/available', { params: { latitude, longitude, radius } }); // ⚠️ no backend route
  return res.data;
}

export async function changeRiderPassword(riderId: string, newPassword: string): Promise<ApiResponse> {
  const res = await api.put(`/v1/admin/riders/${riderId}/password`, { password: newPassword }); // ⚠️ no backend route — use resetRiderPassword instead
  return res.data;
}

export async function bulkUpdateRiders(riderIds: string[], updates: Partial<{ status: string; approved: boolean }>): Promise<ApiResponse> {
  const res = await api.put('/v1/admin/riders/bulk-update', { rider_ids: riderIds, ...updates }); // ⚠️ no backend route
  return res.data;
}

export async function bulkApproveRiders(riderIds: string[]): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/riders/bulk-approve', { rider_ids: riderIds }); // ⚠️ no backend route
  return res.data;
}

export async function bulkDeleteRiders(riderIds: string[]): Promise<ApiResponse> {
  const res = await api.post('/v1/admin/riders/bulk-delete', { rider_ids: riderIds }); // ⚠️ no backend route
  return res.data;
}

export async function searchRiders(query: string): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/riders/search', { params: { q: query } }); // ⚠️ no backend route — use listRiders(1, 20, query) instead
  return res.data;
}

export async function filterRiders(filters: Record<string, unknown>): Promise<ApiResponse> {
  const res = await api.get('/v1/admin/riders/filter', { params: filters }); // ⚠️ no backend route
  return res.data;
}

export async function exportRiders(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
  const res = await api.get(`/v1/admin/riders/export/${format}`, { responseType: 'blob' }); // ⚠️ no backend route
  return res.data;
}

export default {
  // Implemented
  listRiders,
  getRiderById,
  getRiderDetails,
  createRider,
  updateRider,
  updateRiderProfile,
  updateRiderStatus,
  approveRider,
  getRiderOrders,
  getRiderAnalytics,
  getAllRiderLocations,
  resetRiderPassword,
};
