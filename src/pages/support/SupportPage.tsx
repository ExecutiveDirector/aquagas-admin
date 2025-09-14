import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, Phone, Mail, Search, Plus, Clock, CheckCircle2,
  AlertCircle, Send, X, ChevronDown, ChevronUp, Star, ThumbsUp,
  RefreshCw, HelpCircle, Book, FileText, Zap, TrendingUp, Calendar,
  MessageCircle, Headphones, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../utils/AuthContext';
import { useSupabase } from '../../utils/SupabaseContext';
import toast from 'react-hot-toast';

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'feature_request';
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name?: string;
  assigned_agent?: string;
  messages?: SupportMessage[];
  satisfaction_rating?: number;
  resolution_time?: number;
}

interface SupportMessage {
  id: number;
  ticket_id: number;
  message: string;
  sender_type: 'user' | 'agent';
  sender_name: string;
  created_at: string;
  attachments?: string[];
}

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

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

interface Tab {
  id: 'overview' | 'tickets' | 'knowledge' | 'chat' | 'faq';
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const priorityColors = {
  low: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', icon: '🟢' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', icon: '🟡' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-400', icon: '🟠' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', icon: '🔴' }
};

const statusColors = {
  open: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', icon: '🔵' },
  in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400', icon: '🟣' },
  resolved: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', icon: '✅' },
  closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', icon: '⚫' }
};

