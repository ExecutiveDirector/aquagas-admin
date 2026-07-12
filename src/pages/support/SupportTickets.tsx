// components/support/SupportTickets.tsx
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, RefreshCw, Filter, ChevronDown,
  MessageSquare, Star, X, Send,
  FileText, Calendar, User, Store, Bike,
  UserPlus, AlertTriangle, Lock
} from 'lucide-react';
import { type SupportTicket, type SupportMessage, type Agent, supportService } from './SupportService';
import { toast } from 'react-hot-toast';

interface SupportTicketsProps {
  tickets: SupportTicket[];
  agents?: Agent[];
  currentAdminId?: number;
  loading: boolean;
  onRefresh: () => void;
  isAdmin?: boolean;
}

type SortMode = 'priority' | 'newest' | 'oldest';

function requesterInfo(ticket: SupportTicket): { label: string; type: 'Customer' | 'Vendor' | 'Rider' | 'Unknown'; icon: typeof User } {
  if (ticket.vendor) {
    return { label: ticket.vendor.business_name || `Vendor #${ticket.vendor_id}`, type: 'Vendor', icon: Store };
  }
  if (ticket.rider) {
    const name = [ticket.rider.first_name, ticket.rider.last_name].filter(Boolean).join(' ');
    return { label: name || `Rider #${ticket.rider_id}`, type: 'Rider', icon: Bike };
  }
  if (ticket.user) {
    const name = [ticket.user.first_name, ticket.user.last_name].filter(Boolean).join(' ');
    return { label: name || `Customer #${ticket.user_id}`, type: 'Customer', icon: User };
  }
  return { label: 'Unknown requester', type: 'Unknown', icon: User };
}

function hoursSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

