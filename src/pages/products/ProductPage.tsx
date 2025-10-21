import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Search, RefreshCw } from 'lucide-react';

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
  carbon_footprint_kg?: number;
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

  // Check authentication - checks both localStorage and sessionStorage
useEffect(() => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
  
  if (!token) {
    setAuthError('No authentication token found. Please log in.');
    return;
  }

  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      
      // Check if user has admin role
      if (parsed.role !== 'admin') {
        setAuthError('Access denied. Admin privileges required.');
        return;
      }

      // Verify admin_role is valid (if present)
      const validAdminRoles = ['super_admin', 'finance', 'support', 'operations', 'marketing', 'inventory'];
      if (parsed.admin_role && !validAdminRoles.includes(parsed.admin_role)) {
        setAuthError('Access denied. Invalid admin role.');
        return;
      }

      console.log('✅ Admin access granted:', { role: parsed.role, admin_role: parsed.admin_role });
    } catch (e) {
      console.error('❌ Error parsing user info:', e);
      setAuthError('Invalid user information. Please log in again.');
      return;
    }
  } else {
    setAuthError('No user information found. Please log in.');
    return;
  }

  // If auth checks pass, fetch data
  fetchData();
}, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';
      
      console.log('Fetching data from:', baseURL);
      console.log('Token present:', !!token);

      // Fetch products
      const productsResponse = await fetch(`${baseURL}/v1/admin/products?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!productsResponse.ok) {
        throw new Error(`Products fetch failed: ${productsResponse.status} ${productsResponse.statusText}`);
      }

      const productsData = await productsResponse.json();
      console.log('Products response:', productsData);
      
      const productsArray = Array.isArray(productsData) ? productsData : 
                           productsData.data ? productsData.data : 
                           productsData.products ? productsData.products : [];
      
      setProducts(productsArray);
      console.log('Loaded products:', productsArray.length);

      // Fetch categories
      const categoriesResponse = await fetch(`${baseURL}/v1/admin/categories?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!categoriesResponse.ok) {
        throw new Error(`Categories fetch failed: ${categoriesResponse.status} ${categoriesResponse.statusText}`);
      }

      const categoriesData = await categoriesResponse.json();
      console.log('Categories response:', categoriesData);
      
      const categoriesArray = Array.isArray(categoriesData) ? categoriesData : 
                             categoriesData.data ? categoriesData.data : 
                             categoriesData.categories ? categoriesData.categories : [];
      
      setCategories(categoriesArray);
      console.log('Loaded categories:', categoriesArray.length);

      if (productsArray.length === 0 && categoriesArray.length === 0) {
        setError('No data found. The database may be empty or the API endpoints may not be returning data.');
      }

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
      
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

      const response = await fetch(`${baseURL}/v1/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const result = await response.json();
      const newProduct = result.data || result;
      
      setProducts(prev => [...prev, newProduct]);
      alert('Product created successfully');
      setActiveTab('products');
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (productId: string, data: Partial<Product>) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

      const response = await fetch(`${baseURL}/v1/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      const result = await response.json();
      const updatedProduct = result.data || result;
      
      setProducts(prev => prev.map(p => p.product_id === productId ? updatedProduct : p));
      alert('Product updated successfully');
      setSelectedProduct(null);
      setActiveTab('products');
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

      const response = await fetch(`${baseURL}/v1/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setProducts(prev => prev.filter(p => p.product_id !== productId));
      alert('Product deleted successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (data: Partial<Category>) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://aquagas-backend.onrender.com/api';

      const response = await fetch(`${baseURL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      const result = await response.json();
      const newCategory = result.data || result;
      
      setCategories(prev => [...prev, newCategory]);
      alert('Category created successfully');
      setActiveTab('categories');
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c =>
    c.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">{authError}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeTab === 'products' && (
            <button
              onClick={() => setActiveTab('addProduct')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => setActiveTab('addCategory')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {['products', 'categories'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Warning</p>
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!isLoading && activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const category = categories.find(c => c.category_id === product.category_id);
                  return (
                    <tr key={product.product_id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.product_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">${product.base_price}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{category?.category_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setActiveTab('addProduct');
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.product_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No products found</p>
              <button
                onClick={() => setActiveTab('addProduct')}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Create your first product
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'addProduct' && (
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

      {!isLoading && activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.category_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.category_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{category.description || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{category.sort_order}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setActiveTab('addCategory');
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No categories found</p>
              <button
                onClick={() => setActiveTab('addCategory')}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Create your first category
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'addCategory' && (
        <CategoryForm
          category={selectedCategory}
          onSubmit={handleCreateCategory}
          onCancel={() => {
            setSelectedCategory(null);
            setActiveTab('categories');
          }}
          loading={isLoading}
        />
      )}
    </div>
  );
};

// Product Form Component
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h3 className="text-xl font-semibold mb-6">{product ? 'Edit Product' : 'Add New Product'}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input
            type="text"
            value={formData.product_name || ''}
            onChange={(e) => setFormData({...formData, product_name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
          <input
            type="text"
            value={formData.product_code || ''}
            onChange={(e) => setFormData({...formData, product_code: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={formData.category_id || ''}
            onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Price *</label>
          <input
            type="number"
            step="0.01"
            value={formData.base_price || ''}
            onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value)})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure *</label>
          <select
            value={formData.unit_of_measure || 'pieces'}
            onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value as any})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="pieces">Pieces</option>
            <option value="kg">Kilograms</option>
            <option value="liters">Liters</option>
            <option value="meters">Meters</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
          <input
            type="number"
            value={formData.vendor_id || ''}
            onChange={(e) => setFormData({...formData, vendor_id: parseInt(e.target.value)})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_featured ?? false}
              onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

// Category Form Component
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h3 className="text-xl font-semibold mb-6">{category ? 'Edit Category' : 'Add New Category'}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
          <input
            type="text"
            value={formData.category_name || ''}
            onChange={(e) => setFormData({...formData, category_name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input
            type="number"
            value={formData.sort_order || 0}
            onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Icon URL</label>
          <input
            type="url"
            value={formData.icon_url || ''}
            onChange={(e) => setFormData({...formData, icon_url: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/icon.png"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_active ?? true}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="rounded border-gray-300 text-blue-600"
          />
          <label className="ml-2 text-sm text-gray-700">Active</label>
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </button>
      </div>
    </form>
  );
};

export default ProductManagement;