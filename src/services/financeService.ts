// src/services/financeService.ts
import api from './api';
import type { ApiResponse, WalletTransaction } from '../types';

// ============================================
// NOTE ON ENDPOINTS
// ============================================
// Admin-facing, platform-wide finance data lives under /v1/admin/finance/*
// (adminFinanceController.js). This is intentionally separate from
// /v1/payments/*, which stays scoped to "my own" data for the logged-in
// consumer (a regular user's own transactions/refunds), and from
// /v1/payments/mpesa/* + /v1/payments/wallet/*, which remain
// consumer-initiated payment flows used during checkout.
// ============================================

// ============================================
// TRANSACTIONS
// ============================================

export interface Transaction {
  transaction_id: string;
  transaction_ref: string;
  order_id?: string;
  user_id?: string;
  transaction_type: 'payment' | 'refund' | 'payout' | 'fee' | 'commission';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_gateway: 'mpesa' | 'pesapal' | 'flutterwave' | 'stripe' | 'manual';
  gateway_transaction_id?: string;
  gateway_fee?: number;
  initiated_at: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  user?: { user_id: string; first_name: string; last_name: string; phone_number: string; email: string };
  order?: { order_id: string; order_number: string; order_status: string; vendor_name?: string };
}

export async function getTransactions(
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    type?: string;
    gateway?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<Transaction[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/finance/transactions', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch transactions');
  }
}

export async function getTransactionById(transactionId: string): Promise<ApiResponse<Transaction>> {
  try {
    const res = await api.get(`/v1/admin/finance/transactions/${transactionId}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch transaction details');
  }
}

// ============================================
// REFUNDS
// ============================================

export interface Refund {
  refund_id: string;
  transaction_id: string;
  order_id?: string;
  user_id?: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_note?: string;
  processed_by?: string;
  requested_at: string;
  processed_at?: string;
  transaction?: { transaction_id: string; transaction_ref: string; amount: number; payment_gateway: string };
  user?: { user_id: string; first_name: string; last_name: string; phone_number: string };
  order?: { order_id: string; order_number: string };
}

export async function getRefunds(
  page: number = 1,
  limit: number = 20,
  filters?: {
    status?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<Refund[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/finance/refunds', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch refunds');
  }
}

export async function approveRefund(refundId: string, admin_note?: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/refunds/${refundId}`, {
      status: 'approved',
      admin_note,
    });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to approve refund');
  }
}

export async function rejectRefund(refundId: string, admin_note: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/refunds/${refundId}`, {
      status: 'rejected',
      admin_note,
    });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to reject refund');
  }
}

export async function processRefund(
  refundId: string,
  data: { status: 'approved' | 'rejected'; admin_note?: string }
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/refunds/${refundId}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to process refund');
  }
}

// ============================================
// PAYOUTS
// ============================================

export interface Payout {
  payout_id: string;
  payout_ref: string;
  entity_type: 'vendor' | 'rider';
  entity_id: string;
  entity_name?: string;
  amount: number;
  method: 'bank_transfer' | 'mpesa';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  description?: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  processed_at?: string;
  created_at: string;
}

export async function getPayouts(
  page: number = 1,
  limit: number = 20,
  filters?: {
    entity_type?: 'vendor' | 'rider';
    status?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse<Payout[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/finance/payouts', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch payouts');
  }
}

export async function createPayout(data: {
  entity_type: 'vendor' | 'rider';
  entity_id: string;
  amount: number;
  method: 'bank_transfer' | 'mpesa';
  description?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/admin/finance/payouts', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to create payout');
  }
}

export async function approvePayout(payoutId: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/payouts/${payoutId}`, { status: 'approved' });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to approve payout');
  }
}

export async function rejectPayout(payoutId: string, rejection_reason: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/payouts/${payoutId}`, {
      status: 'rejected',
      rejection_reason,
    });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to reject payout');
  }
}

export async function completePayout(payoutId: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/admin/finance/payouts/${payoutId}`, { status: 'completed' });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to mark payout completed');
  }
}

// ============================================
// REVENUE & ANALYTICS
// ============================================

export async function getRevenueByVendor(startDate?: string, endDate?: string): Promise<ApiResponse> {
  try {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get('/v1/admin/finance/revenue-by-vendor', { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch vendor revenue');
  }
}

export async function getFinancialSummary(filters?: { start_date?: string; end_date?: string }): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/finance/summary', { params: filters });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch financial summary');
  }
}

// ============================================
// M-PESA
// ============================================

export async function getMpesaTransactions(
  page: number = 1,
  limit: number = 20,
  filters?: { start_date?: string; end_date?: string }
): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/finance/mpesa-transactions', { params: { page, limit, ...filters } });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to fetch M-Pesa transactions');
  }
}

// ============================================
// EXPORT
// Backend returns JSON rows (capped at 5000); CSV is generated client-side
// to match how the rest of the admin dashboard already exports data.
// ============================================

export async function exportFinanceData(
  type: 'transactions' | 'refunds' | 'payouts',
  filters?: { start_date?: string; end_date?: string }
): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/admin/finance/export', { params: { type, ...filters } });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || 'Failed to export finance data');
  }
}

// ============================================
// NOT YET IMPLEMENTED ON THE BACKEND
// ============================================
// These previously pointed at routes that never existed
// (/v1/payments/wallets/:entityType/:entityId/*, /v1/payments/commissions,
// blob-based report export). Rather than silently fail at runtime, they
// now throw clearly so any remaining call sites surface during testing.
// Wire these up to adminFinanceController.js (or a dedicated wallet
// controller) when vendor/rider wallet management is actually built.
// ============================================

export async function getWalletBalance(_entityType: string, _entityId: string): Promise<ApiResponse> {
  throw new Error('Admin wallet lookup by entity is not yet implemented on the backend');
}

export async function getWalletTransactions(
  _entityType: string,
  _entityId: string,
  _page = 1,
  _limit = 20
): Promise<ApiResponse<WalletTransaction[]>> {
  throw new Error('Admin wallet transaction lookup by entity is not yet implemented on the backend');
}

export default {
  getTransactions,
  getTransactionById,
  getRefunds,
  approveRefund,
  rejectRefund,
  processRefund,
  getPayouts,
  createPayout,
  approvePayout,
  rejectPayout,
  completePayout,
  getRevenueByVendor,
  getFinancialSummary,
  getMpesaTransactions,
  exportFinanceData,
  getWalletBalance,
  getWalletTransactions,
};
