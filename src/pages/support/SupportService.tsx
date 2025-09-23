// services/supportService.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface SupportTicket {
  ticket_id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'order_issue' | 'delivery_problem' | 'payment_issue' | 'product_quality' | 'account_issue' | 'technical_support' | 'billing_inquiry' | 'other';
  user_id?: number;
  vendor_id?: number;
  rider_id?: number;
  assigned_admin_id?: number;
  related_order_id?: number;
  resolution?: string;
  resolution_time_hours?: number;
  customer_satisfaction_rating?: number;
  attachments?: string[];
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  message_id: number;
  ticket_id: number;
  sender_type: 'user' | 'rider' | 'vendor' | 'admin' | 'system';
  sender_id?: number;
  sender_name: string;
  message_text: string;
  message_type: 'text' | 'image' | 'file';
  attachments?: string[];
  is_internal: boolean;
  sent_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: SupportTicket['category'];
  priority?: SupportTicket['priority'];
  related_order_id?: number;
  attachments?: string[];
}

export interface CreateMessageData {
  message_text: string;
  message_type?: 'text' | 'image' | 'file';
  attachments?: string[];
}

class SupportService {
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

  // Ticket Management
  async createTicket(data: CreateTicketData): Promise<{ message: string; data: SupportTicket }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getUserTickets(): Promise<SupportTicket[]> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/user`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: SupportTicket[] } | SupportTicket[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    user_id?: number;
    vendor_id?: number;
  }): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${API_BASE_URL}/support/tickets?${params}`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: SupportTicket[] } | SupportTicket[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  async getTicketDetails(ticketId: number): Promise<SupportTicket & { support_messages?: SupportMessage[] }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: any } | any>(response);
    return result.data || result;
  }

  async updateTicketStatus(ticketId: number, status: SupportTicket['status']): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse(response);
  }

  async assignTicket(ticketId: number, adminId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/assign`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ assigned_admin_id: adminId }),
    });
    return this.handleResponse(response);
  }

  async rateTicket(ticketId: number, rating: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/rate`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ customer_satisfaction_rating: rating }),
    });
    return this.handleResponse(response);
  }

  // Message Management
  async addMessage(ticketId: number, data: CreateMessageData): Promise<{ message: string; data: SupportMessage }> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getTicketMessages(ticketId: number): Promise<SupportMessage[]> {
    const response = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}/messages`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: SupportMessage[] } | SupportMessage[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  // FAQ and Knowledge Base
  async getFAQs(): Promise<Array<{ id: number; question: string; answer: string; category: string; helpful_count: number }>> {
    const response = await fetch(`${API_BASE_URL}/support/faq`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: any[] } | any[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  async getHelpTopics(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/support/help-topics`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: string[] } | string[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  async searchKnowledgeBase(query: string): Promise<Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    views: number;
    helpful_votes: number;
    tags: string[];
  }>> {
    const response = await fetch(`${API_BASE_URL}/support/knowledge-base/search?q=${encodeURIComponent(query)}`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: any[] } | any[]>(response);
    return Array.isArray(result) ? result : (result.data || []);
  }

  // Support Statistics (for admin)
  async getSupportStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    avgResolutionTime: number;
    avgSatisfactionRating: number;
    ticketsByCategory: Record<string, number>;
    ticketsByPriority: Record<string, number>;
  }> {
    const response = await fetch(`${API_BASE_URL}/support/stats`, {
      headers: await this.getAuthHeaders(),
    });
    const result = await this.handleResponse<{ data?: any } | any>(response);
    return result.data || result;
  }

  // File Upload
  async uploadAttachment(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/support/attachments/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    return this.handleResponse(response);
  }

  // Real-time notifications (WebSocket connection)
  connectToTicketUpdates(ticketId: number, onMessage: (message: any) => void): WebSocket | null {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (!token) return null;

    const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/support/tickets/${ticketId}/ws?token=${token}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }
}

export const supportService = new SupportService();
export default supportService;