/// SupportService.tsx
// Data layer for the admin Support console. This is the single source of
// truth for support API calls — FAQ.tsx, KnowledgeBase.tsx, and
// CreateTicketForm.tsx used to each carry their own copy-pasted client
// with a couple of bugs that had gone unnoticed (missing `/v1` prefix on
// their URLs, and reading the token from `auth_token` when it's actually
// stored under `token` — see authService.ts). Everything now imports this
// one instead.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://localhost:4000/api";

export interface RequesterRef {
  user_id?: number;
  vendor_id?: number;
  rider_id?: number;
  first_name?: string;
  last_name?: string;
  business_name?: string;
}

export interface AssignedAdmin {
  admin_id: number;
  admin_role: string;
  account?: { email: string };
}

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
  user?: RequesterRef;
  vendor?: RequesterRef;
  rider?: RequesterRef;
  assigned_admin?: AssignedAdmin;
  related_order?: { order_id: number; order_number: string };
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
  display_order?: number;
  is_published?: boolean;
}

export interface KnowledgeBaseItem {
  id: number;
  title: string;
  content: string;
  category: string;
  views: number;
  helpful_votes: number;
  tags: string[];
  is_published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  admin_id: number;
  admin_role: string;
  department?: string;
  last_active_at?: string;
  account?: { email: string };
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: SupportTicket["category"];
  priority?: SupportTicket["priority"];
  related_order_id?: number;
  attachments?: string[];
}

export interface ManualTicketData {
  requester_type: "user" | "vendor" | "rider";
  requester_id: number;
  subject: string;
  description: string;
  category: SupportTicket["category"];
  priority?: SupportTicket["priority"];
}

export interface CreateMessageData {
  message: string;
  is_internal?: boolean;
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
    const response = await fetch(`${API_BASE_URL}/v1/support/tickets`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // Ticket logged by an admin on behalf of a customer/vendor/rider (e.g.
  // after a phone call). Distinct from createTicket, which always
  // attributes the ticket to whichever role the *logged-in* account has —
  // an admin has no user_id/vendor_id/rider_id of their own, so calling
  // createTicket as an admin previously created an orphaned, unowned
  // ticket every time.
  async createManualTicket(
    data: ManualTicketData
  ): Promise<{ message: string; data: SupportTicket }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/tickets/manual`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getUserTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
  }): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
    }

    // NOTE: was previously `/v1/support/tickets/user`, which doesn't exist
    // on the backend (the route for a caller's own tickets is just
    // `/v1/support/tickets` — see routes/support.js) and would 404.
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets?${params}`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    user_id?: number;
    vendor_id?: number;
    assigned_admin_id?: number;
    unassigned?: boolean;
  }): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "all" && value !== false)
          params.append(key, value.toString());
      });
    }

    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/all?${params}`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  async getTicketDetails(ticketId: number): Promise<SupportTicket> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  async updateTicketStatus(
    ticketId: number,
    status: SupportTicket["status"]
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/status`,
      {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      }
    );
    return this.handleResponse(response);
  }

  async updateTicketPriority(
    ticketId: number,
    priority: SupportTicket["priority"]
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/priority`,
      {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ priority }),
      }
    );
    return this.handleResponse(response);
  }

  async assignTicket(
    ticketId: number,
    adminId: number
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/assign`,
      {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ assigned_admin_id: adminId }),
      }
    );
    return this.handleResponse(response);
  }

  async rateTicket(
    ticketId: number,
    rating: number
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/rate`,
      {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ customer_satisfaction_rating: rating }),
      }
    );
    return this.handleResponse(response);
  }

  // Message Management
  async addMessage(
    ticketId: number,
    data: CreateMessageData
  ): Promise<{ message: string; data: SupportMessage }> {
    // NOTE: the backend reads `req.body.message` (see
    // supportController.js#addMessage, and the customer Flutter app's
    // support_service.dart, which sends the same key) — this used to send
    // `message_text`, which the backend never read, so every reply typed
    // in the admin panel was silently saved as an empty message.
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/messages`,
      {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return this.handleResponse(response);
  }

  async getTicketMessages(ticketId: number): Promise<SupportMessage[]> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/tickets/${ticketId}/messages`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  // Support agents (assignment dropdown)
  async getAgents(): Promise<Agent[]> {
    const response = await fetch(`${API_BASE_URL}/v1/support/agents`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // FAQ (read)
  async getFAQs(category?: string): Promise<FAQ[]> {
    const params = new URLSearchParams();
    if (category && category !== "all") params.append("category", category);

    const response = await fetch(
      `${API_BASE_URL}/v1/support/faq?${params}`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  // FAQ management (admin)
  async createFAQ(data: {
    question: string;
    answer: string;
    category: string;
    display_order?: number;
  }): Promise<{ message: string; data: FAQ }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/faq`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateFAQ(
    id: number,
    data: Partial<Pick<FAQ, "question" | "answer" | "category" | "display_order" | "is_published">>
  ): Promise<{ message: string; data: FAQ }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/faq/${id}`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteFAQ(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/faq/${id}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Knowledge Base (read)
  async getKnowledgeBase(
    category?: string,
    search?: string
  ): Promise<KnowledgeBaseItem[]> {
    const params = new URLSearchParams();
    if (category && category !== "all") params.append("category", category);
    if (search) params.append("search", search);

    const response = await fetch(
      `${API_BASE_URL}/v1/support/knowledge-base?${params}`,
      { headers: await this.getAuthHeaders() }
    );
    return this.handleResponse(response);
  }

  // Knowledge Base management (admin)
  async createKBArticle(data: {
    title: string;
    content: string;
    category: string;
    tags?: string[];
  }): Promise<{ message: string; data: KnowledgeBaseItem }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/knowledge-base`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateKBArticle(
    id: number,
    data: Partial<Pick<KnowledgeBaseItem, "title" | "content" | "category" | "tags" | "is_published">>
  ): Promise<{ message: string; data: KnowledgeBaseItem }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/knowledge-base/${id}`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteKBArticle(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/v1/support/knowledge-base/${id}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getHelpTopics(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/v1/support/help-topics`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Support Statistics (admin)
  async getSupportStats(): Promise<SupportStats> {
    const response = await fetch(`${API_BASE_URL}/v1/support/stats`, {
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // File Upload
  async uploadAttachment(
    file: File
  ): Promise<{ url: string; filename: string }> {
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
    const response = await fetch(
      `${API_BASE_URL}/v1/support/faq/${id}/helpful`,
      {
        method: "POST",
        headers: await this.getAuthHeaders(),
      }
    );
    await this.handleResponse(response);
  }

  async voteHelpful(id: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/v1/support/knowledge-base/${id}/helpful`,
      {
        method: "POST",
        headers: await this.getAuthHeaders(),
      }
    );
    await this.handleResponse(response);
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
