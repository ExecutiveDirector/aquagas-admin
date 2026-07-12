// components/support/CreateTicketForm.tsx
//
// This used to be a self-service "create your own ticket" form dropped
// into the admin panel — but the backend's createTicket endpoint
// attributes a new ticket to whichever role the *logged-in* account has
// (user_id / vendor_id / rider_id), and an admin account has none of
// those. Every ticket created here was silently saved with every
// requester FK left null — unowned and effectively unreachable again.
//
// This is now what it's actually useful for in an admin console: logging
// a ticket on behalf of a customer, vendor, or rider after a phone call
// or email, via the dedicated /tickets/manual endpoint.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, Send, User, Store, Bike, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supportService, type SupportTicket, type ManualTicketData } from './SupportService';

interface LogTicketFormProps {
  onTicketLogged?: () => void;
}

const REQUESTER_TYPES: { value: ManualTicketData['requester_type']; label: string; icon: typeof User }[] = [
  { value: 'user', label: 'Customer', icon: User },
  { value: 'vendor', label: 'Vendor', icon: Store },
  { value: 'rider', label: 'Rider', icon: Bike },
];

const CATEGORY_OPTIONS: { value: SupportTicket['category']; label: string }[] = [
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'delivery_problem', label: 'Delivery Problem' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'product_quality', label: 'Product Quality' },
  { value: 'account_issue', label: 'Account Issue' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'billing_inquiry', label: 'Billing Inquiry' },
  { value: 'other', label: 'Other' },
];

export default function LogTicketForm({ onTicketLogged }: LogTicketFormProps) {
  const [requesterType, setRequesterType] = useState<ManualTicketData['requester_type']>('user');
  const [requesterId, setRequesterId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('other');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRequesterId('');
    setSubject('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
  };

  const handleSubmit = async () => {
    if (!requesterId.trim() || isNaN(Number(requesterId))) {
      toast.error('Enter a valid requester ID');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }

    setSubmitting(true);
    try {
      await supportService.createManualTicket({
        requester_type: requesterType,
        requester_id: Number(requesterId),
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      toast.success('Ticket logged and assigned to you');
      reset();
      onTicketLogged?.();
    } catch (error) {
      console.error('Error logging ticket:', error);
      const message = error instanceof Error ? error.message : 'Failed to log ticket';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <PhoneCall className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Log a Ticket</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record a ticket on behalf of a customer, vendor, or rider — e.g. after a phone call or email.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-4 mb-5 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm text-blue-700 dark:text-blue-400">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>You'll need the requester's ID — find it on their profile in Users, Vendors, or Riders.</p>
        </div>

        <div className="space-y-4">
          {/* Requester type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Who is this for?</label>
            <div className="grid grid-cols-3 gap-2">
              {REQUESTER_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRequesterType(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${
                    requesterType === value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {REQUESTER_TYPES.find(r => r.value === requesterType)?.label} ID
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              placeholder="e.g. 1042"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What did they say? Include anything that will help whoever picks this up."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'Logging...' : 'Log Ticket'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}