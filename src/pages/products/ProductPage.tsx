import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  isAdmin,
} from '../../services/adminService';
//import type { ApiResponse } from '../../services/adminService';

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

const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'addProduct' | 'addCategory'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        listProducts(),
        listCategories()
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      toast.error('Failed to load products and categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (data: Partial<Product>) => {
    try {
      setIsLoading(true);
      const res = await createProduct(data);
      setProducts(prev => [...prev, res.data!]);
      toast.success('Product created successfully');
      setActiveTab('products');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (productId: string, data: Partial<Product>) => {
    try {
      setIsLoading(true);
      const res = await updateProduct(productId, data);
      setProducts(prev => prev.map(p => p.product_id === productId ? res.data! : p));
      toast.success('Product updated successfully');
      setSelectedProduct(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      setIsLoading(true);
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.product_id !== productId));
      toast.success('Product deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (data: Partial<Category>) => {
    try {
      setIsLoading(true);
      const res = await createCategory(data);
      setCategories(prev => [...prev, res.data!]);
      toast.success('Category created successfully');
      setActiveTab('categories');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId: string, data: Partial<Category>) => {
    try {
      setIsLoading(true);
      const res = await updateCategory(categoryId, data);
      setCategories(prev => prev.map(c => c.category_id.toString() === categoryId ? res.data! : c));
      toast.success('Category updated successfully');
      setSelectedCategory(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      setIsLoading(true);
      await deleteCategory(categoryId);
      setCategories(prev => prev.filter(c => c.category_id.toString() !== categoryId));
      toast.success('Category deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c =>
    c.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          {activeTab === 'products' && (
            <button
              onClick={() => setActiveTab('addProduct')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => setActiveTab('addCategory')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { id: 'products', label: 'Products' },
          { id: 'categories', label: 'Categories' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            disabled={isLoading}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'products' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Featured</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {product.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {product.product_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {product.base_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.is_active ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {product.is_featured ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setActiveTab('addProduct'); // Switch to form tab for editing
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
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No products found
                </div>
              )}
            </div>
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

          {activeTab === 'categories' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Parent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sort Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCategories.map((category) => (
                    <tr key={category.category_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {category.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category.parent_category_id || 'Root'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {category.is_active ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setSelectedCategory(category);
                            setActiveTab('addCategory');
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.category_id.toString())}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No categories found
                </div>
              )}
            </div>
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
        </>
      )}
    </div>
  );
};

// Product Form Component
interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, categories, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState<Partial<Product>>(product || {});

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handled in parent
    }
  };

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        {product ? 'Edit Product' : 'Add New Product'}
      </h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product Name *
        </label>
        <input
          type="text"
          value={formData.product_name || ''}
          onChange={(e) => handleChange('product_name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Product Code *
        </label>
        <input
          type="text"
          value={formData.product_code || ''}
          onChange={(e) => handleChange('product_code', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category *
        </label>
        <select
          value={formData.category_id || ''}
          onChange={(e) => handleChange('category_id', parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={loading}
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Base Price *
        </label>
        <input
          type="number"
          value={formData.base_price || ''}
          onChange={(e) => handleChange('base_price', parseFloat(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          disabled={loading}
        />
      </div>

      {/* Add more fields as needed */}

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            product ? 'Update Product' : 'Create Product'
          )}
        </button>
      </div>
    </form>
  );
};

// Category Form Component
interface CategoryFormProps {
  category?: Category | null;
  onSubmit: (data: Partial<Category>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState<Partial<Category>>(category || {});

  const handleChange = (field: keyof Category, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handled in parent
    }
  };

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        {category ? 'Edit Category' : 'Add New Category'}
      </h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Category Name *
        </label>
        <input
          type="text"
          value={formData.category_name || ''}
          onChange={(e) => handleChange('category_name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Icon URL
        </label>
        <input
          type="url"
          value={formData.icon_url || ''}
          onChange={(e) => handleChange('icon_url', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sort Order
        </label>
        <input
          type="number"
          value={formData.sort_order || 0}
          onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.is_active ?? true}
          onChange={(e) => handleChange('is_active', e.target.checked)}
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
          disabled={loading}
        />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Active
        </label>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            category ? 'Update Category' : 'Create Category'
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductPage;