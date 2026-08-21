export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export type EmailStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED_RESCHEDULED'
  | 'CANCELLED';

export interface EmailJob {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  delayBetweenMs: number;
  hourlyLimit: number;
  etherealUrl?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  batchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  name?: string | null;
  hourlyLimit: number;
  currentUsage?: number;
  remainingInWindow?: number;
  isActive?: boolean;
}

export interface DashboardStats {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalRescheduled: number;
  activeSendersCount: number;
  hourlySendRate: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
}
