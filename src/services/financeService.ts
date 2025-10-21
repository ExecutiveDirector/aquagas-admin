// src/services/financeService.ts
import api from './api';
import type { ApiResponse, WalletTransaction } from '../types';

// ============================================
// TRANSACTIONS
// ============================================

export interface Transaction {
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
    console.log('💳 Fetched transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get transactions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch transactions');
  }
}

export async function getTransactionById(transactionId: string): Promise<ApiResponse<Transaction>> {
  try {
    const res = await api.get(`/v1/payments/transactions/${transactionId}`);
    console.log('💳 Fetched transaction details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get transaction error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch transaction details');
  }
}

export async function exportTransactions(
  format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  filters?: any
): Promise<Blob> {
  try {
    const res = await api.get(`/v1/payments/transactions/export/${format}`, {
      params: filters,
      responseType: 'blob'
    });
    console.log('📥 Exported transactions');
    return res.data;
  } catch (error: any) {
    console.error('📥 Export transactions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to export transactions');
  }
}

// ============================================
// REFUNDS
// ============================================

export interface Refund {
  id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requested_at: string;
  processed_at?: string;
  user_id?: string;
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
    throw new Error(error?.response?.data?.error || 'Failed to fetch refunds');
  }
}

export async function getRefundById(refundId: string): Promise<ApiResponse<Refund>> {
  try {
    const res = await api.get(`/v1/payments/refunds/${refundId}`);
    console.log('💰 Fetched refund details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Get refund error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch refund details');
  }
}

export async function approveRefund(
  refundId: string,
  notes?: string
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/payments/refunds/${refundId}`, {
      status: 'approved',
      notes
    });
    console.log('✅ Approved refund:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✅ Approve refund error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to approve refund');
  }
}

export async function rejectRefund(
  refundId: string,
  reason: string
): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/payments/refunds/${refundId}`, {
      status: 'rejected',
      notes: reason
    });
    console.log('❌ Rejected refund:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Reject refund error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to reject refund');
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
    throw new Error(error?.response?.data?.error || 'Failed to process refund');
  }
}

// ============================================
// PAYOUTS
// ============================================

export async function getPayouts(
  page: number = 1,
  limit: number = 20,
  filters?: {
    entity_type?: 'vendor' | 'rider';
    entity_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/payments/payouts', { params });
    console.log('💸 Fetched payouts:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💸 Get payouts error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch payouts');
  }
}

export async function getPayoutById(payoutId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/payments/payouts/${payoutId}`);
    console.log('💸 Fetched payout details:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💸 Get payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch payout details');
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
    const res = await api.post('/v1/payments/payouts', data);
    console.log('💸 Created payout:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💸 Create payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to create payout');
  }
}

export async function approvePayout(payoutId: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/payments/payouts/${payoutId}/approve`);
    console.log('✅ Approved payout:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('✅ Approve payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to approve payout');
  }
}

export async function rejectPayout(payoutId: string, reason: string): Promise<ApiResponse> {
  try {
    const res = await api.put(`/v1/payments/payouts/${payoutId}/reject`, { reason });
    console.log('❌ Rejected payout:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('❌ Reject payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to reject payout');
  }
}

export async function processPayout(payoutId: string): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/payments/payouts/${payoutId}/process`);
    console.log('⚡ Processed payout:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⚡ Process payout error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to process payout');
  }
}

// ============================================
// WALLETS
// ============================================

export async function getWalletBalance(
  entityType: 'user' | 'vendor' | 'rider',
  entityId: string
): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/payments/wallets/${entityType}/${entityId}/balance`);
    console.log('💰 Fetched wallet balance:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Get wallet balance error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch wallet balance');
  }
}

