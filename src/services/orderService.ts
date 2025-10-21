// src/services/orderService.ts
import api from './api';
import type { ApiResponse, Order, OrderItem } from '../types';

// ============================================
// ORDER CRUD OPERATIONS
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
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/orders', { params });
    console.log('📦 Fetched orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 List orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch orders');
  }
}

export async function getOrderById(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}`);
    console.log('📦 Fetched order details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get order error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order details');
  }
}

export async function createOrder(orderData: {
  user_id: string;
  vendor_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  delivery_address: any;
  payment_method: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/orders', orderData);
    console.log('📦 Created order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Create order error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create order');
  }
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}`, updates);
    console.log('📦 Updated order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Update order error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update order');
  }
}

export async function cancelOrder(orderId: string, reason: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/orders/${orderId}/cancel`, { reason });
    console.log('❌ Cancelled order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Cancel order error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to cancel order');
  }
}

// ============================================
// ORDER STATUS MANAGEMENT
// ============================================

export async function updateOrderStatus(
  orderId: string,
  status: string,
  notes?: string
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}/status`, { status, notes });
    console.log('📦 Updated order status:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Update order status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update order status');
  }
}

export async function confirmOrder(orderId: string): Promise<ApiResponse> {
  return updateOrderStatus(orderId, 'confirmed');
}

export async function prepareOrder(orderId: string): Promise<ApiResponse> {
  return updateOrderStatus(orderId, 'preparing');
}

export async function readyOrder(orderId: string): Promise<ApiResponse> {
  return updateOrderStatus(orderId, 'ready');
}

export async function dispatchOrder(orderId: string): Promise<ApiResponse> {
  return updateOrderStatus(orderId, 'dispatched');
}

export async function completeOrder(orderId: string): Promise<ApiResponse> {
  return updateOrderStatus(orderId, 'delivered');
}

// ============================================
// ORDER ASSIGNMENT
// ============================================

export async function assignRiderToOrder(
  orderId: string,
  riderId: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/orders/${orderId}/assign-rider`, {
      rider_id: riderId
    });
    console.log('🏍️ Assigned rider to order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Assign rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to assign rider');
  }
}

export async function unassignRider(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/orders/${orderId}/unassign-rider`);
    console.log('🏍️ Unassigned rider from order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Unassign rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to unassign rider');
  }
}

export async function reassignRider(
  orderId: string,
  newRiderId: string
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}/reassign-rider`, {
      rider_id: newRiderId
    });
    console.log('🔄 Reassigned rider:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔄 Reassign rider error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to reassign rider');
  }
}

// ============================================
// ORDER ITEMS
// ============================================

export async function getOrderItems(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}/items`);
    console.log('📦 Fetched order items:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get order items error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order items');
  }
}

export async function addOrderItem(
  orderId: string,
  itemData: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/orders/${orderId}/items`, itemData);
    console.log('➕ Added order item:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('➕ Add order item error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to add order item');
  }
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  updates: Partial<OrderItem>
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}/items/${itemId}`, updates);
    console.log('✏️ Updated order item:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✏️ Update order item error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update order item');
  }
}

export async function removeOrderItem(orderId: string, itemId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/orders/${orderId}/items/${itemId}`);
    console.log('🗑️ Removed order item:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🗑️ Remove order item error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to remove order item');
  }
}

// ============================================
// ORDER TRACKING
// ============================================

export async function getOrderTracking(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}/tracking`);
    console.log('📍 Fetched order tracking:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📍 Get order tracking error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order tracking');
  }
}

export async function updateOrderLocation(
  orderId: string,
  latitude: number,
  longitude: number
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}/location`, {
      latitude,
      longitude
    });
    console.log('📍 Updated order location:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📍 Update order location error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update order location');
  }
}

export async function getOrderHistory(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}/history`);
    console.log('📜 Fetched order history:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📜 Get order history error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order history');
  }
}

// ============================================
// PAYMENT & REFUNDS
// ============================================

