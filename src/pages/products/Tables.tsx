// ============================================
// Tables.tsx — ProductsTable + CategoriesTable
// ============================================

import React from 'react';
import { Edit, Trash2, Package, FolderTree } from 'lucide-react';
import type { Product, Category } from './types';

// ── Shared empty state ────────────────────────────────────────
const EmptyState: React.FC<{
  icon: React.ReactNode;
  message: string;
  hint?: string;
}> = ({ icon, message, hint }) => (
  <div className="text-center py-16 bg-white rounded-xl shadow">
    <div className="flex justify-center mb-4 text-gray-300">{icon}</div>
    <p className="text-gray-500 font-medium">{message}</p>
    {hint && <p className="text-sm text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ── Primary image helper ──────────────────────────────────────
const getPrimaryImage = (raw?: string): string | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return raw.startsWith('http') ? raw : null;
  }
};

// ============================================
// PRODUCTS TABLE
// ============================================
interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  searchQuery: string;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products, categories, onEdit, onDelete, searchQuery,
}) => {
  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-16 h-16" />}
        message="No products found"
        hint={searchQuery ? 'Try adjusting your search term' : 'Add your first product using the button above'}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product', 'Code', 'Brand', 'Category', 'Price (KES)', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((product) => {
              const category = categories.find((c) => c.category_id === product.category_id);
              const primaryImage = getPrimaryImage(product.product_images);
              const imageCount = (() => {
                if (!product.product_images) return 0;
                try {
                  const p = JSON.parse(product.product_images);
                  return Array.isArray(p) ? p.length : 1;
                } catch { return 1; }
              })();

              return (
                <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                  {/* Product */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">
                          {product.product_name}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          {product.size_specification && (
                            <span>{product.size_specification}</span>
                          )}
                          {imageCount > 0 && (
                            <span className="text-blue-400">
                              · {imageCount} image{imageCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Code */}
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {product.product_code}
                    </span>
                  </td>

                  {/* Brand */}
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {product.brand || <span className="text-gray-300">—</span>}
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {category?.category_name || 'Uncategorized'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {product.base_price.toLocaleString()}
                    </span>
                    {product.min_price && product.max_price && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {product.min_price.toLocaleString()} – {product.max_price.toLocaleString()}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {product.is_featured && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-medium w-fit">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(product.product_id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      {/* Footer count */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">
          Showing {filtered.length} of {products.length} product{products.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>
    </div>
  );
};

// ============================================
// CATEGORIES TABLE
// ============================================
interface CategoriesTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  searchQuery: string;
}

export const CategoriesTable: React.FC<CategoriesTableProps> = ({
  categories, onEdit, onDelete, searchQuery,
}) => {
  const filtered = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.category_name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<FolderTree className="w-16 h-16" />}
        message="No categories found"
        hint={searchQuery ? 'Try adjusting your search term' : 'Add your first category using the button above'}
      />
    );
  }

  // Build a quick lookup for parent names
  const parentMap = Object.fromEntries(
    categories.map((c) => [c.category_id, c.category_name]),
  );

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Category', 'Parent', 'Description', 'Order', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((category) => (
              <tr key={category.category_id} className="hover:bg-gray-50 transition-colors">
                {/* Category */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-blue-100 bg-blue-50 overflow-hidden flex items-center justify-center">
                      {category.icon_url ? (
                        <img
                          src={category.icon_url}
                          alt={category.category_name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <FolderTree className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {category.category_name}
                    </span>
                  </div>
                </td>

                {/* Parent */}
                <td className="px-5 py-4 text-sm text-gray-500">
                  {category.parent_category_id ? (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {parentMap[category.parent_category_id] || `ID ${category.parent_category_id}`}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">Top-level</span>
                  )}
                </td>

                {/* Description */}
                <td className="px-5 py-4 text-sm text-gray-500 max-w-[220px]">
                  <span className="line-clamp-2">{category.description || <span className="text-gray-300">—</span>}</span>
                </td>

                {/* Sort order */}
                <td className="px-5 py-4">
                  <span className="text-sm font-mono text-gray-500">{category.sort_order}</span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      category.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${category.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(category)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(category.category_id.toString())}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      {/* Footer count */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">
          Showing {filtered.length} of {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>
    </div>
  );
};