// SLA thresholds are a starting point, not a formal policy — they just
// give agents a visual nudge that something's been sitting too long.
function slaBadge(ticket: SupportTicket): { label: string; className: string } | null {
  if (ticket.status === 'resolved' || ticket.status === 'closed') return null;
  const age = hoursSince(ticket.created_at);
  const threshold = ticket.priority === 'urgent' ? 2 : ticket.priority === 'high' ? 8 : 24;
  if (age < threshold) return null;
  const overdue = age >= threshold * 2;
  return {
    label: age >= 48 ? `${Math.floor(age / 24)}d open` : `${Math.floor(age)}h open`,
    className: overdue
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
}

export default function SupportTickets({
  tickets,
  agents = [],
  currentAdminId,
  loading,
  onRefresh,
  isAdmin = false
}: SupportTicketsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | SupportTicket['priority']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'unassigned' | 'mine'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [assigningTicket, setAssigningTicket] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let result = tickets.filter(ticket => {
      const requester = requesterInfo(ticket);
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticket_number.includes(searchQuery) ||
        requester.label.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;
      const matchesAssignment =
        filterAssignment === 'all' ||
        (filterAssignment === 'unassigned' && !ticket.assigned_admin_id) ||
        (filterAssignment === 'mine' && ticket.assigned_admin_id === currentAdminId);

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignment;
    });

    const priorityRank: Record<SupportTicket['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

    result = [...result].sort((a, b) => {
      if (sortMode === 'priority') {
        const rankDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortMode === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [tickets, searchQuery, filterStatus, filterPriority, filterCategory, filterAssignment, sortMode, currentAdminId]);

  // Status and priority colors
  const statusColors = {
    open: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', icon: '🔵' },
    in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-800 dark:text-purple-400', icon: '🟣' },
    waiting_customer: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', icon: '🟡' },
    resolved: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', icon: '✅' },
    closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', icon: '⚫' }
  };

  const priorityColors = {
    low: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    medium: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
    urgent: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' }
  };

  const loadTicketMessages = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    setIsInternalNote(false);
    try {
      const messages = await supportService.getTicketMessages(ticket.ticket_id);
      setTicketMessages(messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation');
      setTicketMessages(ticket.support_messages || []);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTicket) return;
    // Keep the open ticket's data fresh when the underlying list refreshes
    // (e.g. after a status change elsewhere).
    const fresh = tickets.find(t => t.ticket_id === selectedTicket.ticket_id);
    if (fresh) setSelectedTicket(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  const handleStatusChange = async (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    try {
      await supportService.updateTicketStatus(ticket.ticket_id, newStatus);
      toast.success('Ticket status updated');
      onRefresh();
      if (selectedTicket?.ticket_id === ticket.ticket_id) {
        setSelectedTicket({ ...ticket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handlePriorityChange = async (ticket: SupportTicket, newPriority: SupportTicket['priority']) => {
    setUpdatingPriority(true);
    try {
      await supportService.updateTicketPriority(ticket.ticket_id, newPriority);
      toast.success('Priority updated');
      onRefresh();
      if (selectedTicket?.ticket_id === ticket.ticket_id) {
        setSelectedTicket({ ...ticket, priority: newPriority });
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleAssign = async (ticket: SupportTicket, adminId: number | null) => {
    if (adminId === null) return;
    setAssigningTicket(true);
    try {
      await supportService.assignTicket(ticket.ticket_id, adminId);
      toast.success('Ticket assigned');
      onRefresh();
      if (selectedTicket?.ticket_id === ticket.ticket_id) {
        setSelectedTicket({ ...ticket, assigned_admin_id: adminId });
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    } finally {
      setAssigningTicket(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const result = await supportService.addMessage(selectedTicket.ticket_id, {
        message: newMessage.trim(),
        is_internal: isInternalNote,
      });
      setTicketMessages(prev => [...prev, result.data]);
      setNewMessage('');
      setIsInternalNote(false);
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
      onRefresh();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const unassignedCount = tickets.filter(t => !t.assigned_admin_id && t.status !== 'resolved' && t.status !== 'closed').length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by subject, ticket number, or requester name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter size={16} />
              Filters
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="priority">Priority first</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_customer">Waiting on Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
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

                <select
                  value={filterAssignment}
                  onChange={(e) => setFilterAssignment(e.target.value as typeof filterAssignment)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="all">Any Assignment</option>
                  <option value="unassigned">Unassigned {unassignedCount > 0 ? `(${unassignedCount})` : ''}</option>
                  <option value="mine">Assigned to me</option>
                </select>

                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterCategory('all');
                    setFilterAssignment('all');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  Clear filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ticket List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No tickets match these filters</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {tickets.length === 0 ? 'The queue is empty — nothing needs attention right now.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => {
              const requester = requesterInfo(ticket);
              const RequesterIcon = requester.icon;
              const sla = slaBadge(ticket);
              const assignedAgent = agents.find(a => a.admin_id === ticket.assigned_admin_id);

              return (
                <div
                  key={ticket.ticket_id}
                  onClick={() => loadTicketMessages(ticket)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{ticket.ticket_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ticket.status].bg} ${statusColors[ticket.status].text}`}>
                          {statusColors[ticket.status].icon} {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[ticket.priority].bg} ${priorityColors[ticket.priority].text}`}>
                          {ticket.priority}
                        </span>
                        {sla && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sla.className}`}>
                            <AlertTriangle size={11} /> {sla.label}
                          </span>
                        )}
                        {!ticket.assigned_admin_id && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Unassigned
                          </span>
                        )}
                      </div>

                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{ticket.subject}</h3>

                      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <RequesterIcon size={13} />
                          {requester.label}
                          <span className="text-gray-400 dark:text-gray-600">· {requester.type}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {formatDate(ticket.created_at)}
                        </span>
                        {assignedAgent && (
                          <span className="flex items-center gap-1">
                            <UserPlus size={13} />
                            {assignedAgent.account?.email || `Agent #${assignedAgent.admin_id}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronDown size={18} className="text-gray-300 dark:text-gray-600 -rotate-90 flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">{selectedTicket.ticket_number}</span>
                      {(() => {
                        const requester = requesterInfo(selectedTicket);
                        const RequesterIcon = requester.icon;
                        return (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <RequesterIcon size={12} /> {requester.label} · {requester.type}
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{selectedTicket.subject}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 flex-shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket, e.target.value as SupportTicket['status'])}
                      className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting on Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={selectedTicket.priority}
                      disabled={updatingPriority}
                      onChange={(e) => handlePriorityChange(selectedTicket, e.target.value as SupportTicket['priority'])}
                      className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    >
                      <option value="low">Low priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="high">High priority</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <select
                      value={selectedTicket.assigned_admin_id ?? ''}
                      disabled={assigningTicket}
                      onChange={(e) => handleAssign(selectedTicket, e.target.value ? Number(e.target.value) : null)}
                      className="text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {agents.map(agent => (
                        <option key={agent.admin_id} value={agent.admin_id}>
                          {agent.account?.email || `Agent #${agent.admin_id}`}
                          {agent.admin_id === currentAdminId ? ' (me)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>

                {messagesLoading ? (
                  <div className="text-center py-6">
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin mx-auto" />
                  </div>
                ) : (
                  ticketMessages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.is_internal
                            ? 'bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-300 dark:border-amber-700'
                            : msg.sender_type === 'admin'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div className={`flex items-center gap-1.5 text-xs mb-1 ${
                          msg.is_internal
                            ? 'text-amber-700 dark:text-amber-400'
                            : msg.sender_type === 'admin' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {msg.is_internal && <Lock size={11} />}
                          {msg.sender_name} {msg.is_internal && '· internal note'}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply box */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  {isAdmin && (
                    <label className="flex items-center gap-2 mb-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Lock size={12} />
                      Internal note (not visible to the requester)
                    </label>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isInternalNote ? 'Add a note for other agents...' : 'Type a reply...'}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className={`px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isInternalNote
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}

              {selectedTicket.customer_satisfaction_rating && (
                <div className="px-5 pb-4 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  Rated {selectedTicket.customer_satisfaction_rating}/5 by requester
                </div>
              )}

              {selectedTicket.related_order && (
                <div className="px-5 pb-4 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <FileText size={14} />
                  Related order: {selectedTicket.related_order.order_number}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}