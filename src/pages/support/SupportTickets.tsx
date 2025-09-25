// // components/support/SupportTickets.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Filter, ChevronDown,
  MessageSquare, Star, X, Send,
   FileText, Calendar
} from 'lucide-react';
import { type SupportTicket, type SupportMessage, supportService } from './SupportService';
import { toast } from 'react-hot-toast';

interface SupportTicketsProps {
  tickets: SupportTicket[];
  loading: boolean;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export default function SupportTickets({ 
  tickets, 
  loading, 
  onRefresh,
  isAdmin = false 
}: SupportTicketsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | SupportTicket['priority']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.includes(searchQuery);
      
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchQuery, filterStatus, filterPriority, filterCategory]);

  // Status and priority colors
  const statusColors = {
    open: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', icon: '🔵' },
    in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400', icon: '🟣' },
    waiting_customer: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', icon: '🟡' },
    resolved: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', icon: '✅' },
    closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', icon: '⚫' }
  };

  const priorityColors = {
    low: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-400' },
    urgent: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400' }
  };

  // Load ticket messages
  const loadTicketMessages = async (ticket: SupportTicket) => {
    setMessagesLoading(true);
    try {
      const messages = await supportService.getTicketMessages(ticket.ticket_id);
      setTicketMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load ticket messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  // Handle ticket selection
  const handleTicketSelect = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadTicketMessages(ticket);
  };

  // Send message
  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const result = await supportService.addMessage(selectedTicket.ticket_id, {
        message_text: newMessage.trim()
      });
      
      // Add new message to the list
      setTicketMessages(prev => [...prev, result.data]);
      setNewMessage('');
      toast.success('Message sent successfully');
      
      // Refresh tickets to update status if needed
      onRefresh();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Update ticket status (admin only)
  const updateTicketStatus = async (ticketId: number, newStatus: SupportTicket['status']) => {
    try {
      await supportService.updateTicketStatus(ticketId, newStatus);
      toast.success('Ticket status updated');
      onRefresh();
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  // Rate ticket
  const rateTicket = async (ticketId: number, rating: number) => {
    try {
      await supportService.rateTicket(ticketId, rating);
      toast.success('Thank you for your feedback!');
      onRefresh();
    } catch (error) {
      console.error('Error rating ticket:', error);
      toast.error('Failed to submit rating');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
        <div className="flex flex-col space-y-4">
          {/* Search and main controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search tickets by subject, description, or ticket number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Filter size={16} />
                Filters
                <ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
              </button>
              
              <button
                onClick={onRefresh}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filter dropdowns */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | SupportTicket['status'])}
                    className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as 'all' | SupportTicket['priority'])}
                    className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as 'all' | SupportTicket['category'])}
                    className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Categories</option>
                    <option value="order_issue">Order Issue</option>
                    <option value="delivery_problem">Delivery Problem</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="product_quality">Product Quality</option>
                    <option value="account_issue">Account Issue</option>
                    <option value="technical_support">Technical Support</option>
                    <option value="billing_inquiry">Billing Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Support Tickets ({filteredTickets.length})
          </h2>
          {filteredTickets.length > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTickets.filter(t => t.status === 'open').length} open, {' '}
              {filteredTickets.filter(t => t.status === 'in_progress').length} in progress
            </div>
          )}
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
            </div>
          )}
          
          {!loading && filteredTickets.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'You haven\'t created any support tickets yet'
                }
              </p>
            </div>
          )}
          
          {!loading && filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.ticket_id}
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleTicketSelect(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                      {ticket.subject}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{ticket.ticket_number}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {ticket.description}
                  </p>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status].bg} ${statusColors[ticket.status].text}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority].bg} ${priorityColors[ticket.priority].text}`}>
                      {ticket.priority}
                    </span>
                    
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                    
                    {ticket.related_order_id && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FileText size={12} />
                        Order #{ticket.related_order_id}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-4">
                  {ticket.customer_satisfaction_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {ticket.customer_satisfaction_rating}/5
                      </span>
                    </div>
                  )}
                  
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTicket(null);
                setTicketMessages([]);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Ticket #{selectedTicket.ticket_number}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setTicketMessages([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Ticket Info */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedTicket.status].bg} ${statusColors[selectedTicket.status].text}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      {isAdmin && (
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => updateTicketStatus(selectedTicket.ticket_id, e.target.value as SupportTicket['status'])}
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="waiting_customer">Waiting Customer</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${priorityColors[selectedTicket.priority].bg} ${priorityColors[selectedTicket.priority].text}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mt-1 capitalize">
                      {selectedTicket.category.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">
                      {new Date(selectedTicket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Conversation</h4>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading messages...</p>
                    </div>
                  ) : ticketMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">No messages yet</p>
                    </div>
                  ) : (
                    ticketMessages.map((message) => (
                      <div
                        key={message.message_id}
                        className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_type === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {message.sender_name}
                            </span>
                            <span className="text-xs opacity-75">
                              {new Date(message.sent_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.message_text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        disabled={sendingMessage}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Rating Section */}
                {selectedTicket.status === 'resolved' && !selectedTicket.customer_satisfaction_rating && !isAdmin && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-green-50 dark:bg-green-900/20">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                      How was your support experience?
                    </h5>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => rateTicket(selectedTicket.ticket_id, rating)}
                          className="text-yellow-400 hover:text-yellow-500 transition-colors"
                        >
                          <Star size={24} className="fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}