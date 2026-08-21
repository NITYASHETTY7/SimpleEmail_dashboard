import { ApiResponse, DashboardStats, EmailJob, SenderAccount, User } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('reachinbox_jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeFetch<T>(url: string, options: RequestInit = {}, defaultData: any = null): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: `HTTP Error ${res.status}` }));
      return { success: false, message: errData.message || 'Request failed', data: defaultData };
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`API Error on ${url}:`, err.message);
    return { success: false, message: err.message, data: defaultData };
  }
}

export const api = {
  // Auth
  async loginWithGoogle(credential: string): Promise<ApiResponse<{ token: string; user: User }>> {
    return safeFetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return safeFetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
  },

  // Stats
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return safeFetch(`${API_BASE}/emails/stats`, {
      headers: { ...getAuthHeader() },
    }, {
      totalScheduled: 0,
      totalSent: 0,
      totalFailed: 0,
      totalRescheduled: 0,
      activeSendersCount: 1,
      hourlySendRate: 0,
    });
  },

  // Scheduled Emails
  async getScheduledEmails(params?: { search?: string; page?: number; limit?: number }): Promise<ApiResponse<EmailJob[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return safeFetch(`${API_BASE}/emails/scheduled?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    }, []);
  },

  // Sent Emails
  async getSentEmails(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<ApiResponse<EmailJob[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return safeFetch(`${API_BASE}/emails/sent?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    }, []);
  },

  // Schedule Single Email
  async scheduleSingleEmail(data: {
    senderEmail?: string;
    senderName?: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenMs?: number;
    hourlyLimit?: number;
  }): Promise<ApiResponse<EmailJob>> {
    return safeFetch(`${API_BASE}/emails/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
  },

  // Batch Schedule Campaign
  async scheduleBatchCampaign(data: {
    senderEmail?: string;
    senderName?: string;
    recipients: Array<{ email: string; name?: string; customFields?: Record<string, string> }>;
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenMs?: number;
    hourlyLimit?: number;
    batchName?: string;
  }): Promise<ApiResponse<any>> {
    return safeFetch(`${API_BASE}/emails/batch-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
  },

  // Lead File Parser
  async parseLeadsFile(file: File): Promise<ApiResponse<{
    validLeads: Array<{ email: string; name?: string; customFields?: Record<string, string> }>;
    invalidCount: number;
    totalCount: number;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return safeFetch(`${API_BASE}/emails/parse-leads`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });
  },

  // Cancel Scheduled Email
  async cancelScheduledEmail(id: string): Promise<ApiResponse<EmailJob>> {
    return safeFetch(`${API_BASE}/emails/scheduled/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  },

  // Delete any email permanently
  async deleteEmail(id: string): Promise<ApiResponse<EmailJob>> {
    return safeFetch(`${API_BASE}/emails/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  },

  // Clear mock sample emails
  async clearMockEmails(): Promise<ApiResponse<any>> {
    return safeFetch(`${API_BASE}/emails/mock-samples`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
  },

  // Senders
  async getSenders(): Promise<ApiResponse<SenderAccount[]>> {
    return safeFetch(`${API_BASE}/emails/senders`, {
      headers: { ...getAuthHeader() },
    }, []);
  },

  async createSender(data: {
    email: string;
    name?: string;
    hourlyLimit?: number;
    smtpHost?: string;
    smtpPort?: number;
  }): Promise<ApiResponse<SenderAccount>> {
    return safeFetch(`${API_BASE}/emails/senders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
  },
};