export async function getOrderPayment(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}/payment`);
    console.log('💳 Fetched order payment:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get order payment error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order payment');
  }
}

export async function updatePaymentStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'failed' | 'refunded'
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/orders/${orderId}/payment/status`, { status });
    console.log('💳 Updated payment status:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Update payment status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update payment status');
  }
}

export async function refundOrder(
  orderId: string,
  amount: number,
  reason: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/orders/${orderId}/refund`, {
      amount,
      reason
    });
    console.log('💰 Refunded order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Refund order error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to refund order');
  }
}

export async function partialRefund(
  orderId: string,
  amount: number,
  items: string[],
  reason: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/admin/orders/${orderId}/partial-refund`, {
      amount,
      items,
      reason
    });
    console.log('💰 Partially refunded order:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Partial refund error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to process partial refund');
  }
}

// ============================================
// ORDER REVIEWS
// ============================================

export async function getOrderReviews(orderId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/admin/orders/${orderId}/reviews`);
    console.log('⭐ Fetched order reviews:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⭐ Get order reviews error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order reviews');
  }
}

export async function deleteOrderReview(
  orderId: string,
  reviewId: string
): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/orders/${orderId}/reviews/${reviewId}`);
    console.log('🗑️ Deleted order review:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🗑️ Delete order review error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to delete order review');
  }
}

// ============================================
// ORDER ANALYTICS
// ============================================

export async function getOrderAnalytics(filters?: {
  start_date?: string;
  end_date?: string;
  vendor_id?: string;
  rider_id?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/orders/analytics', { params: filters });
    console.log('📊 Fetched order analytics:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get order analytics error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order analytics');
  }
}

export async function getOrderStats(period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/orders/stats', { params: { period } });
    console.log('📈 Fetched order stats:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📈 Get order stats error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch order stats');
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkUpdateOrders(
  orderIds: string[],
  updates: Partial<{ status: string }>
): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/orders/bulk-update', {
      order_ids: orderIds,
      ...updates
    });
    console.log('📦 Bulk updated orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Bulk update orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk update orders');
  }
}

export async function bulkCancelOrders(
  orderIds: string[],
  reason: string
): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/orders/bulk-cancel', {
      order_ids: orderIds,
      reason
    });
    console.log('❌ Bulk cancelled orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Bulk cancel orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk cancel orders');
  }
}

export async function bulkAssignRider(
  orderIds: string[],
  riderId: string
): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/orders/bulk-assign', {
      order_ids: orderIds,
      rider_id: riderId
    });
    console.log('🏍️ Bulk assigned orders:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🏍️ Bulk assign error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to bulk assign orders');
  }
}

// ============================================
// SEARCH & FILTERS
// ============================================

export async function searchOrders(query: string): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/orders/search', { params: { q: query } });
    console.log('🔍 Search results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Search orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to search orders');
  }
}

// ============================================
// EXPORT
// ============================================

export async function exportOrders(
  format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  filters?: any
): Promise<Blob> {
  try {
    const res = await api.get(`/v1/admin/orders/export/${format}`, {
      params: filters,
      responseType: 'blob'
    });
    console.log('📥 Exported orders');
    return res.data;
  } catch (error: any) {
    console.error('📥 Export orders error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to export orders');
  }
}

// Backward compatibility aliases
export const getOrderDetails = getOrderById;

export default {
  listOrders,
  getOrderById,
  getOrderDetails,
  createOrder,
  updateOrder,
  cancelOrder,
  updateOrderStatus,
  confirmOrder,
  prepareOrder,
  readyOrder,
  dispatchOrder,
  completeOrder,
  assignRiderToOrder,
  unassignRider,
  reassignRider,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  getOrderTracking,
  updateOrderLocation,
  getOrderHistory,
  getOrderPayment,
  updatePaymentStatus,
  refundOrder,
  partialRefund,
  getOrderReviews,
  deleteOrderReview,
  getOrderAnalytics,
  getOrderStats,
  bulkUpdateOrders,
  bulkCancelOrders,
  bulkAssignRider,
  searchOrders,
  exportOrders,
};