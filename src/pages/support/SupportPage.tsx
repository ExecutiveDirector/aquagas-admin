import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Book, HelpCircle, Home,
  Phone, MessageCircle, Clock, User, ChevronRight,
  Shield, Headphones
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

// Import types from the updated service
import { supportService } from './SupportService';
import type { SupportTicket, KnowledgeBaseItem } from './SupportService';

// Import your existing components (make sure these exist in your project)
import CreateTicketForm from './CreateTicketForm';
import SupportTickets from './SupportTickets';
import FAQ from './FAQ';
import KnowledgeBase from './KnowledgeBase';
import SupportOverview from './SupportOverview';
// Types
interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}
// Main SupportPage component
export default function SupportPage() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'create-ticket' | 'faq' | 'knowledge' | 'chat'>('overview');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Data state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      description: 'Dashboard and quick actions'
    },
    {
      id: 'tickets',
      label: 'My Tickets',
      icon: MessageSquare,
      description: 'View and manage your support tickets'
    },
    {
      id: 'create-ticket',
      label: 'Create Ticket',
      icon: MessageCircle,
      description: 'Submit a new support request'
    },
    {
      id: 'faq',
      label: 'FAQ',
      icon: HelpCircle,
      description: 'Frequently asked questions'
    },
    {
      id: 'knowledge',
      label: 'Help Articles',
      icon: Book,
      description: 'Browse our knowledge base'
    },
    {
      id: 'chat',
      label: 'Live Chat',
      icon: Headphones,
      description: 'Chat with support agent'
    }
  ];

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Test connection first
      const isConnected = await supportService.testConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to support service. Please check your connection.');
      }

      // Load all data in parallel with proper error handling
      const [ticketsResult, knowledgeResult, faqResult] = await Promise.allSettled([
        supportService.getUserTickets(),
        supportService.getKnowledgeBase(),
        supportService.getFAQs()
      ]);

      // Handle tickets
      if (ticketsResult.status === 'fulfilled') {
        setTickets(ticketsResult.value || []);
      } else {
        console.error('Error loading tickets:', ticketsResult.reason);
        toast.error('Failed to load tickets');
      }

      // Handle knowledge base
      if (knowledgeResult.status === 'fulfilled') {
        setKnowledgeBase(knowledgeResult.value || []);
      } else {
        console.error('Error loading knowledge base:', knowledgeResult.reason);
        toast.error('Failed to load knowledge base');
      }

      // Handle FAQs
      if (faqResult.status === 'fulfilled') {
        setFAQs(faqResult.value || []);
      } else {
        console.error('Error loading FAQs:', faqResult.reason);
        toast.error('Failed to load FAQs');
      }

    } catch (error) {
      console.error('Error loading support data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load support data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tickets separately for refresh functionality
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const result = await supportService.getUserTickets();
      setTickets(result || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tab navigation from child components
  const handleNavigateToTab = useCallback((tab: string) => {
    setActiveTab(tab as typeof activeTab);
  }, []);

  // Handle ticket creation success
  const handleTicketCreated = useCallback(() => {
    loadTickets();
    setActiveTab('tickets');
  }, [loadTickets]);

  // Handle global search
  const handleGlobalSearchChange = useCallback((query: string) => {
    setGlobalSearchQuery(query);
  }, []);

  // Get current tab info
  const currentTab = tabs.find(tab => tab.id === activeTab);

  // Error state
  if (error && loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 max-w-md mx-auto text-center">
          <MessageSquare className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={loadData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            color: '#374151',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: 'white'
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white'
            }
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white p-8 rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Support Center</h1>
                <p className="text-blue-100 text-lg">
                  We're here to help you get the most out of our service
                </p>
                <div className="flex items-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>24/7 Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Multiple Channels</span>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">{tickets.length}</div>
                  <div className="text-sm text-blue-100">Total Tickets</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-blue-100">Active</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`p-4 rounded-lg transition-all duration-200 text-left group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent 
                        size={20} 
                        className={`${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}
                      />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${
                      isActive 
                        ? 'text-blue-100' 
                        : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                    }`}>
                      {tab.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Support</span>
            <ChevronRight size={16} />
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {currentTab?.label}
            </span>
          </nav>
        </div>

        {/* Main Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <SupportOverview
              tickets={tickets}
              knowledgeBase={knowledgeBase}
              loading={loading}
              onNavigateToTab={handleNavigateToTab}
            />
          )}

          {activeTab === 'tickets' && (
            <SupportTickets
              tickets={tickets}
              loading={ticketsLoading}
              onRefresh={loadTickets}
              isAdmin={false}
            />
          )}

          {activeTab === 'create-ticket' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-8">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <MessageCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                    Create Support Ticket
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tell us about your issue and we'll help you resolve it quickly
                  </p>
                </div>
                
                <button
                  onClick={() => setShowCreateTicketModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-3"
                >
                  <MessageSquare size={20} />
                  Start New Ticket
                </button>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Before creating a ticket:
                    </h4>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-200">
                      <li>• Check our FAQ for quick answers</li>
                      <li>• Browse help articles</li>
                      <li>• Try our live chat for instant help</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      What to include:
                    </h4>
                    <ul className="space-y-1 text-green-700 dark:text-green-200">
                      <li>• Detailed description of the issue</li>
                      <li>• Steps to reproduce the problem</li>
                      <li>• Screenshots if applicable</li>
                      <li>• Related order ID if relevant</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <FAQ
              searchQuery={globalSearchQuery}
              onSearchChange={handleGlobalSearchChange}
              standalone={true}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBase
              searchQuery={globalSearchQuery}
              onSearchChange={handleGlobalSearchChange}
              standalone={true}
            />
          )}

          {activeTab === 'chat' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-8">
              <div className="text-center max-w-2xl mx-auto">
                <Headphones className="h-16 w-16 text-purple-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                  Live Chat Support
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Connect with our support team instantly. Our agents are available 24/7 to help you with any questions or issues.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <Clock className="h-8 w-8 text-green-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Average Response Time
                    </h3>
                    <p className="text-2xl font-bold text-green-600 mb-1">2 minutes</p>
                    <p className="text-sm text-gray-500">During business hours</p>
                  </div>
                  
                  <div className="p-6 border border-gray-200 dark:border-gray-600 rounded-xl">
                    <User className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Available Agents
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 mb-1">12</p>
                    <p className="text-sm text-gray-500">Ready to help</p>
                  </div>
                </div>
                
                <button className="bg-purple-600 hover:bg-purple-700 text-white py-4 px-8 rounded-xl font-medium text-lg transition-colors inline-flex items-center gap-3">
                  <MessageCircle size={20} />
                  Start Live Chat
                </button>

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 For complex technical issues, consider creating a ticket instead for better tracking and documentation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={showCreateTicketModal}
        onClose={() => setShowCreateTicketModal(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
}