// src/services/catalogSyncService.ts
//
// Admin-panel side of the WhatsApp wholesaler -> catalog automation.
// Hits the /v1/admin/vendors/:vendorId/... endpoints added to routes/admin.js
// (see backend INTEGRATION.md — "admin.routes.snippet.js").

import api from './api';
import type { ApiResponse } from '../types';

// ============================================================
// TYPES
// ============================================================

export interface WholesalerSource {
  source_id: string;
  vendor_id: string;
  outlet_id?: string | null;
  channel: 'whatsapp_group' | 'whatsapp_dm';
  whatsapp_group_jid: string;
  source_label?: string;
  wholesaler_name?: string;
  auto_apply_known_products: boolean;
  auto_publish_new_products: boolean;
  status: 'active' | 'paused' | 'disconnected';
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogStagingItem {
  staging_id: string;
  message_id: string;
  source_id: string;
  extracted_name: string;
  extracted_unit?: string;
  extracted_size?: string;
  wholesale_cost: string | number;
  suggested_category_id?: number;
  matched_product_id?: string;
  match_confidence?: string | number;
  match_type: 'exact' | 'fuzzy' | 'llm_assisted' | 'none';
  computed_retail_price?: string | number;
  margin_pct_applied?: string | number;
  status: 'auto_applied' | 'pending_review' | 'approved' | 'rejected';
  review_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  suggested_category?: { category_id: number; category_name: string };
  matched_product?: { product_id: string; product_name: string };
}

// ============================================================
// WHOLESALER SOURCES
// ============================================================

export async function listWholesalerSources(vendorId: string): Promise<WholesalerSource[]> {
  const res = await api.get<ApiResponse<WholesalerSource[]>>(
    `/v1/admin/vendors/${vendorId}/wholesaler-sources`
  );
  return res.data.data || [];
}

export async function createWholesalerSource(
  vendorId: string,
  data: {
    whatsapp_group_jid: string;
    source_label?: string;
    wholesaler_name?: string;
    outlet_id?: string;
    auto_apply_known_products?: boolean;
  }
): Promise<WholesalerSource> {
  const res = await api.post<ApiResponse<WholesalerSource>>(
    `/v1/admin/vendors/${vendorId}/wholesaler-sources`,
    data
  );
  return res.data.data as WholesalerSource;
}

export async function updateWholesalerSource(
  vendorId: string,
  sourceId: string,
  data: { status?: WholesalerSource['status']; auto_apply_known_products?: boolean }
): Promise<WholesalerSource> {
  const res = await api.patch<ApiResponse<WholesalerSource>>(
    `/v1/admin/vendors/${vendorId}/wholesaler-sources/${sourceId}`,
    data
  );
  return res.data.data as WholesalerSource;
}

// ============================================================
// CATALOG REVIEW QUEUE
// ============================================================

export async function listCatalogStagingItems(
  vendorId: string,
  status: CatalogStagingItem['status'] = 'pending_review'
): Promise<CatalogStagingItem[]> {
  const res = await api.get<ApiResponse<CatalogStagingItem[]>>(
    `/v1/admin/vendors/${vendorId}/catalog-staging`,
    { params: { status } }
  );
  return res.data.data || [];
}

export async function approveCatalogStagingItem(
  vendorId: string,
  stagingId: string,
  data: { category_id?: number; margin_pct_override?: number; outlet_id?: string } = {}
): Promise<{ staging_id: string; product_id: string; retail_price: number }> {
  const res = await api.post<
    ApiResponse<{ staging_id: string; product_id: string; retail_price: number }>
  >(`/v1/admin/vendors/${vendorId}/catalog-staging/${stagingId}/approve`, data);
  return res.data.data as any;
}

export async function rejectCatalogStagingItem(vendorId: string, stagingId: string): Promise<void> {
  await api.post(`/v1/admin/vendors/${vendorId}/catalog-staging/${stagingId}/reject`);
}

export default {
  listWholesalerSources,
  createWholesalerSource,
  updateWholesalerSource,
  listCatalogStagingItems,
  approveCatalogStagingItem,
  rejectCatalogStagingItem,
};
