import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Clock, CheckCircle2, Inbox,
  TrendingUp, UserX, ArrowRight, Star, BookOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { SupportTicket, KnowledgeBaseItem, SupportStats } from './SupportService';

interface SupportOverviewProps {
  tickets: SupportTicket[];
  knowledgeBase: KnowledgeBaseItem[];
  stats: SupportStats | null;
  loading: boolean;
  onNavigateToTab: (tab: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  order_issue: 'Order Issue',
  delivery_problem: 'Delivery Problem',
  payment_issue: 'Payment Issue',
  product_quality: 'Product Quality',
  account_issue: 'Account Issue',
  technical_support: 'Technical Support',
  billing_inquiry: 'Billing Inquiry',
  other: 'Other',
};

export default function SupportOverview({
  tickets,
  knowledgeBase,
  stats,
  loading,
  onNavigateToTab,
}: SupportOverviewProps) {
  const derived = useMemo(() => {
    const openStatuses: SupportTicket['status'][] = ['open', 'in_progress', 'waiting_customer'];
    const active = tickets.filter(t => openStatuses.includes(t.status));
    const urgent = active.filter(t => t.priority === 'urgent');
    const unassigned = active.filter(t => !t.assigned_admin_id);
    const resolvedToday = tickets.filter(t => {
      if (t.status !== 'resolved' && t.status !== 'closed') return false;
      const resolvedDate = t.resolved_at || t.closed_at || t.updated_at;
      return resolvedDate && new Date(resolvedDate).toDateString() === new Date().toDateString();
    });

    const byCategory: Record<string, number> = {};
    active.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    const chartData = Object.entries(byCategory)
      .map(([category, count]) => ({ name: CATEGORY_LABELS[category] || category, count }))
      .sort((a, b) => b.count - a.count);

    return { active, urgent, unassigned, resolvedToday, chartData };
  }, [tickets]);

  const avgRating = stats?.avgSatisfactionRating;
  const avgResolution = stats?.avgResolutionTime;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-12 text-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attention-needed callouts */}
      {(derived.urgent.length > 0 || derived.unassigned.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {derived.urgent.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onNavigateToTab('tickets')}
              className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{derived.urgent.length}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">Urgent ticket{derived.urgent.length !== 1 ? 's' : ''} need attention</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-red-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          )}

          {derived.unassigned.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => onNavigateToTab('tickets')}
              className="text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{derived.unassigned.length}</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Unassigned open ticket{derived.unassigned.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          )}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Inbox size={16} />
            <span className="text-sm">Active Tickets</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{derived.active.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <CheckCircle2 size={16} />
            <span className="text-sm">Resolved Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{derived.resolvedToday.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock size={16} />
            <span className="text-sm">Avg Resolution</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgResolution ? `${avgResolution.toFixed(1)}h` : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Star size={16} />
            <span className="text-sm">Avg Satisfaction</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgRating ? `${avgRating.toFixed(1)}/5` : '—'}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Open Tickets by Category</h3>
        </div>
        {derived.chartData.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
            No open tickets right now — the queue is clear.
          </div>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={derived.chartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigateToTab('tickets')}
          className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Go to Tickets</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review, assign, and respond</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('knowledge')}
          className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Knowledge Base</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{knowledgeBase.length} published article{knowledgeBase.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}