import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, HelpCircle,  ChevronDown, ThumbsUp, 
  Filter,  MessageCircle, RefreshCw, 
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import 'react-toastify/dist/ReactToastify.css';

// Types
interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

// Support service for API calls
class SupportService {
  private API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

  async getFAQs(category?: string): Promise<FAQ[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);

    const response = await fetch(`${this.API_BASE_URL}/support/faq?${params}`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async incrementFAQHelpful(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/support/faq/${id}/helpful`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });
      await this.handleResponse(response);
    } catch (error) {
      console.error('Error incrementing FAQ helpful count:', error);
      throw error;
    }
  }
}

const supportService = new SupportService();

// Main FAQ Component
interface FAQProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  standalone?: boolean;
}

export default function FAQ({ 
  searchQuery: externalSearchQuery = '', 
  onSearchChange, 
  standalone = false 
}: FAQProps) {
  // State management
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [helpfulClicks, setHelpfulClicks] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Use external search query if provided, otherwise use local
  const searchQuery = externalSearchQuery || localSearchQuery;
  const handleSearchChange = onSearchChange || setLocalSearchQuery;

  // Fetch FAQs
  const fetchFAQs = useCallback(async () => {
    try {
      const data = await supportService.getFAQs(categoryFilter === 'all' ? undefined : categoryFilter);
      setFaqs(data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to load FAQs');
    }
  }, [categoryFilter]);

  // Initial load
  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      await fetchFAQs();
      setLoading(false);
    };
    loadFAQs();
  }, [fetchFAQs]);

  // Refresh FAQs
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFAQs();
    setRefreshing(false);
    toast.success('FAQs refreshed');
  };

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(faqs.map(faq => faq.category)));
    return ['all', ...uniqueCategories.sort()];
  }, [faqs]);

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesSearch = searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchQuery, categoryFilter]);

  // Handle helpful click
  const handleHelpfulClick = async (id: number) => {
    if (helpfulClicks.has(id)) {
      toast('You have already marked this as helpful'); // neutral toast
      return;
    }
    
    try {
      await supportService.incrementFAQHelpful(id);
      
      // Update local state
      setFaqs(prev =>
        prev.map(faq => 
          faq.id === id 
            ? { ...faq, helpful_count: faq.helpful_count + 1 }
            : faq
        )
      );
      
      // Track that user clicked helpful for this FAQ
      setHelpfulClicks(prev => new Set([...prev, id]));
      
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error marking FAQ as helpful:', error);
      toast.error('Failed to record feedback');
    }
  };

  // Toggle FAQ expansion
  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  // Category color mapping
  const getCategoryColor = (category: string) => {
    const colors = {
      orders: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      payment: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      support: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      account: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
              <HelpCircle className="h-12 w-12 text-blue-500" />
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-blue-100">
            Find quick answers to common questions about our service
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
        <div className="flex flex-col space-y-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search FAQs by question or answer..."
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
              Categories
              <ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={14} />
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? 's' : ''} found
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
                        ({faqs.filter(faq => faq.category === category).length})
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FAQ List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              No FAQs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or category filter'
                : 'No frequently asked questions are available at the moment'
              }
            </p>
            {(searchQuery || categoryFilter !== 'all') && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => handleSearchChange('')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Clear Search
                </button>
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Show All Categories
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full text-left flex justify-between items-start gap-4 group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(faq.category)}`}>
                        {faq.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {faq.question}
                    </h3>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedFAQ === faq.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 mt-1"
                  >
                    <ChevronDown size={20} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedFAQ === faq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHelpfulClick(faq.id);
                            }}
                            disabled={helpfulClicks.has(faq.id)}
                            className={`flex items-center gap-1 text-sm transition-colors ${
                              helpfulClicks.has(faq.id)
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
                            }`}
                          >
                            <ThumbsUp size={16} className={helpfulClicks.has(faq.id) ? 'fill-current' : ''} />
                            <span>
                              {helpfulClicks.has(faq.id) ? 'Marked as helpful' : 'Helpful'} ({faq.helpful_count})
                            </span>
                          </button>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          FAQ #{faq.id}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Still need help?
            </h3>
            <p className="text-blue-700 dark:text-blue-200 text-sm mb-3">
              If you couldn't find the answer you're looking for, don't hesitate to reach out to our support team.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1">
                <MessageCircle size={14} />
                Contact Support
              </button>
              <button className="px-3 py-1 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-sm flex items-center gap-1">
                <BookOpen size={14} />
                Browse Help Articles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}