export async function getWalletTransactions(
  entityType: 'user' | 'vendor' | 'rider',
  entityId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<WalletTransaction[]>> {
  try {
    const params: any = { page, limit };
    const res = await api.get(`/v1/payments/wallets/${entityType}/${entityId}/transactions`, { params });
    console.log('💳 Fetched wallet transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💳 Get wallet transactions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch wallet transactions');
  }
}

export async function creditWallet(
  entityType: 'user' | 'vendor' | 'rider',
  entityId: string,
  amount: number,
  description: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/payments/wallets/${entityType}/${entityId}/credit`, {
      amount,
      description
    });
    console.log('💰 Credited wallet:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Credit wallet error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to credit wallet');
  }
}

export async function debitWallet(
  entityType: 'user' | 'vendor' | 'rider',
  entityId: string,
  amount: number,
  description: string
): Promise<ApiResponse> {
  try {
    const res = await api.post(`/v1/payments/wallets/${entityType}/${entityId}/debit`, {
      amount,
      description
    });
    console.log('💰 Debited wallet:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💰 Debit wallet error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to debit wallet');
  }
}

// ============================================
// REVENUE & ANALYTICS
// ============================================

export async function getRevenueReport(
  startDate: string,
  endDate: string
): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/payments/revenue', {
      params: { start_date: startDate, end_date: endDate }
    });
    console.log('📊 Fetched revenue report:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get revenue report error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch revenue report');
  }
}

export async function getRevenueByVendor(
  startDate?: string,
  endDate?: string
): Promise<ApiResponse> {
  try {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const res = await api.get('/v1/payments/revenue/by-vendor', { params });
    console.log('📊 Fetched vendor revenue:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get vendor revenue error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch vendor revenue');
  }
}

export async function getCommissions(
  page: number = 1,
  limit: number = 20,
  filters?: {
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<ApiResponse> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/payments/commissions', { params });
    console.log('💵 Fetched commissions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('💵 Get commissions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch commissions');
  }
}

export async function getFinancialSummary(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/payments/summary', { params: { period } });
    console.log('📈 Fetched financial summary:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📈 Get financial summary error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch financial summary');
  }
}

// ============================================
// M-PESA INTEGRATION
// ============================================

export async function initiateMpesaPayment(data: {
  phone_number: string;
  amount: number;
  order_id?: string;
  description?: string;
}): Promise<ApiResponse> {
  try {
    const res = await api.post('/v1/payments/mpesa/initiate', data);
    console.log('📱 Initiated M-Pesa payment:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Initiate M-Pesa error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to initiate M-Pesa payment');
  }
}

export async function checkMpesaStatus(checkoutRequestId: string): Promise<ApiResponse> {
  try {
    const res = await api.get(`/v1/payments/mpesa/status/${checkoutRequestId}`);
    console.log('📱 Checked M-Pesa status:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Check M-Pesa status error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to check M-Pesa status');
  }
}

export async function getMpesaTransactions(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> {
  try {
    const res = await api.get('/v1/payments/mpesa/transactions', {
      params: { page, limit }
    });
    console.log('📱 Fetched M-Pesa transactions:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📱 Get M-Pesa transactions error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to fetch M-Pesa transactions');
  }
}

// ============================================
// EXPORT & REPORTS
// ============================================

export async function exportFinancialReport(
  reportType: 'transactions' | 'payouts' | 'revenue' | 'commissions',
  format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  filters?: any
): Promise<Blob> {
  try {
    const res = await api.get(`/v1/payments/reports/${reportType}/export/${format}`, {
      params: filters,
      responseType: 'blob'
    });
    console.log('📥 Exported financial report');
    return res.data;
  } catch (error: any) {
    console.error('📥 Export report error:', error);
    throw new Error(error?.response?.data?.error || 'Failed to export report');
  }
}

// Backward compatibility aliases
export const getTransactionDetails = getTransactionById;
export const getRefundDetails = getRefundById;
export const getPayoutDetails = getPayoutById;

export default {
  getTransactions,
  getTransactionById,
  getTransactionDetails,
  exportTransactions,
  getRefunds,
  getRefundById,
  getRefundDetails,
  approveRefund,
  rejectRefund,
  processRefund,
  getPayouts,
  getPayoutById,
  getPayoutDetails,
  createPayout,
  approvePayout,
  rejectPayout,
  processPayout,
  getWalletBalance,
  getWalletTransactions,
  creditWallet,
  debitWallet,
  getRevenueReport,
  getRevenueByVendor,
  getCommissions,
  getFinancialSummary,
  initiateMpesaPayment,
  checkMpesaStatus,
  getMpesaTransactions,
  exportFinancialReport,
};