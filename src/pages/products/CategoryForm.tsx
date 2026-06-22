// ============================================
// CategoryForm.tsx — Add / Edit category
// ============================================

import React, { useState } from 'react';
import { X, Save, FolderTree } from 'lucide-react';
import type { Category } from './types';

interface CategoryFormProps {
  category?: Category | null;
  categories: Category[]; // for parent picker
  onSubmit: (data: Partial<Category>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category, categories, onSubmit, onCancel, loading,
}) => {
  const [formData, setFormData] = useState<Partial<Category>>(
    category ?? { is_active: true, sort_order: 0 },
  );

  const set = (patch: Partial<Category>) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Exclude the category being edited from the parent picker to avoid circular refs
  const parentOptions = categories.filter(
    (c) => c.is_active && c.category_id !== category?.category_id,
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {category ? 'Edit Category' : 'Add New Category'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {category
              ? `Editing: ${category.category_name}`
              : 'Create a new product category'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">

        {/* ── Section: Basic Info ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Basic Info
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={formData.category_name || ''}
                  onChange={(e) => set({ category_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Gas Cylinders, Water Dispensers"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => set({ description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Brief description of this category…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Parent Category
              </label>
              <select
                value={formData.parent_category_id || ''}
                onChange={(e) =>
                  set({
                    parent_category_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">None (top-level category)</option>
                {parentOptions.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to create a top-level category.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formData.sort_order ?? 0}
                onChange={(e) => set({ sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Lower numbers appear first in listings.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Icon URL
                <span className="ml-2 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.icon_url || ''}
                onChange={(e) => set({ icon_url: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/icon.png"
              />
              {/* Live icon preview */}
              {formData.icon_url && (
                <div className="mt-2 flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-gray-50 w-fit">
                  <img
                    src={formData.icon_url}
                    alt="Icon preview"
                    className="w-10 h-10 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-gray-500">Icon preview</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Section: Visibility ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Visibility
          </h4>
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={!!formData.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Active</span>
              <p className="text-xs text-gray-400">
                Active categories are visible to customers and available for product assignment.
              </p>
            </div>
          </label>
        </section>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving…' : category ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;