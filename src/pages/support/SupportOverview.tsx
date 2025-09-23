// components/support/SupportOverview.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, AlertCircle, Clock, CheckCircle2, Star, Zap,
  Calendar, Book, ThumbsUp, TrendingUp
} from 'lucide-react';
import type { SupportTicket } from './SupportService';

interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  avgSatisfactionRating: number;
}

interface KnowledgeBaseArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  views: number;
  helpful_votes: number;
  tags: string[];
}

interface SupportOverviewProps {
  tickets: SupportTicket[];
  knowledgeBase: KnowledgeBaseArticle[];
  loading: boolean;
  onNavigateToTab: (tab: string) => void;
}

export default function SupportOverview({ 
  tickets, 
  knowledgeBase, 
  loading, 
  onNavigateToTab 
}: SupportOverviewProps) {
  // Calculate stats from tickets
  const supportStats: SupportStats = React.useMemo(() => {
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    
    const avgResolutionTime = tickets
      .filter(t => t.resolution_time_hours)
      .reduce((sum, t) => sum + (t.resolution_time_hours || 0), 0) /
      tickets.filter(t => t.resolution_time_hours).length || 0;
    
    const avgSatisfactionRating = tickets
      .filter(t => t.customer_satisfaction_rating)
      .reduce((sum, t) => sum + (t.customer_satisfaction_rating || 0), 0) /
      tickets.filter(t => t.customer_satisfaction_rating).length || 0;

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      avgResolutionTime: Math.round(avgResolutionTime),
      avgSatisfactionRating: Number(avgSatisfactionRating.toFixed(1))
    };
  }, [tickets]);

  const stats = [
    { 
      label: 'Total Tickets', 
      value: supportStats.totalTickets, 
      icon: MessageSquare, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100 dark:bg-blue-900/20' 
    },
    { 
      label: 'Open', 
      value: supportStats.openTickets, 
      icon: AlertCircle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100 dark:bg-orange-900/20' 
    },
    { 
      label: 'In Progress', 
      value: supportStats.inProgressTickets, 
      icon: Clock, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100 dark:bg-purple-900/20' 
    },
    { 
      label: 'Resolved', 
      value: supportStats.resolvedTickets, 
      icon: CheckCircle2, 
      color: 'text-green-600', 
      bg: 'bg-green-100 dark:bg-green-900/20' 
    },
    { 
      label: 'Avg Resolution', 
      value: `${supportStats.avgResolutionTime}h`, 
      icon: Zap, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100 dark:bg-yellow-900/20' 
    },
    { 
      label: 'Satisfaction', 
      value: `${supportStats.avgSatisfactionRating}/5`, 
      icon: Star, 
      color: 'text-pink-600', 
      bg: 'bg-pink-100 dark:bg-pink-900/20' 
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-orange-100 dark:bg-orange-900/20';
      case 'in_progress': return 'bg-purple-100 dark:bg-purple-900/20';
      case 'waiting_customer': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'resolved': return 'bg-green-100 dark:bg-green-900/20';
      case 'closed': return 'bg-gray-100 dark:bg-gray-700';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 p-4 rounded-xl animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
        
        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-4 w-48"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              className={`${stat.bg} p-4 rounded-xl border border-gray-200 dark:border-gray-600 transition-transform cursor-pointer`}
              onClick={() => {
                if (stat.label === 'Total Tickets' || stat.label === 'Open' || stat.label === 'In Progress' || stat.label === 'Resolved') {
                  onNavigateToTab('tickets');
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
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
        
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
              No tickets yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first support ticket to get help with any issues.
            </p>
            <button
              onClick={() => onNavigateToTab('create-ticket')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.slice(0, 5).map((ticket) => (
              <motion.div
                key={ticket.ticket_id}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                onClick={() => onNavigateToTab('tickets')}
              >
                <div className={`w-3 h-3 rounded-full ${getStatusColor(ticket.status)}`} />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">
                    {ticket.subject}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ticket #{ticket.ticket_number} • Updated {new Date(ticket.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)} text-gray-700 dark:text-gray-300`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </motion.div>
            ))}
            
            {tickets.length > 5 && (
              <button
                onClick={() => onNavigateToTab('tickets')}
                className="w-full text-center py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium transition-colors"
              >
                View all {tickets.length} tickets →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Popular Knowledge Base Articles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Book className="h-5 w-5 text-green-600" />
          Popular Help Articles
        </h2>
        
        {knowledgeBase.length === 0 ? (
          <div className="text-center py-8">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Knowledge base articles will appear here to help you find quick answers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeBase.slice(0, 6).map((article) => (
              <motion.div
                key={article.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => onNavigateToTab('knowledge')}
              >
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {article.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {article.content.substring(0, 100)}...
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {article.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{article.views} views</span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={12} />
                      {article.helpful_votes}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {knowledgeBase.length > 6 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => onNavigateToTab('knowledge')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium transition-colors"
            >
              Browse all articles →
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateToTab('create-ticket')}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
          >
            <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Create Ticket</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Get help with any issue
            </p>
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateToTab('knowledge')}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors group"
          >
            <Book className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Browse Help</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Find answers instantly
            </p>
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateToTab('chat')}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors group"
          >
            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-800 dark:text-gray-200">Live Chat</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Chat with support agent
            </p>
          </motion.button>
        </div>
      </div>
    </div>
  );
}