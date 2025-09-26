/// supportService.ts
// Use consistent API base URL matching your admin service
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://localhost:4000/api";

export interface SupportTicket {
  ticket_id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category:
    | "order_issue"
    | "delivery_problem"
    | "payment_issue"
    | "product_quality"
    | "account_issue"
    | "technical_support"
    | "billing_inquiry"
    | "other";
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
  support_messages?: SupportMessage[];
}

export interface SupportMessage {
  message_id: number;
  ticket_id: number;
  sender_type: "user" | "rider" | "vendor" | "admin" | "system";
  sender_id?: number;
  sender_name: string;
  message_text: string;
  message_type: "text" | "image" | "file";
  attachments?: string[];
  is_internal: boolean;
  sent_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

export interface KnowledgeBaseItem {
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

export interface CreateTicketData {
  subject: string;
  description: string;
  category: SupportTicket["category"];
  priority?: SupportTicket["priority"];
  related_order_id?: number;
  attachments?: string[];
}

export interface CreateMessageData {
  message_text: string;
  message_type?: "text" | "image" | "file";
  attachments?: string[];
}

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTime: number;
  avgSatisfactionRating: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

class SupportService {
  private getToken(): string | null {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token")
    );
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          errorData.message ||
          `HTTP ${response.status}`
      );
    }

    try {
      const data = await response.json();
      return (data.data || data) as T;
    } catch {
      return {} as T; // handle empty responses
    }
  }

  // Ticket Management
  async createTicket(
    data: CreateTicketData
  ): Promise<{ message: string; data: SupportTicket }> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/support/tickets`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Create ticket error:", error);
      throw error;
    }
  }

  async getUserTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
  }): Promise<SupportTicket[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== "all") params.append(key, value);
        });
      }

      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/user?${params}`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get user tickets error:", error);
      throw error;
    }
  }

  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    user_id?: number;
    vendor_id?: number;
  }): Promise<SupportTicket[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== "all")
            params.append(key, value.toString());
        });
      }

      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets?${params}`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get all tickets error:", error);
      throw error;
    }
  }

  async getTicketDetails(ticketId: number): Promise<SupportTicket> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get ticket details error:", error);
      throw error;
    }
  }

  async updateTicketStatus(
    ticketId: number,
    status: SupportTicket["status"]
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}/status`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ status }),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update ticket status error:", error);
      throw error;
    }
  }

  async assignTicket(
    ticketId: number,
    adminId: number
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}/assign`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ assigned_admin_id: adminId }),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Assign ticket error:", error);
      throw error;
    }
  }

  async rateTicket(
    ticketId: number,
    rating: number
  ): Promise<{ message: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}/rate`,
        {
          method: "PUT",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ customer_satisfaction_rating: rating }),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Rate ticket error:", error);
      throw error;
    }
  }

  // Message Management
  async addMessage(
    ticketId: number,
    data: CreateMessageData
  ): Promise<{ message: string; data: SupportMessage }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Add message error:", error);
      throw error;
    }
  }

  async getTicketMessages(ticketId: number): Promise<SupportMessage[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/tickets/${ticketId}/messages`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get ticket messages error:", error);
      throw error;
    }
  }

  // FAQ Management
  async getFAQs(category?: string): Promise<FAQ[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);

      const response = await fetch(
        `${API_BASE_URL}/v1/support/faq?${params}`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get FAQs error:", error);
      throw error;
    }
  }

  // Knowledge Base Management
  async getKnowledgeBase(
    category?: string,
    search?: string
  ): Promise<KnowledgeBaseItem[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (search) params.append("search", search);

      const response = await fetch(
        `${API_BASE_URL}/v1/support/knowledge-base?${params}`,
        { headers: await this.getAuthHeaders() }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get knowledge base error:", error);
      throw error;
    }
  }

  async getHelpTopics(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/support/help-topics`, {
        headers: await this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get help topics error:", error);
      throw error;
    }
  }

  // Support Statistics (for admin)
  async getSupportStats(): Promise<SupportStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/support/stats`, {
        headers: await this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get support stats error:", error);
      throw error;
    }
  }

  // File Upload
  async uploadAttachment(
    file: File
  ): Promise<{ url: string; filename: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = this.getToken();

      const response = await fetch(
        `${API_BASE_URL}/v1/support/attachments/upload`,
        {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      console.error("Upload attachment error:", error);
      throw error;
    }
  }

  // Utility methods for tracking interactions
  async incrementKnowledgeBaseViews(id: number): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/knowledge-base/${id}/view`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
        }
      );
      await this.handleResponse(response);
    } catch (error) {
      console.error("Error incrementing views:", error);
      // Don't throw error for view tracking
    }
  }

  async incrementFAQHelpful(id: number): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/faq/${id}/helpful`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
        }
      );
      await this.handleResponse(response);
    } catch (error) {
      console.error("Error incrementing FAQ helpful count:", error);
      throw error;
    }
  }

  async voteHelpful(id: number): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/support/knowledge-base/${id}/helpful`,
        {
          method: "POST",
          headers: await this.getAuthHeaders(),
        }
      );
      await this.handleResponse(response);
    } catch (error) {
      console.error("Error voting helpful:", error);
      throw error;
    }
  }

  // Test connection to the support API
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/support/health`, {
        method: "GET",
        headers: await this.getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error("Support service connection test failed:", error);
      return false;
    }
  }
}

export const supportService = new SupportService();
export default supportService;
