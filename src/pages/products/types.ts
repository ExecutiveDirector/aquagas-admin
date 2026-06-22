// ============================================
// types.ts — Shared type definitions
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
  product_images?: string; // JSON string: ["url1", "url2", ...]
  is_active: boolean;
  is_featured: boolean;
  vendor_id?: number;
  created_at: string;
  updated_at: string;
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

export type ActiveTab = 'products' | 'categories';
export type FormMode = 'create' | 'edit';