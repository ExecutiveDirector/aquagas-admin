import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, AlertCircle, Paperclip, Trash2, Upload, 
  FileText, Image, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface CreateTicketData {
  subject: string;
  description: string;
  category: 'order_issue' | 'delivery_problem' | 'payment_issue' | 'product_quality' | 'account_issue' | 'technical_support' | 'billing_inquiry' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  related_order_id?: number;
  attachments?: string[];
}

interface SupportTicket {
  ticket_id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
}

// Support service for API calls
class SupportService {
  private API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

  async createTicket(data: CreateTicketData): Promise<{ message: string; data: SupportTicket }> {
    const response = await fetch(`${this.API_BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async uploadAttachment(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const response = await fetch(`${this.API_BASE_URL}/support/attachments/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    return this.handleResponse(response);
  }
}

const supportService = new SupportService();

// Main Component
interface CreateTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
}

export default function CreateTicketForm({ 
  isOpen, 
  onClose, 
  onTicketCreated 
}: CreateTicketFormProps) {
  // Form state
  const [formData, setFormData] = useState<CreateTicketData>({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });

  // UI state
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateTicketData>>({});
  const [dragActive, setDragActive] = useState(false);

  // Configuration
  const categories = [
    { 
      value: 'order_issue', 
      label: 'Order Issue', 
      description: 'Problems with your orders, items, or order processing',
      icon: '📦'
    },
    { 
      value: 'delivery_problem', 
      label: 'Delivery Problem', 
      description: 'Issues with delivery timing, rider, or delivery process',
      icon: '🚚'
    },
    { 
      value: 'payment_issue', 
      label: 'Payment Issue', 
      description: 'Billing problems, payment failures, or refund requests',
      icon: '💳'
    },
    { 
      value: 'product_quality', 
      label: 'Product Quality', 
      description: 'Issues with product condition, quality, or freshness',
      icon: '⭐'
    },
    { 
      value: 'account_issue', 
      label: 'Account Issue', 
      description: 'Problems with your account, login, or profile settings',
      icon: '👤'
    },
    { 
      value: 'technical_support', 
      label: 'Technical Support', 
      description: 'App bugs, website issues, or technical difficulties',
      icon: '🔧'
    },
    { 
      value: 'billing_inquiry', 
      label: 'Billing Inquiry', 
      description: 'Questions about charges, invoices, or payment history',
      icon: '💰'
    },
    { 
      value: 'other', 
      label: 'Other', 
      description: 'General inquiries or issues not covered above',
      icon: '❓'
    },
  ];

  const priorities = [
    { 
      value: 'low', 
      label: 'Low', 
      description: 'General question or minor issue that can wait',
      color: 'text-green-600'
    },
    { 
      value: 'medium', 
      label: 'Medium', 
      description: 'Standard issue that needs attention within 24 hours',
      color: 'text-yellow-600'
    },
    { 
      value: 'high', 
      label: 'High', 
      description: 'Important issue affecting your service experience',
      color: 'text-orange-600'
    },
    { 
      value: 'urgent', 
      label: 'Urgent', 
      description: 'Critical issue requiring immediate attention',
      color: 'text-red-600'
    },
  ];

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<CreateTicketData> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (formData.subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters long';
    } else if (formData.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // File handling
  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 5MB.`);
        return false;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        return false;
      }

      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let attachmentUrls: string[] = [];
      
      // Upload attachments if any
      if (attachments.length > 0) {
        setUploading(true);
        attachmentUrls = await Promise.all(
          attachments.map(async (file) => {
            try {
              const result = await supportService.uploadAttachment(file);
              return result.url;
            } catch (error) {
              console.error(`Failed to upload ${file.name}:`, error);
              throw new Error(`Failed to upload ${file.name}`);
            }
          })
        );
        setUploading(false);
      }

      // Create ticket
      const ticketData: CreateTicketData = {
        ...formData,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      };

      const result = await supportService.createTicket(ticketData);
      
      toast.success('Support ticket created successfully');
      
      // Reset form
      setFormData({ 
        subject: '', 
        description: '', 
        category: 'other', 
        priority: 'medium' 
      });
      setAttachments([]);
      setErrors({});
      
      // Notify parent and close
      onTicketCreated();
      onClose();
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({ 
        subject: '', 
        description: '', 
        category: 'other', 
        priority: 'medium' 
      });
      setAttachments([]);
      setErrors({});
      setDragActive(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCategory = categories.find(cat => cat.value === formData.category);
  const selectedPriority = priorities.find(pri => pri.value === formData.priority);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Create Support Ticket
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Describe your issue and we'll help you resolve it
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-80px)]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Brief summary of your issue"
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.subject && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={16} /> {errors.subject}
                    </p>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formData.subject.length}/200
                  </span>
                </div>
              </div>

              {/* Category and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CreateTicketData['category'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {selectedCategory.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority *
                  </label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as CreateTicketData['priority'] })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {priorities.map((pri) => (
                      <option key={pri.value} value={pri.value}>
                        {pri.label}
                      </option>
                    ))}
                  </select>
                  {selectedPriority && (
                    <p className={`text-xs mt-1 ${selectedPriority.color}`}>
                      {selectedPriority.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Please provide a detailed description of your issue, including steps to reproduce if applicable..."
                  maxLength={2000}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={16} /> {errors.description}
                    </p>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formData.description.length}/2000
                  </span>
                </div>
              </div>

              {/* Related Order ID */}
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Related Order ID (Optional)
                </label>
                <input
                  id="orderId"
                  type="number"
                  value={formData.related_order_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    related_order_id: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="If this is related to a specific order, enter the order ID"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments (Optional)
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.txt"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"
                  >
                    <Paperclip size={16} />
                    Choose Files
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Max 5 files, 5MB each. Supported: JPG, PNG, GIF, PDF, TXT
                  </p>
                </div>

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Attached Files:
                    </h4>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <Image size={16} className="text-blue-600" />
                          ) : (
                            <FileText size={16} className="text-gray-600" />
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          disabled={uploading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-600 flex gap-3">
              <button
                type="submit"
                disabled={submitting || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uploading ? 'Uploading Files...' : 'Creating Ticket...'}
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Create Ticket
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}