import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Search, RefreshCw, Package, FolderTree, X, Save } from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================
interface Product {
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
  product_images?: string;
  is_active: boolean;
  is_featured: boolean;
  vendor_id?: number;
  created_at: string;
  updated_at: string;
}

interface Category {
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

// ============================================
// API SERVICE
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const api = {
  // Products
  getProducts: async (page = 1, limit = 100) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/products?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
    const data = await response.json();
    console.log('📦 Raw products response:', data);
    // Backend returns { products: [...] }
    return data.products || data.data || (Array.isArray(data) ? data : []);
  },

  createProduct: async (productData: Partial<Product>) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }
    const result = await response.json();
    return result.data || result;
  },

  updateProduct: async (productId: string, productData: Partial<Product>) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }
    const result = await response.json();
    return result.data || result;
  },

  deleteProduct: async (productId: string) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return response.json();
  },

  // Categories
  getCategories: async (page = 1, limit = 100) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/categories?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch categories: ${response.statusText}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || data.categories || [];
  },

  createCategory: async (categoryData: Partial<Category>) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }
    const result = await response.json();
    return result.data || result;
  },

  updateCategory: async (categoryId: string, categoryData: Partial<Category>) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/categories/${categoryId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update category');
    }
    const result = await response.json();
    return result.data || result;
  },

  deleteCategory: async (categoryId: string) => {
    const response = await fetch(`${API_BASE_URL}/v1/admin/categories/${categoryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete category');
    return response.json();
  }
};

// ============================================
// AUTH UTILITIES
// ============================================
const checkAdminAccess = (): { hasAccess: boolean; role: string; adminRole: string | null; error?: string } => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
  
  if (!token) {
    return { hasAccess: false, role: '', adminRole: null, error: 'No authentication token found' };
  }

  if (!userInfo) {
    return { hasAccess: false, role: '', adminRole: null, error: 'No user information found' };
  }

  try {
    const parsed = JSON.parse(userInfo);
    
    // Check if user has admin role
    if (parsed.role !== 'admin') {
      return { hasAccess: false, role: parsed.role, adminRole: null, error: 'Access denied. Admin privileges required.' };
    }

    // All admin roles have access - no restrictions
    console.log('✅ Admin access granted:', { role: parsed.role, admin_role: parsed.admin_role });
    return { hasAccess: true, role: parsed.role, adminRole: parsed.admin_role || 'admin' };
  } catch (e) {
    console.error('❌ Error parsing user info:', e);
    return { hasAccess: false, role: '', adminRole: null, error: 'Invalid user information' };
  }
};

// ============================================
// PRODUCTS TABLE COMPONENT
// ============================================
const ProductsTable: React.FC<{
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  searchQuery: string;
}> = ({ products, categories, onEdit, onDelete, searchQuery }) => {
  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No products found</p>
        {searchQuery && <p className="text-sm text-gray-400">Try adjusting your search</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const category = categories.find(c => c.category_id === product.category_id);
              return (
                <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                        <div className="text-xs text-gray-500">{product.size_specification}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.product_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.brand || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                      {category?.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    KES {product.base_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs inline-flex items-center w-fit ${
                        product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.is_active ? '● Active' : '● Inactive'}
                      </span>
                      {product.is_featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs inline-flex items-center w-fit">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Edit product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(product.product_id)}
                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// CATEGORIES TABLE COMPONENT
// ============================================
const CategoriesTable: React.FC<{
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  searchQuery: string;
}> = ({ categories, onEdit, onDelete, searchQuery }) => {
  const filteredCategories = categories.filter(c =>
    c.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredCategories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No categories found</p>
        {searchQuery && <p className="text-sm text-gray-400">Try adjusting your search</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sort Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <tr key={category.category_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FolderTree className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{category.category_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{category.description || 'No description'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{category.sort_order}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${
                    category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {category.is_active ? '● Active' : '● Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(category)}
                      className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                      title="Edit category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(category.category_id.toString())}
                      className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// PRODUCT FORM COMPONENT
// ============================================
const ProductForm: React.FC<{
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}> = ({ product, categories, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      is_active: true,
      is_featured: false,
      unit_of_measure: 'pieces'
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {product ? 'Edit Product' : 'Add New Product'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.product_name || ''}
              onChange={(e) => setFormData({...formData, product_name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 13kg Gas Cylinder"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.product_code || ''}
              onChange={(e) => setFormData({...formData, product_code: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., GAS-13KG"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Total, Shell"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Price (KES) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.base_price || ''}
              onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 2500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit of Measure <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit_of_measure || 'pieces'}
              onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value as any})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pieces">Pieces</option>
              <option value="kg">Kilograms</option>
              <option value="liters">Liters</option>
              <option value="meters">Meters</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size Specification
            </label>
            <input
              type="text"
              value={formData.size_specification || ''}
              onChange={(e) => setFormData({...formData, size_specification: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 13kg, 6kg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.weight_kg || ''}
              onChange={(e) => setFormData({...formData, weight_kg: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 13"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter product description..."
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured ?? false}
                onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Featured</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================
// CATEGORY FORM COMPONENT
// ============================================
const CategoryForm: React.FC<{
  category?: Category | null;
  onSubmit: (data: Partial<Category>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}> = ({ category, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState<Partial<Category>>(
    category || {
      is_active: true,
      sort_order: 0
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {category ? 'Edit Category' : 'Add New Category'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.category_name || ''}
            onChange={(e) => setFormData({...formData, category_name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Gas Cylinders"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Enter category description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order || 0}
              onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon URL
            </label>
            <input
              type="url"
              value={formData.icon_url || ''}
              onChange={(e) => setFormData({...formData, icon_url: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/icon.png"
            />
          </div>
        </div>

        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={formData.is_active ?? true}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">Active</label>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================
// MAIN PRODUCT MANAGEMENT COMPONENT
// ============================================
const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'addProduct' | 'addCategory'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check authentication and fetch data
  useEffect(() => {
    const authCheck = checkAdminAccess();
    
    if (!authCheck.hasAccess) {
      setAuthError(authCheck.error || 'Access denied');
      return;
    }

    console.log('✅ Authentication passed. Admin role:', authCheck.adminRole);
    fetchData();
  }, []);

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching data from database...');
      
      // Fetch products and categories in parallel
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      
      console.log('✅ Data loaded:', {
        products: productsData.length,
        categories: categoriesData.length
      });

      if (productsData.length === 0 && categoriesData.length === 0) {
        setError('No data found. The database may be empty. Start by adding categories and products.');
      }
    } catch (err: any) {
      console.error('❌ Fetch error:', err);
      setError(err.message || 'Failed to fetch data from database');
      
      if (err.message.includes('401') || err.message.includes('403')) {
        setAuthError('Authentication failed. Please log in again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (data: Partial<Product>) => {
    try {
      setIsLoading(true);
      console.log('📦 Creating product:', data);
      
      const newProduct = await api.createProduct(data);
      
      setProducts(prev => [...prev, newProduct]);
      setSuccessMessage('Product created successfully!');
      setActiveTab('products');
      setSelectedProduct(null);
      
      console.log('✅ Product created:', newProduct.product_id);
    } catch (err: any) {
      console.error('❌ Create product error:', err);
      setError(err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (productId: string, data: Partial<Product>) => {
    try {
      setIsLoading(true);
      console.log('📝 Updating product:', productId, data);
      
      const updatedProduct = await api.updateProduct(productId, data);
      
      setProducts(prev => prev.map(p => p.product_id === productId ? updatedProduct : p));
      setSuccessMessage('Product updated successfully!');
      setSelectedProduct(null);
      setActiveTab('products');
      
      console.log('✅ Product updated:', productId);
    } catch (err: any) {
      console.error('❌ Update product error:', err);
      setError(err.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🗑️ Deleting product:', productId);
      
      await api.deleteProduct(productId);
      
      setProducts(prev => prev.filter(p => p.product_id !== productId));
      setSuccessMessage('Product deleted successfully!');
      
      console.log('✅ Product deleted:', productId);
    } catch (err: any) {
      console.error('❌ Delete product error:', err);
      setError(err.message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (data: Partial<Category>) => {
    try {
      setIsLoading(true);
      console.log('📁 Creating category:', data);
      
      const newCategory = await api.createCategory(data);
      
      setCategories(prev => [...prev, newCategory]);
      setSuccessMessage('Category created successfully!');
      setActiveTab('categories');
      setSelectedCategory(null);
      
      console.log('✅ Category created:', newCategory.category_id);
    } catch (err: any) {
      console.error('❌ Create category error:', err);
      setError(err.message || 'Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string, data: Partial<Category>) => {
    try {
      setIsLoading(true);
      console.log('📝 Updating category:', categoryId, data);
      
      const updatedCategory = await api.updateCategory(categoryId, data);
      
      setCategories(prev => prev.map(c => c.category_id.toString() === categoryId ? updatedCategory : c));
      setSuccessMessage('Category updated successfully!');
      setSelectedCategory(null);
      setActiveTab('categories');
      
      console.log('✅ Category updated:', categoryId);
    } catch (err: any) {
      console.error('❌ Update category error:', err);
      setError(err.message || 'Failed to update category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🗑️ Deleting category:', categoryId);
      
      await api.deleteCategory(categoryId);
      
      setCategories(prev => prev.filter(c => c.category_id.toString() !== categoryId));
      setSuccessMessage('Category deleted successfully!');
      
      console.log('✅ Category deleted:', categoryId);
    } catch (err: any) {
      console.error('❌ Delete category error:', err);
      setError(err.message || 'Failed to delete category');
    } finally {
      setIsLoading(false);
    }
  };

  // Auth error screen
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-600">Manage your products and categories from the database</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 font-medium">Warning</p>
                <p className="text-yellow-700 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        {(activeTab === 'products' || activeTab === 'categories') && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                title="Refresh data from database"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {activeTab === 'products' && (
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setActiveTab('addProduct');
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </button>
              )}
              {activeTab === 'categories' && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setActiveTab('addCategory');
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        {(activeTab === 'products' || activeTab === 'categories') && (
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products ({products.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                Categories ({categories.length})
              </div>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (activeTab === 'products' || activeTab === 'categories') && (
          <div className="flex items-center justify-center py-16 bg-white rounded-lg shadow">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data from database...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && activeTab === 'products' && (
          <ProductsTable
            products={products}
            categories={categories}
            onEdit={(product) => {
              setSelectedProduct(product);
              setActiveTab('addProduct');
            }}
            onDelete={handleDeleteProduct}
            searchQuery={searchQuery}
          />
        )}

        {!isLoading && activeTab === 'categories' && (
          <CategoriesTable
            categories={categories}
            onEdit={(category) => {
              setSelectedCategory(category);
              setActiveTab('addCategory');
            }}
            onDelete={handleDeleteCategory}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'addProduct' && (
          <ProductForm
            product={selectedProduct}
            categories={categories}
            onSubmit={async (data) => {
              if (selectedProduct) {
                await handleUpdateProduct(selectedProduct.product_id, data);
              } else {
                await handleCreateProduct(data);
              }
            }}
            onCancel={() => {
              setSelectedProduct(null);
              setActiveTab('products');
            }}
            loading={isLoading}
          />
        )}

        {activeTab === 'addCategory' && (
          <CategoryForm
            category={selectedCategory}
            onSubmit={async (data) => {
              if (selectedCategory) {
                await handleUpdateCategory(selectedCategory.category_id.toString(), data);
              } else {
                await handleCreateCategory(data);
              }
            }}
            onCancel={() => {
              setSelectedCategory(null);
              setActiveTab('categories');
            }}
            loading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ProductManagement;