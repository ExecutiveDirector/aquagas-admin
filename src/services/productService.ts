// src/services/productService.ts
import api from './api';
import type { ApiResponse } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Product {
  product_id: string;
  category_id: number;
  product_name: string;
  product_code: string;
  brand?: string;
  description?: string;
  size_specification?: string;
  unit_of_measure: 'kg' | 'liters' | 'pieces' | 'meters';
  base_price: number;
  min_price?: number;
  max_price?: number;
  weight_kg?: number;
  dimensions_json?: string;
  carbon_footprint_kg?: number;
  safety_certifications?: string;
  storage_requirements?: string;
  product_images?: string;
  specifications?: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed/joined fields
  image?: string;
  category?: ProductCategory;
  available_at?: VendorInventoryInfo[];
}

export interface ProductCategory {
  category_id: number;
  category_name: string;
  parent_category_id?: number;
  description?: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorInventoryInfo {
  outlet_id: string;
  outlet_name: string;
  vendor_name: string;
  vendor_rating: number;
  price: number;
  stock: number;
  latitude: number;
  longitude: number;
  contact_phone?: string;
  distance_km?: number;
}

export interface Review {
  review_id: string;
  order_id: string;
  reviewer_id: string;
  reviewer_type: 'user' | 'vendor' | 'rider';
  reviewee_id: string;
  reviewee_type: 'vendor' | 'rider' | 'user';
  overall_rating: number;
  service_rating?: number;
  quality_rating?: number;
  delivery_rating?: number;
  review_title?: string;
  review_text?: string;
  pros?: string;
  cons?: string;
  review_images?: string;
  is_anonymous: boolean;
  is_verified: boolean;
  helpful_votes: number;
  total_votes: number;
  vendor_response?: string;
  vendor_response_at?: string;
  created_at: string;
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

export async function listProducts(
  page: number = 1,
  limit: number = 20,
  filters?: {
    search?: string;
    category_id?: number;
    brand?: string;
    is_active?: boolean;
    is_featured?: boolean;
    min_price?: number;
    max_price?: number;
  }
): Promise<ApiResponse<Product[]>> {
  try {
    const params: any = { page, limit, ...filters };
    const res = await api.get('/v1/admin/products', { params });
    console.log('📦 Fetched products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 List products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch products');
  }
}

export async function getProductDetails(productId: string): Promise<ApiResponse<Product>> {
  try {
    const res = await api.get(`/v1/admin/products/${productId}`);
    console.log(`📦 Fetched product ${productId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Get product ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch product details');
  }
}

export async function createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
  try {
    const res = await api.post('/v1/admin/products', data);
    console.log('📦 Created product:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Create product error:', error);
    throw new Error(error.response?.data?.error || 'Failed to create product');
  }
}

export async function updateProduct(
  productId: string,
  data: Partial<Product>
): Promise<ApiResponse<Product>> {
  try {
    const res = await api.put(`/v1/admin/products/${productId}`, data);
    console.log(`📦 Updated product ${productId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Update product ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to update product');
  }
}

export async function deleteProduct(productId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/products/${productId}`);
    console.log(`📦 Deleted product ${productId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Delete product ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to delete product');
  }
}

export async function toggleProductStatus(productId: string): Promise<ApiResponse<Product>> {
  try {
    const res = await api.put(`/v1/admin/products/${productId}/toggle-status`);
    console.log(`📦 Toggled product ${productId} status:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Toggle product ${productId} status error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to toggle product status');
  }
}

export async function toggleProductFeatured(productId: string): Promise<ApiResponse<Product>> {
  try {
    const res = await api.put(`/v1/admin/products/${productId}/toggle-featured`);
    console.log(`📦 Toggled product ${productId} featured:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Toggle product ${productId} featured error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to toggle product featured status');
  }
}

// ============================================
// CATEGORY MANAGEMENT
// ============================================

export async function listCategories(
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<ApiResponse<ProductCategory[]>> {
  try {
    const params: any = { page, limit };
    if (search) params.search = search;
    
    const res = await api.get('/v1/admin/categories', { params });
    console.log('📁 Fetched categories:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📁 List categories error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch categories');
  }
}

export async function getCategoryDetails(categoryId: string): Promise<ApiResponse<ProductCategory>> {
  try {
    const res = await api.get(`/v1/admin/categories/${categoryId}`);
    console.log(`📁 Fetched category ${categoryId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📁 Get category ${categoryId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch category details');
  }
}

export async function createCategory(data: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> {
  try {
    const res = await api.post('/v1/admin/categories', data);
    console.log('📁 Created category:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📁 Create category error:', error);
    throw new Error(error.response?.data?.error || 'Failed to create category');
  }
}

export async function updateCategory(
  categoryId: string,
  data: Partial<ProductCategory>
): Promise<ApiResponse<ProductCategory>> {
  try {
    const res = await api.put(`/v1/admin/categories/${categoryId}`, data);
    console.log(`📁 Updated category ${categoryId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📁 Update category ${categoryId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to update category');
  }
}

export async function deleteCategory(categoryId: string): Promise<ApiResponse> {
  try {
    const res = await api.delete(`/v1/admin/categories/${categoryId}`);
    console.log(`📁 Deleted category ${categoryId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📁 Delete category ${categoryId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to delete category');
  }
}

export async function reorderCategories(categoryOrders: { category_id: number; sort_order: number }[]): Promise<ApiResponse> {
  try {
    const res = await api.put('/v1/admin/categories/reorder', { categories: categoryOrders });
    console.log('📁 Reordered categories:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📁 Reorder categories error:', error);
    throw new Error(error.response?.data?.error || 'Failed to reorder categories');
  }
}

// ============================================
// PRODUCT SEARCH & DISCOVERY
// ============================================

export async function searchProducts(
  query: string,
  filters?: {
    category?: number;
    min_price?: number;
    max_price?: number;
    brand?: string;
  }
): Promise<ApiResponse<Product[]>> {
  try {
    const params: any = { q: query, ...filters };
    const res = await api.get('/v1/products/search', { params });
    console.log('🔍 Search results:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('🔍 Search products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to search products');
  }
}

export async function getFeaturedProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
  try {
    const res = await api.get('/v1/products/featured', { params: { limit } });
    console.log('⭐ Fetched featured products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('⭐ Get featured products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch featured products');
  }
}

export async function getNearbyProducts(
  latitude: number,
  longitude: number,
  radius: number = 50
): Promise<ApiResponse<{
  vendors: Array<{
    vendor_id: string;
    name: string;
    outlet_id: string;
    outlet_name: string;
    rating: number;
    distance_km: number;
    products: Product[];
  }>;
}>> {
  try {
    const res = await api.get('/v1/products/nearby', {
      params: { lat: latitude, lng: longitude, radius }
    });
    console.log('📍 Fetched nearby products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📍 Get nearby products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch nearby products');
  }
}

// ============================================
// PRODUCT AVAILABILITY
// ============================================

export async function checkProductAvailability(
  productId: string,
  latitude?: number,
  longitude?: number
): Promise<ApiResponse<{
  available: boolean;
  total_stock: number;
  locations: VendorInventoryInfo[];
}>> {
  try {
    const params: any = {};
    if (latitude) params.lat = latitude;
    if (longitude) params.lng = longitude;
    
    const res = await api.get(`/v1/products/${productId}/availability`, { params });
    console.log(`📦 Product ${productId} availability:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📦 Check availability for ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to check product availability');
  }
}

export async function getProductVendors(productId: string): Promise<ApiResponse<VendorInventoryInfo[]>> {
  try {
    const res = await api.get(`/v1/products/${productId}/vendors`);
    console.log(`🏪 Product ${productId} vendors:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`🏪 Get vendors for ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch product vendors');
  }
}

// ============================================
// PRODUCT REVIEWS
// ============================================

export async function getProductReviews(
  productId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<Review[]>> {
  try {
    const res = await api.get(`/v1/products/${productId}/reviews`, {
      params: { page, limit }
    });
    console.log(`⭐ Product ${productId} reviews:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`⭐ Get reviews for ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch product reviews');
  }
}

export async function addProductReview(
  productId: string,
  data: {
    order_id: string;
    overall_rating: number;
    service_rating?: number;
    quality_rating?: number;
    delivery_rating?: number;
    review_title?: string;
    review_text?: string;
    pros?: string;
    cons?: string;
    is_anonymous?: boolean;
  }
): Promise<ApiResponse<Review>> {
  try {
    const res = await api.post(`/v1/products/${productId}/reviews`, data);
    console.log(`⭐ Added review for product ${productId}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`⭐ Add review for ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to add product review');
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkUpdateProducts(
  productIds: string[],
  updates: Partial<Product>
): Promise<ApiResponse<{ updated_count: number }>> {
  try {
    const res = await api.put('/v1/admin/products/bulk-update', {
      product_ids: productIds,
      updates
    });
    console.log('📦 Bulk updated products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Bulk update products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to bulk update products');
  }
}

export async function bulkDeleteProducts(productIds: string[]): Promise<ApiResponse<{ deleted_count: number }>> {
  try {
    const res = await api.post('/v1/admin/products/bulk-delete', {
      product_ids: productIds
    });
    console.log('📦 Bulk deleted products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Bulk delete products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to bulk delete products');
  }
}

export async function importProducts(
  file: File,
  options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
  }
): Promise<ApiResponse<{
  imported_count: number;
  skipped_count: number;
  errors: Array<{ row: number; error: string }>;
}>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    const res = await api.post('/v1/admin/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('📦 Imported products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Import products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to import products');
  }
}

export async function exportProducts(
  format: 'csv' | 'xlsx' | 'json' = 'csv',
  filters?: {
    category_id?: number;
    brand?: string;
    is_active?: boolean;
  }
): Promise<Blob> {
  try {
    const params: any = { format, ...filters };
    const res = await api.get('/v1/admin/products/export', {
      params,
      responseType: 'blob'
    });
    console.log('📦 Exported products:', format);
    return res.data;
  } catch (error: any) {
    console.error('📦 Export products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to export products');
  }
}

// ============================================
// PRODUCT ANALYTICS
// ============================================

export async function getProductAnalytics(
  productId: string,
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<ApiResponse<{
  views: number;
  orders: number;
  revenue: number;
  avg_rating: number;
  conversion_rate: number;
  trends: {
    dates: string[];
    views: number[];
    orders: number[];
    revenue: number[];
  };
}>> {
  try {
    const res = await api.get(`/v1/admin/products/${productId}/analytics`, {
      params: { time_range: timeRange }
    });
    console.log(`📊 Product ${productId} analytics:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error(`📊 Get analytics for ${productId} error:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch product analytics');
  }
}

export async function getTopProducts(
  metric: 'sales' | 'revenue' | 'views' | 'rating' = 'sales',
  limit: number = 10,
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<ApiResponse<Product[]>> {
  try {
    const res = await api.get('/v1/admin/products/top', {
      params: { metric, limit, time_range: timeRange }
    });
    console.log(`📊 Top products by ${metric}:`, res.data);
    return res.data;
  } catch (error: any) {
    console.error('📊 Get top products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch top products');
  }
}

export async function getLowStockProducts(
  threshold: number = 10,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<Array<Product & { current_stock: number; vendor_count: number }>>> {
  try {
    const res = await api.get('/v1/admin/products/low-stock', {
      params: { threshold, page, limit }
    });
    console.log('📦 Low stock products:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('📦 Get low stock products error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch low stock products');
  }
}

// Default export
export default {
  // Product Management
  listProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  toggleProductFeatured,
  
  // Category Management
  listCategories,
  getCategoryDetails,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  
  // Search & Discovery
  searchProducts,
  getFeaturedProducts,
  getNearbyProducts,
  
  // Availability
  checkProductAvailability,
  getProductVendors,
  
  // Reviews
  getProductReviews,
  addProductReview,
  
  // Bulk Operations
  bulkUpdateProducts,
  bulkDeleteProducts,
  importProducts,
  exportProducts,
  
  // Analytics
  getProductAnalytics,
  getTopProducts,
  getLowStockProducts,
}