export default function Support() {
  const { user } = useAuth();
  const supabase = useSupabase();

  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'knowledge' | 'chat' | 'faq'>('overview');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicket, setNewTicket] = useState<Partial<SupportTicket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | SupportTicket['priority']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');
  const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const chatOnline = true;
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const isAgent = user?.role === 'admin';

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tickets
      const ticketsQuery = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (name),
          support_messages (*)
        `)
        .order('created_at', { ascending: false });

      if (!isAgent) {
        ticketsQuery.eq('user_id', user?.id);
      }

      const { data: ticketsData, error: ticketsError } = await ticketsQuery;
      if (ticketsError) throw ticketsError;

      // Fetch knowledge base
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('published', true)
        .order('views', { ascending: false });

      if (kbError) throw kbError;

      // Fetch FAQs
      const { data: faqData, error: faqError } = await supabase
        .from('faqs')
        .select('*')
        .eq('published', true)
        .order('helpful_count', { ascending: false });

      if (faqError) throw faqError;

      setTickets(ticketsData || []);
      setKnowledgeBase(kbData || []);
      setFaqs(faqData || []);
    } catch (error) {
      console.error('Error fetching support data:', error);
      toast.error('Failed to load support data');
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, isAgent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    const ticketsChannel = supabase
      .channel('support-tickets')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchData()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('support-messages')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChatMessages(prev => [...prev, payload.new as SupportMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [supabase, fetchData]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchQuery, filterStatus, filterPriority, filterCategory]);

  // Filtered knowledge base items
  const filteredKnowledgeBase = useMemo(() => {
    return knowledgeBase.filter(item => 
      item.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      item.content.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(knowledgeSearch.toLowerCase()))
    );
  }, [knowledgeBase, knowledgeSearch]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
    );
  }, [faqs, faqSearch]);

  // Create new ticket
  const createTicket = async (ticketData: Partial<SupportTicket>) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          ...ticketData,
          user_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setNewTicket(null);
      await fetchData();
      toast.success('Support ticket created successfully');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  // Send message
  const sendMessage = async (ticketId: number, message: string) => {
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          message,
          sender_type: isAgent ? 'agent' : 'user',
          sender_name: user?.name || 'User',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update ticket status if it was closed
      if (selectedTicket?.status === 'closed') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }

      await fetchData();
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Support stats
  const supportStats = useMemo(() => {
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    const avgResolutionTime = tickets
      .filter(t => t.resolution_time)
      .reduce((sum, t) => sum + (t.resolution_time || 0), 0) /
      tickets.filter(t => t.resolution_time).length || 0;
    const satisfaction = tickets
      .filter(t => t.satisfaction_rating)
      .reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0) /
      tickets.filter(t => t.satisfaction_rating).length || 0;

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      avgResolutionTime: Math.round(avgResolutionTime),
      satisfaction: satisfaction.toFixed(1)
    };
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Headphones className="h-12 w-12 text-blue-500" />
        </motion.div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading support center...</p>
      </div>
    );
  }

  // Define tabs array with explicit type
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'tickets', label: 'My Tickets', icon: MessageSquare },
    { id: 'knowledge', label: 'Knowledge Base', icon: Book },
    { id: 'chat', label: 'Live Chat', icon: MessageCircle },
    { id: 'faq', label: 'FAQ', icon: HelpCircle }
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <Headphones className="h-8 w-8 text-blue-600" />
              </div>
              Support Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Get help, find answers, and connect with our support team
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('chat')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <MessageCircle size={16} />
              Live Chat
              {chatOnline && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setNewTicket({ status: 'open', priority: 'medium', category: 'general' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <Plus size={16} />
              New Ticket
            </motion.button>
          </div>
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Call Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">+254 700 123 456</p>
                <p className="text-xs text-green-600">Available 24/7</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Email Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">support@deliveryapp.com</p>
                <p className="text-xs text-blue-600">Response within 2 hours</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Help Center</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Browse articles & guides</p>
                <p className="text-xs text-purple-600">Self-service available</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <IconComponent size={16} />
                {tab.label}
                {tab.id === 'chat' && chatOnline && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Tickets', value: supportStats.totalTickets, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
                  { label: 'Open', value: supportStats.openTickets, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
                  { label: 'In Progress', value: supportStats.inProgressTickets, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
                  { label: 'Resolved', value: supportStats.resolvedTickets, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
                  { label: 'Avg Resolution', value: `${supportStats.avgResolutionTime}h`, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
                  { label: 'Satisfaction', value: `${supportStats.satisfaction}/5`, icon: Star, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/20' }
                ].map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      whileHover={{ scale: 1.02 }}
                      className={`${stat.bg} p-4 rounded-xl border border-gray-200 dark:border-gray-600`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stat.value}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                        </div>
                        <IconComponent className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {tickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <div className={`w-3 h-3 rounded-full ${statusColors[ticket.status].bg}`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">{ticket.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Updated {new Date(ticket.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status].bg} ${statusColors[ticket.status].text}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Knowledge Base Articles */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <Book className="h-5 w-5 text-green-600" />
                  Popular Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {knowledgeBase.slice(0, 6).map((article) => (
                    <motion.div
                      key={article.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('knowledge')}
                    >
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{article.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {article.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{article.views} views</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={12} />
                          {article.helpful_votes}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | SupportTicket['status'])}
                    className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as 'all' | SupportTicket['priority'])}
                    className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  >
                    <option value="all">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as 'all' | SupportTicket['category'])}
                    className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  >
                    <option value="all">All Categories</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="general">General</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                  <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Tickets List */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Support Tickets ({filteredTickets.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No tickets found</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first support ticket to get help'
                        }
                      </p>
                      <button
                        onClick={() => setNewTicket({ status: 'open', priority: 'medium', category: 'general' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                      >
                        Create Ticket
                      </button>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <motion.div
                        key={ticket.id}
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{ticket.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className={`px-2 py-1 rounded-full font-medium ${statusColors[ticket.status].bg} ${statusColors[ticket.status].text}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-1 rounded-full font-medium ${priorityColors[ticket.priority].bg} ${priorityColors[ticket.priority].text}`}>
                                {ticket.priority}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <ChevronDown size={16} className="text-gray-400" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredKnowledgeBase.length === 0 ? (
                  <div className="col-span-full p-8 text-center">
                    <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No articles found</h3>
                    <p className="text-gray-600 dark:text-gray-400">Try a different search query.</p>
                  </div>
                ) : (
                  filteredKnowledgeBase.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 transition-transform"
                    >
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <FileText size={16} />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">{item.content}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {item.tags.map(tag => (
                          <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Live Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 h-[60vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Live Chat</h2>
                <span className={`text-sm flex items-center gap-1 ${chatOnline ? 'text-green-600' : 'text-gray-500'}`}>
                  {chatOnline ? 'Online' : 'Offline'}
                  <div className={`w-2 h-2 rounded-full ${chatOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                </span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <MessageCircle size={48} className="mb-4" />
                    <p>Start a new chat to connect with a support agent.</p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 rounded-xl max-w-xs ${msg.sender_type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-600 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                />
                <button
                  onClick={() => {
                    if (newMessage.trim() && selectedTicket) {
                      sendMessage(selectedTicket.id, newMessage);
                    }
                  }}
                  disabled={!newMessage.trim() || !selectedTicket}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
          
          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No FAQs found</h3>
                    <p className="text-gray-600 dark:text-gray-400">Try a different search query.</p>
                  </div>
                ) : (
                  filteredFaqs.map(faq => (
                    <div key={faq.id} className="p-6">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                        className="w-full text-left flex justify-between items-center"
                      >
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                          {faq.question}
                        </h3>
                        {expandedFAQ === faq.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      <AnimatePresence>
                        {expandedFAQ === faq.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 overflow-hidden"
                          >
                            <p className="text-sm text-gray-600 dark:text-gray-400">{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Ticket #{selectedTicket.id}
                </h2>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Title</p>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{selectedTicket.title}</h3>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedTicket.status].bg} ${statusColors[selectedTicket.status].text}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[selectedTicket.priority].bg} ${priorityColors[selectedTicket.priority].text}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTicket.description}</p>
                </div>

                <div className="space-y-4">
                  {/* Messages Section */}
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Conversation</h4>
                  {selectedTicket.messages && selectedTicket.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-4 rounded-xl max-w-sm ${msg.sender_type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{msg.sender_name}</span>
                          <span className="text-xs opacity-75">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-600 flex gap-2">
                  <input
                    type="text"
                    placeholder="Reply to this ticket..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newMessage.trim()) {
                        sendMessage(selectedTicket.id, newMessage);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newMessage.trim()) {
                        sendMessage(selectedTicket.id, newMessage);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {newTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Create a New Ticket</h2>
                <button
                  onClick={() => setNewTicket(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body (Form) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newTicket.title && newTicket.description) {
                    createTicket(newTicket);
                  } else {
                    toast.error('Please fill in the title and description.');
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={newTicket.title || ''}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    required
                    value={newTicket.description || ''}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    id="category"
                    value={newTicket.category || 'general'}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as 'technical' | 'billing' | 'general' | 'feature_request' })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 px-4 py-2"
                  >
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="general">General</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={newTicket.priority || 'medium'}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 px-4 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
