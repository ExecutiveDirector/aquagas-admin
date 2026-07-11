import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Book, HelpCircle, Home,
  Phone, Mail, Clock, ChevronRight,
  PhoneCall
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

import { supportService } from './SupportService';
import type { SupportTicket, KnowledgeBaseItem, FAQ, Agent, SupportStats } from './SupportService';
import { getAccount } from '../../services/authService';

import LogTicketForm from './CreateTicketForm';
import SupportTickets from './SupportTickets';
import FAQManager from './FAQ';
import KnowledgeBaseManager from './KnowledgeBase';
import SupportOverview from './SupportOverview';

type Tab = 'overview' | 'tickets' | 'log-ticket' | 'faq' | 'knowledge' | 'contact';

export default function SupportPage() {
  const account = getAccount();
  const currentAdminId: number | undefined = account?.admin_id ?? account?.id;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showLogTicketModal, setShowLogTicketModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; icon: typeof Home; description: string }[] = [
    { id: 'overview', label: 'Overview', icon: Home, description: 'Queue health & what needs attention' },
    { id: 'tickets', label: 'Tickets', icon: MessageSquare, description: 'All customer, vendor & rider tickets' },
    { id: 'log-ticket', label: 'Log a Ticket', icon: PhoneCall, description: 'Record a ticket from a call or email' },
    { id: 'faq', label: 'FAQ Manager', icon: HelpCircle, description: 'Manage published FAQs' },
    { id: 'knowledge', label: 'Knowledge Base', icon: Book, description: 'Manage published help articles' },
    { id: 'contact', label: 'Contact Channels', icon: Phone, description: 'How customers reach support' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isConnected = await supportService.testConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to support service. Please check your connection.');
      }

      const [ticketsResult, knowledgeResult, faqResult, agentsResult, statsResult] = await Promise.allSettled([
        supportService.getAllTickets(),
        supportService.getKnowledgeBase(),
        supportService.getFAQs(),
        supportService.getAgents(),
        supportService.getSupportStats(),
      ]);

      if (ticketsResult.status === 'fulfilled') {
        setTickets(ticketsResult.value || []);
      } else {
        console.error('Error loading tickets:', ticketsResult.reason);
        toast.error('Failed to load tickets');
      }

      if (knowledgeResult.status === 'fulfilled') {
        setKnowledgeBase(knowledgeResult.value || []);
      } else {
        console.error('Error loading knowledge base:', knowledgeResult.reason);
        toast.error('Failed to load knowledge base');
      }

      if (faqResult.status === 'fulfilled') {
        setFAQs(faqResult.value || []);
      } else {
        console.error('Error loading FAQs:', faqResult.reason);
        toast.error('Failed to load FAQs');
      }

      if (agentsResult.status === 'fulfilled') {
        setAgents(agentsResult.value || []);
      } else {
        console.error('Error loading agents:', agentsResult.reason);
        // Non-fatal — assignment dropdown just won't have options.
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else {
        console.error('Error loading support stats:', statsResult.reason);
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

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const result = await supportService.getAllTickets();
      setTickets(result || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigateToTab = useCallback((tab: string) => {
    setActiveTab(tab as Tab);
  }, []);

  const handleTicketLogged = useCallback(() => {
    loadTickets();
    setActiveTab('tickets');
  }, [loadTickets]);

  const handleGlobalSearchChange = useCallback((query: string) => {
    setGlobalSearchQuery(query);
  }, []);

  const currentTab = tabs.find(tab => tab.id === activeTab);

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;

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
          success: { iconTheme: { primary: '#10B981', secondary: 'white' } },
        }}
      />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold">Support Console</h1>
                  <p className="text-blue-100 text-sm">
                    Tickets raised by customers, vendors, and riders across AquaGas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">{tickets.length}</div>
                  <div className="text-sm text-blue-100">Total Tickets</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{openCount}</div>
                  <div className="text-sm text-blue-100">Active</div>
                </div>
                {urgentCount > 0 && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-200">{urgentCount}</div>
                    <div className="text-sm text-blue-100">Urgent</div>
                  </div>
                )}
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
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-4 rounded-lg transition-all duration-200 text-left group relative ${
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
                      {tab.id === 'tickets' && urgentCount > 0 && (
                        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-red-600' : 'bg-red-500 text-white'}`}>
                          {urgentCount}
                        </span>
                      )}
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
              stats={stats}
              loading={loading}
              onNavigateToTab={handleNavigateToTab}
            />
          )}

          {activeTab === 'tickets' && (
            <SupportTickets
              tickets={tickets}
              agents={agents}
              currentAdminId={currentAdminId}
              loading={ticketsLoading}
              onRefresh={loadTickets}
              isAdmin={true}
            />
          )}

          {activeTab === 'log-ticket' && (
            <LogTicketForm onTicketLogged={handleTicketLogged} />
          )}

          {activeTab === 'faq' && (
            <FAQManager
              faqs={faqs}
              onRefresh={loadData}
              searchQuery={globalSearchQuery}
              onSearchChange={handleGlobalSearchChange}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBaseManager
              articles={knowledgeBase}
              onRefresh={loadData}
              searchQuery={globalSearchQuery}
              onSearchChange={handleGlobalSearchChange}
            />
          )}

          {activeTab === 'contact' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-8">
              <div className="max-w-2xl mx-auto text-center">
                <Phone className="h-16 w-16 text-purple-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  How Customers Reach Support
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  These are the channels customers, vendors, and riders currently use to reach AquaGas.
                  In-app live chat isn't built yet — every one of these currently routes into a ticket
                  here in the Tickets tab.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg flex items-start gap-3">
                    <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Phone</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use "Log a Ticket" to record what was discussed on a call.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Email</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Log emailed requests the same way, tagged with the right category.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">In-app tickets</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customers, vendors, and riders submit these directly from their apps — they land
                        in Tickets automatically.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg flex items-start gap-3 opacity-60">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Live chat</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon — not built yet.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Legacy modal kept for compatibility if referenced elsewhere; the
          Log-a-Ticket tab is now the primary entry point. */}
      {showLogTicketModal && (
        <div className="hidden" />
      )}
    </div>
  );
}
