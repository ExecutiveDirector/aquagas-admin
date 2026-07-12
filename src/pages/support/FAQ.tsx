// components/support/FAQ.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Plus, Pencil, Trash2, Search,
  ThumbsUp, X, Save, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supportService, type FAQ } from './SupportService';

interface FAQManagerProps {
  faqs: FAQ[];
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'delivery_problem', label: 'Delivery Problem' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'product_quality', label: 'Product Quality' },
  { value: 'account_issue', label: 'Account Issue' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'billing_inquiry', label: 'Billing Inquiry' },
  { value: 'other', label: 'Other' },
];

const categoryLabel = (value: string) =>
  CATEGORY_OPTIONS.find(c => c.value === value)?.label || value;

interface DraftFAQ {
  id: number | null;
  question: string;
  answer: string;
  category: string;
}

const emptyDraft: DraftFAQ = { id: null, question: '', answer: '', category: 'other' };

export default function FAQManager({ faqs, onRefresh, searchQuery, onSearchChange }: FAQManagerProps) {
  const [draft, setDraft] = useState<DraftFAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return faqs.filter(faq => {
      const matchesSearch =
        !q || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchQuery, categoryFilter]);

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    setSaving(true);
    try {
      if (draft.id) {
        await supportService.updateFAQ(draft.id, {
          question: draft.question,
          answer: draft.answer,
          category: draft.category,
        });
        toast.success('FAQ updated');
      } else {
        await supportService.createFAQ({
          question: draft.question,
          answer: draft.answer,
          category: draft.category,
        });
        toast.success('FAQ added');
      }
      setDraft(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this FAQ? This can\'t be undone.')) return;
    setDeletingId(id);
    try {
      await supportService.deleteFAQ(id);
      toast.success('FAQ deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Failed to delete FAQ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublished = async (faq: FAQ) => {
    try {
      await supportService.updateFAQ(faq.id, { is_published: !faq.is_published });
      toast.success(faq.is_published ? 'FAQ unpublished' : 'FAQ published');
      onRefresh();
    } catch (error) {
      console.error('Error toggling FAQ visibility:', error);
      toast.error('Failed to update FAQ');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={() => setDraft({ ...emptyDraft })}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {faqs.length === 0 ? 'No FAQs yet' : 'No FAQs match this search'}
            </p>
            {faqs.length === 0 && (
              <button
                onClick={() => setDraft({ ...emptyDraft })}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add your first FAQ
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map(faq => (
              <div key={faq.id} className={`p-4 ${faq.is_published === false ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium">
                        {categoryLabel(faq.category)}
                      </span>
                      {faq.is_published === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <EyeOff size={11} /> Unpublished
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ThumbsUp size={11} /> {faq.helpful_count}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{faq.question}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{faq.answer}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublished(faq)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title={faq.is_published === false ? 'Publish' : 'Unpublish'}
                    >
                      {faq.is_published === false ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => setDraft({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category })}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      disabled={deletingId === faq.id}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDraft(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {draft.id ? 'Edit FAQ' : 'Add FAQ'}
                </h3>
                <button onClick={() => setDraft(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                  <input
                    type="text"
                    value={draft.question}
                    onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="How do I...?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                  <textarea
                    value={draft.answer}
                    onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Explain the answer clearly and concisely..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setDraft(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}