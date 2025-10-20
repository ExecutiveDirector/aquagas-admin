// User interface aligned with database schema
export interface User {
  // From users table
  id?: string; // user_id
  user_id?: string;
  account_id?: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  avatar_url?: string;
  preferred_payment?: 'mpesa' | 'card' | 'cash' | 'wallet';
  preferred_language?: 'en' | 'sw' | 'fr' | 'ar';
  loyalty_points?: number;
  total_orders?: number;
  total_spent?: number;
  is_premium?: boolean;
  referral_code?: string;
  referred_by_code?: string;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;

  // From auth_accounts table
  email?: string;
  password?: string; // For creation only, never returned from API
  role: 'user' | 'vendor' | 'rider' | 'admin';
  email_verified?: boolean;
  phone_verified?: boolean;
  is_active?: boolean;
  last_login_at?: string;

  // Wallet information (from user_wallets table)
  wallet?: {
    wallet_id?: string;
    balance: number;
    pending_balance: number;
    total_earned: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  };

  // Subscriptions (from user_subscriptions table)
  subscriptions?: Array<{
    subscription_id?: string;
    plan_id?: string;
    subscription_name: string;
    status: 'active' | 'paused' | 'cancelled' | 'expired';
    start_date: string;
    end_date?: string;
    next_delivery_date?: string;
    last_order_date?: string;
    base_amount: number;
    total_amount: number;
    delivery_city?: string;
    delivery_county?: string;
    created_at?: string;
  }>;

  // Backward compatibility (deprecated - use first_name and last_name instead)
  fullName?: string;
  walletBalance?: number; // deprecated - use wallet.balance
  lastLogin?: string; // deprecated - use last_login_at
}

// Helper function to get full name
export const getFullName = (user: User): string => {
  if (user.fullName) return user.fullName;
  const first = user.first_name || '';
  const last = user.last_name || '';
  return `${first} ${last}`.trim() || 'N/A';
};

// Helper function to get initials
export const getInitials = (user: User): string => {
  if (user.fullName) {
    const parts = user.fullName.split(' ');
    return parts.map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U';
  }
  const first = user.first_name?.charAt(0)?.toUpperCase() || '';
  const last = user.last_name?.charAt(0)?.toUpperCase() || '';
  return (first + last) || 'U';
};

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
  success?: boolean;
  status?: number;
}

// Vendor interface
export interface Vendor {
  id: string;
  vendor_id?: string;
  account_id?: string;
  business_name: string;
  business_registration_number?: string;
  business_type?: string;
  email?: string;
  phone_number?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  is_verified?: boolean;
  rating?: number;
  total_orders?: number;
  created_at?: string;
  updated_at?: string;
}

// Rider interface
export interface Rider {
  id: string;
  rider_id?: string;
  account_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  vehicle_type?: string;
  vehicle_registration?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'on_delivery';
  is_available?: boolean;
  current_latitude?: number;
  current_longitude?: number;
  rating?: number;
  total_deliveries?: number;
  created_at?: string;
  updated_at?: string;
}

// Order interface
export interface Order {
  id: string;
  order_id?: string;
  user_id?: string;
  vendor_id?: string;
  rider_id?: string;
  customerName?: string;
  vendorName?: string;
  riderName?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';
  totalAmount: number;
  subtotal?: number;
  delivery_fee?: number;
  tax?: number;
  discount?: number;
  payment_method?: string;
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
  created_at?: string;
  updated_at?: string;
}

// Dashboard stats interface
export interface DashboardStats {
  users: number;
  vendors: number;
  riders: number;
  orders: number;
  todayRevenue: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  activeUsers?: number;
  sparklines?: {
    users?: number[];
    vendors?: number[];
    riders?: number[];
    orders?: number[];
    todayRevenue?: number[];
  };
}

// Wallet transaction interface
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
  created_at: string;
  metadata?: any;
}

// Promotion usage interface
export interface PromotionUsage {
  usage_id: string;
  user_id: string;
  promotion_id: string;
  order_id?: string;
  usage_count: number;
  discount_amount: number;
  used_at: string;
}