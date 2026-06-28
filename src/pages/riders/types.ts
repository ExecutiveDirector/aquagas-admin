// src/services/types.ts
// Complete type definitions for the admin panel
// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  pagination?: PaginationMeta;
  // Several real endpoints (rider list, notifications list, password
  // reset) return extra top-level fields outside the strict shape above —
  // e.g. { data, total, page, limit } or { message, temporary_password }.
  // Allowing arbitrary extra keys here matches what the backend actually
  // sends instead of forcing every caller to cast past this type.
  [key: string]: any;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface LoginResponse {
  token: string;
  message: string;
  role: string;
  admin_role: string | null;
  account?: any;
}

export interface AuthResponse {
  message: string;
  token: string;
  role: 'admin' | 'vendor' | 'rider' | 'customer';
  admin_role?: 'super_admin' | 'finance' | 'support' | 'operations' | 'marketing' | 'inventory';
  full_access?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  phone_number?: string;
  full_name?: string;
  role?: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  today_revenue?: number;
  total_revenue?: number;
  pending_orders?: number;
  completed_orders?: number;
}

export interface VendorDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  totalProducts: number;
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  user_id?: string;
  account_id?: string;
  fullName: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  role: string;
  status: string;
  walletBalance: number;
  lastLogin?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  profile_picture_url?: string;
  referral_code?: string;
  referred_by_code?: string;
  preferred_language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserWithAccount extends User {
  account?: {
    account_id: string;
    email?: string;
    phone_number?: string;
    role: string;
    is_active: boolean;
    last_login_at?: string;
  };
  user_wallet?: {
    wallet_id: string;
    balance: number;
  };
}

export interface AdminUser {
  admin_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  admin_role: 'super_admin' | 'finance' | 'support' | 'operations' | 'marketing' | 'inventory';
  department?: string;
  permissions?: any;
  created_at?: string;
}

export interface CreateUserData {
  fullName: string;
  email?: string;
  phone_number?: string;
  password: string;
  role: 'admin' | 'rider' | 'vendor' | 'customer';
  status?: 'active' | 'inactive';
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  role?: 'admin' | 'rider' | 'vendor' | 'customer';
  status?: 'active' | 'inactive';
}

// ============================================
// RIDER TYPES
// ============================================

export interface Rider {
  rider_id: string;
  account_id?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  phone_number?: string;
  vehicle_type: string;
  vehicle_registration?: string;
  driving_license_no?: string;
  license_expiry_date?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'suspended';
  approved?: boolean;
  // FIX: matches the real riders.current_status ENUM in the database
  // schema exactly (was 'active' | 'inactive' | 'pending' | 'busy', which
  // doesn't include 'available', 'offline', 'on_delivery', or 'on_break' —
  // the values the backend and rider app actually use).
  current_status?: 'offline' | 'available' | 'busy' | 'on_delivery' | 'on_break' | 'pending' | 'inactive' | 'suspended';
  rating?: number;
  total_deliveries?: number;
  is_active: boolean;
  // Real column on riders (see models/riders.js) — was missing from this
  // type even though the backend has always returned it.
  is_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderWithAccount extends Rider {
  account?: {
    account_id: string;
    email: string;
    phone_number: string;
    role: string;
    is_active: boolean;
  };
}

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

// ============================================
// PRODUCT TYPES
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
  product_images?: string | string[];
  specifications?: string | any;
  tags?: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed/joined fields
  image?: string;
  category?: Category;
  available_at?: VendorInventoryInfo[];
}

