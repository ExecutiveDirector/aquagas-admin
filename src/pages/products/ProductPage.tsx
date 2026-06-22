// ============================================
// ProductsPage.tsx — Main orchestrator page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, Package, FolderTree,
  AlertCircle, CheckCircle, X, Loader2,
} from 'lucide-react';

import type { Product, Category, ActiveTab } from './types';
import { productsApi, categoriesApi, checkAdminAccess } from './api';
import { ProductsTable, CategoriesTable } from './Tables';
import ProductForm from './ProductForm';
import CategoryForm from './CategoryForm';

// ── Toast notification ────────────────────────────────────────
interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastId = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({
  toasts, onDismiss,
}) => (
  <div className="fixed top-4 right-4 z-50 space-y-2 min-w-[300px]">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in slide-in-from-right ${
          t.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}
      >
        {t.type === 'success'
          ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
          : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />}
        <span className="flex-1">{t.message}</span>
        <button
          onClick={() => onDismiss(t.id)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

// ── Delete confirm modal ──────────────────────────────────────
const DeleteModal: React.FC<{
  target: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ target, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">Confirm Delete</h3>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to delete <strong>{target}</strong>? This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, sub, icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────
type ViewMode = 'list' | 'form';

const ProductsPage: React.FC = () => {
  // ── Auth ──
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Data ──
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Delete modal ──
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'product' | 'category';
    id: string;
    name: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [p, c] = await Promise.all([productsApi.getAll(), categoriesApi.getAll()]);
      setProducts(p);
      setCategories(c);
    } catch (err) {
      toast('error', 'Failed to load data. Please refresh.');
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    const auth = checkAdminAccess();
    if (!auth.hasAccess) {
      setAuthError(auth.error || 'Access denied');
      return;
    }
    loadData();
  }, [loadData]);

  // ── Close form helper ──
  const closeForm = () => {
    setViewMode('list');
    setEditingProduct(null);
    setEditingCategory(null);
  };

  // ── Product handlers ──
  const handleOpenProductForm = (product?: Product) => {
    setEditingProduct(product || null);
    setActiveTab('products');
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductSubmit = async (data: Partial<Product>) => {
    setFormLoading(true);
    try {
      if (editingProduct) {
        const updated = await productsApi.update(editingProduct.product_id, data);
        setProducts((prev) =>
          prev.map((p) => (p.product_id === updated.product_id ? updated : p)),
        );
        toast('success', `"${updated.product_name}" updated successfully`);
      } else {
        const created = await productsApi.create(data);
        setProducts((prev) => [created, ...prev]);
        toast('success', `"${created.product_name}" added to catalogue`);
      }
      closeForm();
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const product = products.find((p) => p.product_id === id);
    setDeleteTarget({ type: 'product', id, name: product?.product_name || id });
  };

  // ── Category handlers ──
  const handleOpenCategoryForm = (category?: Category) => {
    setEditingCategory(category || null);
    setActiveTab('categories');
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategorySubmit = async (data: Partial<Category>) => {
    setFormLoading(true);
    try {
      if (editingCategory) {
        const updated = await categoriesApi.update(
          editingCategory.category_id.toString(), data,
        );
        setCategories((prev) =>
          prev.map((c) => (c.category_id === updated.category_id ? updated : c)),
        );
        toast('success', `"${updated.category_name}" updated successfully`);
      } else {
        const created = await categoriesApi.create(data);
        setCategories((prev) => [created, ...prev]);
        toast('success', `"${created.category_name}" created`);
      }
      closeForm();
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.category_id.toString() === id);
    setDeleteTarget({ type: 'category', id, name: cat?.category_name || id });
  };

  // ── Confirm delete ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'product') {
        await productsApi.delete(deleteTarget.id);
        setProducts((prev) => prev.filter((p) => p.product_id !== deleteTarget.id));
        toast('success', `"${deleteTarget.name}" deleted`);
      } else {
        await categoriesApi.delete(deleteTarget.id);
        setCategories((prev) =>
          prev.filter((c) => c.category_id.toString() !== deleteTarget.id),
        );
        toast('success', `"${deleteTarget.name}" deleted`);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Derived stats ──
  const activeProducts = products.filter((p) => p.is_active).length;
  const featuredProducts = products.filter((p) => p.is_featured).length;
  const activeCategories = categories.filter((c) => c.is_active).length;

  // ── Auth error screen ──
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Access Denied</h2>
          <p className="text-sm text-gray-500">{authError}</p>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading catalogue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage products and categories for the AquaGas platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loadingData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
              {viewMode === 'list' && (
                <button
                  onClick={() =>
                    activeTab === 'products'
                      ? handleOpenProductForm()
                      : handleOpenCategoryForm()
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {activeTab === 'products' ? 'Add Product' : 'Add Category'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stats row ── */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Products"
              value={products.length}
              sub={`${activeProducts} active`}
              icon={<Package className="w-5 h-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <StatCard
              label="Featured"
              value={featuredProducts}
              sub="on homepage"
              icon={<span className="text-lg">⭐</span>}
              color="bg-amber-50"
            />
            <StatCard
              label="Categories"
              value={categories.length}
              sub={`${activeCategories} active`}
              icon={<FolderTree className="w-5 h-5 text-indigo-600" />}
              color="bg-indigo-50"
            />
            <StatCard
              label="Inactive"
              value={products.length - activeProducts}
              sub="hidden from customers"
              icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
              color="bg-orange-50"
            />
          </div>
        )}

        {/* ── Tab bar (only in list mode) ── */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {([
              { key: 'products', label: 'Products', icon: Package, count: products.length },
              { key: 'categories', label: 'Categories', icon: FolderTree, count: categories.length },
            ] as const).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Search bar (list mode only) ── */}
        {viewMode === 'list' && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'products'
                  ? 'Search by name, code or brand…'
                  : 'Search categories…'
              }
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ── Main content area ── */}
        {viewMode === 'form' ? (
          <div className="max-w-3xl mx-auto">
            {activeTab === 'products' ? (
              <ProductForm
                product={editingProduct}
                categories={categories}
                onSubmit={handleProductSubmit}
                onCancel={closeForm}
                loading={formLoading}
              />
            ) : (
              <CategoryForm
                category={editingCategory}
                categories={categories}
                onSubmit={handleCategorySubmit}
                onCancel={closeForm}
                loading={formLoading}
              />
            )}
          </div>
        ) : activeTab === 'products' ? (
          <ProductsTable
            products={products}
            categories={categories}
            onEdit={handleOpenProductForm}
            onDelete={handleDeleteProduct}
            searchQuery={searchQuery}
          />
        ) : (
          <CategoriesTable
            categories={categories}
            onEdit={handleOpenCategoryForm}
            onDelete={handleDeleteCategory}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
};

export default ProductsPage;