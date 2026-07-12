// components/support/KnowledgeBase.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Pencil, Trash2, Search,
  ThumbsUp, Eye as EyeIcon, X, Save, EyeOff, Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supportService, type KnowledgeBaseItem } from './SupportService';

interface KnowledgeBaseManagerProps {
  articles: KnowledgeBaseItem[];
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface DraftArticle {
  id: number | null;
  title: string;
  content: string;
  category: string;
  tags: string;
}

const emptyDraft: DraftArticle = { id: null, title: '', content: '', category: 'general', tags: '' };

export default function KnowledgeBaseManager({
  articles,
  onRefresh,
  searchQuery,
  onSearchChange,
}: KnowledgeBaseManagerProps) {
  const [draft, setDraft] = useState<DraftArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  const categories = useMemo(() => {
    const set = new Set(articles.map(a => a.category));
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return articles.filter(article => {
      const matchesSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q) ||
        article.tags.some(t => t.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, categoryFilter]);

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const tags = draft.tags.split(',').map(t => t.trim()).filter(Boolean);

    setSaving(true);
    try {
      if (draft.id) {
        await supportService.updateKBArticle(draft.id, {
          title: draft.title,
          content: draft.content,
          category: draft.category,
          tags,
        });
        toast.success('Article updated');
      } else {
        await supportService.createKBArticle({
          title: draft.title,
          content: draft.content,
          category: draft.category,
          tags,
        });
        toast.success('Article created');
      }
      setDraft(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this article? This can\'t be undone.')) return;
    setDeletingId(id);
    try {
      await supportService.deleteKBArticle(id);
      toast.success('Article deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublished = async (article: KnowledgeBaseItem) => {
    try {
      await supportService.updateKBArticle(article.id, { is_published: !article.is_published });
      toast.success(article.is_published ? 'Article unpublished' : 'Article published');
      onRefresh();
    } catch (error) {
      console.error('Error toggling article visibility:', error);
      toast.error('Failed to update article');
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
              placeholder="Search articles..."
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
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setDraft({ ...emptyDraft })}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus size={16} /> Add Article
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {articles.length === 0 ? 'No knowledge base articles yet' : 'No articles match this search'}
            </p>
            {articles.length === 0 && (
              <button
                onClick={() => setDraft({ ...emptyDraft })}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add your first article
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map(article => (
              <div key={article.id} className={`p-4 ${article.is_published === false ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium capitalize">
                        {article.category}
                      </span>
                      {article.is_published === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <EyeOff size={11} /> Unpublished
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <EyeIcon size={11} /> {article.views}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ThumbsUp size={11} /> {article.helpful_votes}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{article.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{article.content}</p>
                    {article.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <Tag size={11} className="text-gray-400" />
                        {article.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-500 dark:text-gray-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePublished(article)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title={article.is_published === false ? 'Publish' : 'Unpublish'}
                    >
                      {article.is_published === false ? <EyeIcon size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => setDraft({
                        id: article.id,
                        title: article.title,
                        content: article.content,
                        category: article.category,
                        tags: article.tags.join(', '),
                      })}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
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
                  {draft.id ? 'Edit Article' : 'Add Article'}
                </h3>
                <button onClick={() => setDraft(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Getting Started with..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g. delivery"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={draft.tags}
                      onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g. wallet, payment"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Write the full article content here..."
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