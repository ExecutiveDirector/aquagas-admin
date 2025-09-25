import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Book, HelpCircle, Home,
  Phone, MessageCircle, Clock, User, ChevronRight,
  Shield, Headphones
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

// Import all support components (these would be in separate files)
import CreateTicketForm from './CreateTicketForm';
import SupportTickets from './SupportTickets';
import FAQ from './FAQ';
import KnowledgeBase from './KnowledgeBase';
import SupportOverview from './SupportOverview';
import { supportService } from './SupportService';
import type { SupportTicket } from './SupportService';

// Types for component state
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
    try {
      // Load all data in parallel
      const [ticketsResult, knowledgeResult, faqResult] = await Promise.allSettled([
        supportService.getUserTickets(),
        supportService.getKnowledgeBase(),
        supportService.getFAQs()
      ]);

      // Handle tickets
      if (ticketsResult.status === 'fulfilled') {
        setTickets(ticketsResult.value);
      } else {
        console.error('Error loading tickets:', ticketsResult.reason);
      }

      // Handle knowledge base
      if (knowledgeResult.status === 'fulfilled') {
        setKnowledgeBase(knowledgeResult.value);
      } else {
        console.error('Error loading knowledge base:', knowledgeResult.reason);
      }

      // Handle FAQs
      if (faqResult.status === 'fulfilled') {
        setFAQs(faqResult.value);
      } else {
        console.error('Error loading FAQs:', faqResult.reason);
      }

    } catch (error) {
      console.error('Error loading support data:', error);
      toast.error('Failed to load support data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tickets separately for refresh functionality
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const result = await supportService.getUserTickets();
      setTickets(result);
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

// // Mock implementations of the imported components for this demo
// // In a real app, these would be separate files

// function SupportOverview({ tickets, knowledgeBase, loading, onNavigateToTab }) {
//   const supportStats = React.useMemo(() => {
//     const totalTickets = tickets.length;
//     const openTickets = tickets.filter(t => t.status === 'open').length;
//     const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
//     const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    
//     return {
//       totalTickets,
//       openTickets,
//       inProgressTickets,
//       resolvedTickets,
//       avgResolutionTime: 24,
//       avgSatisfactionRating: 4.8
//     };
//   }, [tickets]);

//   const stats = [
//     { label: 'Total Tickets', value: supportStats.totalTickets, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
//     { label: 'Open', value: supportStats.openTickets, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
//     { label: 'In Progress', value: supportStats.inProgressTickets, icon: Settings, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
//     { label: 'Resolved', value: supportStats.resolvedTickets, icon: Shield, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' }
//   ];

//   if (loading) {
//     return (
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <div key={i} className="bg-gray-200 dark:bg-gray-700 p-6 rounded-xl animate-pulse">
//             <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
//             <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
//           </div>
//         ))}
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         {stats.map((stat) => {
//           const IconComponent = stat.icon;
//           return (
//             <motion.div
//               key={stat.label}
//               whileHover={{ scale: 1.02 }}
//               className={`${stat.bg} p-6 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer`}
//               onClick={() => onNavigateToTab('tickets')}
//             >
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
//                     {stat.value}
//                   </p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     {stat.label}
//                   </p>
//                 </div>
//                 <IconComponent className={`h-8 w-8 ${stat.color}`} />
//               </div>
//             </motion.div>
//           );
//         })}
//       </div>

//       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
//         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <button
//             onClick={() => onNavigateToTab('create-ticket')}
//             className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors group"
//           >
//             <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
//             <h3 className="font-medium text-gray-800 dark:text-gray-200">Create Ticket</h3>
//             <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get help with any issue</p>
//           </button>

//           <button
//             onClick={() => onNavigateToTab('knowledge')}
//             className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 transition-colors group"
//           >
//             <Book className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
//             <h3 className="font-medium text-gray-800 dark:text-gray-200">Browse Help</h3>
//             <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Find answers instantly</p>
//           </button>

//           <button
//             onClick={() => onNavigateToTab('chat')}
//             className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 transition-colors group"
//           >
//             <MessageCircle className="h-8 w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
//             <h3 className="font-medium text-gray-800 dark:text-gray-200">Live Chat</h3>
//             <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Chat with support agent</p>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function SupportTickets({ tickets, loading, onRefresh }) {
//   if (loading) {
//     return (
//       <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//         <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
//           Support Tickets ({tickets.length})
//         </h2>
//         <button
//           onClick={onRefresh}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
//         >
//           Refresh
//         </button>
//       </div>
      
//       {tickets.length === 0 ? (
//         <div className="text-center py-12">
//           <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
//             No tickets yet
//           </h3>
//           <p className="text-gray-600 dark:text-gray-400">
//             Create your first support ticket to get help with any issues.
//           </p>
//         </div>
//       ) : (
//         <div className="text-center py-12">
//           <p className="text-gray-600 dark:text-gray-400">
//             Ticket management interface would be implemented here using the SupportTickets component from your codebase.
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

// function CreateTicketForm({ isOpen, onClose, onTicketCreated }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
//       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
//             Create Support Ticket
//           </h2>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 text-2xl"
//           >
//             ×
//           </button>
//         </div>
//         <div className="text-center py-8">
//           <p className="text-gray-600 dark:text-gray-400">
//             Create ticket form would be implemented here using your CreateTicketForm component.
//           </p>
//           <button
//             onClick={() => {
//               toast.success('Ticket created successfully!');
//               onTicketCreated();
//               onClose();
//             }}
//             className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
//           >
//             Simulate Create Ticket
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function FAQ({ searchQuery, onSearchChange, standalone }) {
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
//       <div className="text-center py-12">
//         <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//         <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
//           FAQ Component
//         </h3>
//         <p className="text-gray-600 dark:text-gray-400">
//           FAQ interface would be implemented here using your FAQ component.
//         </p>
//       </div>
//     </div>
//   );
// }

// function KnowledgeBase({ searchQuery, onSearchChange, standalone }) {
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
//       <div className="text-center py-12">
//         <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//         <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
//           Knowledge Base Component
//         </h3>
//         <p className="text-gray-600 dark:text-gray-400">
//           Knowledge base interface would be implemented here using your KnowledgeBase component.
//         </p>
//       </div>
//     </div>
//   );
// }