export interface Category {
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

// Alias for backward compatibility
export type ProductCategory = Category;

export interface CreateProductData {
  product_name: string;
  product_code: string;
  category_id?: number;
  brand?: string;
  description?: string;
  base_price: number;
  product_images?: string[];
  specifications?: any;
  tags?: string[];
  is_featured?: boolean;
  is_active?: boolean;
}

export interface CreateCategoryData {
  category_name: string;
  parent_category_id?: number;
  description?: string;
  icon_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ============================================
// VENDOR TYPES
// ============================================

export interface Vendor {
  vendor_id: string;
  account_id: string;
  business_name: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
  business_registration_no?: string;
  tax_pin?: string;
  license_number?: string;
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
  business_hours?: any;
  verification_documents?: any;
  bank_account_details?: any;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VendorOutlet {
  outlet_id: string;
  vendor_id: string;
  outlet_name: string;
  outlet_code: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  contact_phone?: string;
  manager_name?: string;
  operating_hours?: any;
  facilities?: any;
  is_active?: boolean;
  created_at?: string;
}

export interface VendorInventory {
  inventory_id: string;
  outlet_id: string;
  product_id: string;
  current_stock: number;
  reserved_stock?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  cost_price?: number;
  selling_price: number;
  supplier_info?: any;
  last_restocked_at?: string;
  last_sold_at?: string;
  expiry_date?: string;
  batch_number?: string;
  is_available: boolean;
  created_at?: string;
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

export interface VendorAnalytics {
  analytics_id: string;
  vendor_id: string;
  report_date: string;
  completed_orders: number;
  total_revenue: number;
  average_preparation_time_minutes: number;
  average_rating: number;
  products_out_of_stock: number;
  low_stock_products: number;
  created_at?: string;
}

export interface CreateVendorData {
  business_name: string;
  trading_name?: string;
  brand?: 'Total' | 'Rubis' | 'Shell' | 'Kobil' | 'Vivo' | 'Independent';
  contact_person: string;
  business_phone?: string;
  business_email?: string;
  business_registration_no?: string;
  tax_pin?: string;
  license_number?: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface Order {
  order_id: string;
  user_id: string;
  vendor_id: string;
  rider_id?: string;
  outlet_id?: string;
  order_number?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  order_status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  payment_method?: string;
  payment_status: 'pending' | 'completed' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  subtotal?: number;
  delivery_fee: number;
  service_fee?: number;
  discount_amount?: number;
  tax_amount?: number;
  order_value?: number;
  delivery_address: string;
  delivery_instructions?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

export interface OrderReview {
  review_id: string;
  order_id: string;
  user_id: string;
  vendor_id: string;
  rider_id?: string;
  rating: number;
  comment?: string;
  review_type: 'vendor' | 'rider' | 'product';
  created_at?: string;
}

// ============================================
// REVIEW TYPES
// ============================================

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
// TRANSACTION TYPES
// ============================================

export interface Transaction {
  id: string;
  transaction_id?: string;
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
  created_at?: string;
}

export interface Refund {
  id: string;
  refund_id?: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requested_at: string;
  processed_at?: string;
  user_id?: string;
}

export interface Wallet {
  wallet_id: string;
  user_id?: string;
  vendor_id?: string;
  rider_id?: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WalletTransaction {
  wallet_transaction_id: string;
  wallet_id: string;
  transaction_type: 'credit' | 'debit' | 'hold' | 'release' | 'cashback' | 'refund';
  amount: number;
  previous_balance: number;
  new_balance: number;
  reference_type: 'order' | 'refund' | 'topup' | 'cashback' | 'referral' | 'admin_adjustment';
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_at?: string;
}

// ============================================
// PROMOTION TYPES
// ============================================

export interface Promotion {
  promotion_id: string;
  promotion_code: string;
  promotion_name: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_delivery' | 'buy_one_get_one';
  discount_value: number;
  maximum_discount?: number;
  minimum_order_amount: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  current_usage_count: number;
  valid_from: string;
  valid_to?: string;
  applicable_to_new_users_only: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
  applicable_vendors?: string[];
  excluded_products?: string[];
  applicable_regions?: string[];
  is_active: boolean;
  terms_and_conditions?: string;
  created_at?: string;
}

// ============================================
// SYSTEM TYPES
// ============================================

export interface SystemSetting {
  setting_id: string;
  key?: string;
  setting_key?: string;
  value: string;
  setting_value?: string;
  setting_type?: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  description?: string;
  is_public?: boolean;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemEvent {
  event_id: string;
  event_type: 'order_placed' | 'payment_completed' | 'delivery_assigned' | 'delivery_completed' | 'user_registered' | 'vendor_approved' | 'system_alert';
  event_category: 'business' | 'technical' | 'security' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  event_data?: any;
  related_entity_type?: 'order' | 'user' | 'vendor' | 'rider';
  related_entity_id?: string;
  source_system: string;
  correlation_id?: string;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  audit_log_id?: string;
  user_id?: string;
  user_type?: 'admin' | 'vendor' | 'rider' | 'user' | 'system';
  action: string;
  action_type?: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: string;
  fields?: string[];
  statusCode?: number;
}

// ============================================
// EXPORTS
// ============================================

export default {
  // All types are exported individually above
};