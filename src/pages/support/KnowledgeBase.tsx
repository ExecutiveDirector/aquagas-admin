import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Book, ThumbsUp, Eye, Filter, Tag, 
   RefreshCw, BookOpen, Clock,
  ArrowRight, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface KnowledgeBaseItem {
  id: number;
  title: string;
  content: string;
  category: string;
  views: number;
  helpful_votes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Support service for API calls
class SupportService {
  private API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getKnowledgeBase(category?: string, search?: string): Promise<KnowledgeBaseItem[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const response = await fetch(`${this.API_BASE_URL}/support/knowledge-base?${params}`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getHelpTopics(): Promise<string[]> {
    const response = await fetch(`${this.API_BASE_URL}/support/help-topics`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async incrementKnowledgeBaseViews(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/support/knowledge-base/${id}/view`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });
      await this.handleResponse(response);
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  async voteHelpful(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/support/knowledge-base/${id}/helpful`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });
      await this.handleResponse(response);
    } catch (error) {
      console.error('Error voting helpful:', error);
      throw error;
    }
  }
}

const supportService = new SupportService();

// Main Component
interface KnowledgeBaseProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  standalone?: boolean;
}

export default function KnowledgeBase({ 
  searchQuery: externalSearchQuery = '', 
  onSearchChange, 
  standalone = false 
}: KnowledgeBaseProps) {
  // State management
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseItem | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Set<number>>(new Set());
  const [viewedArticles, setViewedArticles] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'helpful'>('popular');

  // Use external search query if provided, otherwise use local
  const searchQuery = externalSearchQuery || localSearchQuery;
  const handleSearchChange = onSearchChange || setLocalSearchQuery;

  // Fetch knowledge base
  const fetchKnowledgeBase = async () => {
    try {
      const data = await supportService.getKnowledgeBase(
        categoryFilter === 'all' ? undefined : categoryFilter,
        searchQuery || undefined
      );
      setKnowledgeBase(data);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      toast.error('Failed to load knowledge base');
    }
  };

  // Initial load and search/filter changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchKnowledgeBase();
      setLoading(false);
    };
    loadData();
  }, [categoryFilter, searchQuery]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchKnowledgeBase();
    setRefreshing(false);
    toast.success('Knowledge base refreshed');
  };

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(knowledgeBase.map(item => item.category)));
    return ['all', ...uniqueCategories.sort()];
  }, [knowledgeBase]);

  // Sort and filter articles
  const sortedArticles = useMemo(() => {
    let filtered = [...knowledgeBase];
    
    // Apply sorting
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpful_votes - a.helpful_votes);
        break;
    }
    
    return filtered;
  }, [knowledgeBase, sortBy]);

  // Handle article view
  const handleViewArticle = async (article: KnowledgeBaseItem) => {
    setSelectedArticle(article);
    
    // Increment view count if not already viewed
    if (!viewedArticles.has(article.id)) {
      try {
        await supportService.incrementKnowledgeBaseViews(article.id);
        setKnowledgeBase(prev =>
          prev.map(item => 
            item.id === article.id 
              ? { ...item, views: item.views + 1 }
              : item
          )
        );
        setViewedArticles(prev => new Set([...prev, article.id]));
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
    }
  };

  // Handle helpful vote
  const handleHelpfulVote = async (id: number) => {
    if (helpfulVotes.has(id)) {
      toast('You have already voted for this article', {
        icon: 'ℹ️',
        style: {
          background: '#e0f2fe',
          color: '#0369a1',
        },
      });
      return;
    }
    

    try {
      await supportService.voteHelpful(id);
      
      setKnowledgeBase(prev =>
        prev.map(item => 
          item.id === id 
            ? { ...item, helpful_votes: item.helpful_votes + 1 }
            : item
        )
      );
      
      setHelpfulVotes(prev => new Set([...prev, id]));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error voting helpful:', error);
      toast.error('Failed to record vote');
    }
  };

  // Category color mapping
  const getCategoryColor = (category: string) => {
    const colors = {
      'getting-started': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'delivery': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'payment': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'troubleshooting': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'account': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'general': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
          <div className="flex justify-center items-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Book className="h-12 w-12 text-blue-500" />
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (only show if standalone) */}
      {standalone && (
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Book className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
          </div>
          <p className="text-green-100">
            Browse our comprehensive help articles and guides
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <BookOpen size={16} />
              <span>{knowledgeBase.length} articles</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>{knowledgeBase.reduce((sum, item) => sum + item.views, 0)} total views</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
        <div className="flex flex-col space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search articles by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Filter size={14} />
              Filters
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'helpful')}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {sortedArticles.length} article{sortedArticles.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Category filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-600"
              >
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      categoryFilter === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    {category !== 'all' && (
                      <span className="ml-1 text-xs opacity-75">
                        ({knowledgeBase.filter(item => item.category === category).length})
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedArticles.length === 0 ? (
          <div className="col-span-full p-12 text-center">
            <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              No articles found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or category filter'
                : 'No knowledge base articles are available at the moment'
              }
            </p>
          </div>
        ) : (
          sortedArticles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-all"
              onClick={() => handleViewArticle(article)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                  {article.category}
                </span>
                <div className="flex items-center gap-1 text-gray-400">
                  <Eye size={12} />
                  <span className="text-xs">{article.views}</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 line-clamp-2">
                {article.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                {article.content}
              </p>

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {article.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs flex items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                  {article.tags.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{article.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} />
                    {article.helpful_votes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(article.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <ArrowRight size={14} className="text-blue-500" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedArticle(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedArticle.category)}`}>
                      {selectedArticle.category}
                    </span>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {selectedArticle.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={14} />
                        {selectedArticle.helpful_votes} helpful
                      </span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {selectedArticle.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedArticle.content}
                  </div>
                </div>

                {/* Tags */}
                {selectedArticle.tags.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm flex items-center gap-1"
                        >
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}
                </div>
                <button
                  onClick={() => handleHelpfulVote(selectedArticle.id)}
                  disabled={helpfulVotes.has(selectedArticle.id)}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    helpfulVotes.has(selectedArticle.id)
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <ThumbsUp size={16} className={helpfulVotes.has(selectedArticle.id) ? 'fill-current' : ''} />
                  {helpfulVotes.has(selectedArticle.id) ? 'Marked as helpful' : 'Mark as helpful'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Section */}
      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <BookOpen className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Can't find what you're looking for?
            </h3>
            <p className="text-green-700 dark:text-green-200 text-sm mb-3">
              Our knowledge base is constantly growing. If you need help with something specific, try our other support options.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                Contact Support
              </button>
              <button className="px-3 py-1 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-sm">
                Browse FAQ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}