// ============================================
// ProductForm.tsx — Add / Edit product with image URL manager
// ============================================

import React, { useState } from 'react';
import {
  X, Save, ImagePlus, Link, CheckCircle,
  AlertCircle, AlertTriangle,
} from 'lucide-react';
import type { Product, Category } from './types';

// ── Helpers ───────────────────────────────────────────────────
const parseImages = (raw?: string): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
};

const isValidUrl = (val: string): boolean => {
  if (!val) return true;
  try { new URL(val); return true; } catch { return false; }
};

// ── ImageUrlInput ─────────────────────────────────────────────
interface ImageUrlInputProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

const ImageUrlInput: React.FC<ImageUrlInputProps> = ({ urls, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [previewStatus, setPreviewStatus] = useState<Record<number, 'ok' | 'error'>>({});

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !isValidUrl(trimmed) || urls.includes(trimmed)) return;
    onChange([...urls, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  const handleRemove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
    setPreviewStatus((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste image URL and press Enter or click Add"
            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              inputValue && !isValidUrl(inputValue)
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim() || !isValidUrl(inputValue)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <ImagePlus className="w-4 h-4" />
          Add Image
        </button>
      </div>

      {/* Validation hint */}
      {inputValue && !isValidUrl(inputValue) && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Enter a valid URL starting with https://
        </p>
      )}

      {/* Preview list */}
      {urls.length > 0 ? (
        <div className="space-y-2">
          {urls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-gray-50 group"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-14 h-14 rounded-md border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                {previewStatus[index] === 'error' ? (
                  <div className="flex flex-col items-center gap-1 px-1">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-[9px] text-red-400 text-center leading-tight">Load failed</span>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onLoad={() => setPreviewStatus((p) => ({ ...p, [index]: 'ok' }))}
                    onError={() => setPreviewStatus((p) => ({ ...p, [index]: 'error' }))}
                  />
                )}
              </div>

              {/* URL + status */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{url}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {previewStatus[index] === 'ok' && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600">
                      <CheckCircle className="w-3 h-3" /> Loaded
                    </span>
                  )}
                  {previewStatus[index] === 'error' && (
                    <span className="flex items-center gap-1 text-[10px] text-red-500">
                      <AlertCircle className="w-3 h-3" /> Cannot load
                    </span>
                  )}
                  {!previewStatus[index] && (
                    <span className="text-[10px] text-gray-400">Loading preview…</span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    · Image {index + 1}
                    {index === 0 && (
                      <span className="ml-1 text-blue-500 font-semibold">(primary)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center">
          <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
          <p className="text-xs text-gray-400">No images yet. Paste a URL above to add product images.</p>
          <p className="text-[10px] text-gray-300 mt-0.5">The first URL becomes the primary image shown to customers.</p>
        </div>
      )}
    </div>
  );
};

// ── ProductForm ───────────────────────────────────────────────
interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product, categories, onSubmit, onCancel, loading,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product ?? { is_active: true, is_featured: false, unit_of_measure: 'pieces' },
  );
  const [imageUrls, setImageUrls] = useState<string[]>(parseImages(product?.product_images));

  const set = (patch: Partial<Product>) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleImageUrlsChange = (urls: string[]) => {
    setImageUrls(urls);
    set({ product_images: urls.length > 0 ? JSON.stringify(urls) : undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ ...formData, product_images: imageUrls.length > 0 ? JSON.stringify(imageUrls) : undefined });
  };

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {product ? `Editing: ${product.product_name}` : 'Fill in the details below to add a product to the catalogue'}
          </p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">

        {/* ── Section: Basic Info ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Basic Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name || ''}
                onChange={(e) => set({ product_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 13kg Gas Cylinder"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_code || ''}
                onChange={(e) => set({ product_code: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., GAS-13KG"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => set({ brand: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., K-Gas, ProGas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => set({ category_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Select a category</option>
                {activeCategories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unit_of_measure || 'pieces'}
                onChange={(e) => set({ unit_of_measure: e.target.value as Product['unit_of_measure'] })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="pieces">Pieces</option>
                <option value="kg">Kg</option>
                <option value="liters">Liters</option>
                <option value="meters">Meters</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size / Specification</label>
              <input
                type="text"
                value={formData.size_specification || ''}
                onChange={(e) => set({ size_specification: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 13kg, 6L, 500ml"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.weight_kg || ''}
                onChange={(e) => set({ weight_kg: parseFloat(e.target.value) || undefined })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => set({ description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Describe the product for customers…"
              />
            </div>
          </div>
        </section>

        {/* ── Section: Pricing ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Pricing (KES)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: 'Base Price', key: 'base_price', required: true },
              { label: 'Min Price', key: 'min_price', required: false },
              { label: 'Max Price', key: 'max_price', required: false },
            ].map(({ label, key, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">KES</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData as Record<string, unknown>)[key] as number || ''}
                    onChange={(e) =>
                      set({ [key]: parseFloat(e.target.value) || undefined } as Partial<Product>)
                    }
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required={required}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Images ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Product Images</h4>
          <ImageUrlInput urls={imageUrls} onChange={handleImageUrlsChange} />
        </section>

        {/* ── Section: Status ── */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Visibility</h4>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!formData.is_active}
                onChange={(e) => set({ is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Active</span>
                <p className="text-xs text-gray-400">Visible and orderable by customers</p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!formData.is_featured}
                onChange={(e) => set({ is_featured: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Featured</span>
                <p className="text-xs text-gray-400">Shown in promoted sections on the homepage</p>
              </div>
            </label>
          </div>
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
            {loading ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;