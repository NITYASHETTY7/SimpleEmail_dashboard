export interface EmailJobPayload {
  emailJobId: string;
  senderEmail: string;
  senderName?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO string
  delayBetweenMs: number;
  hourlyLimit: number;
  batchId?: string;
  userId?: string;
}

export type EmailJobStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED_RESCHEDULED'
  | 'CANCELLED';

export interface ScheduleEmailInput {
  senderEmail?: string;
  senderName?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  delayBetweenMs?: number;
  hourlyLimit?: number;
}

export interface BatchScheduleInput {
  senderEmail?: string;
  senderName?: string;
  recipients: Array<{
    email: string;
    name?: string;
    customFields?: Record<string, string>;
  }>;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  delayBetweenMs?: number;
  hourlyLimit?: number;
  batchName?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  googleId?: string | null;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  rescheduleDelayMs: number;
}

export interface DashboardStats {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalRescheduled: number;
  activeSendersCount: number;
  hourlySendRate: number;
}
