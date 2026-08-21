import { prisma } from '../config/db';
import { env } from '../config/env';
import { scheduleEmailJob, cancelBullMQJob } from '../queues/email.queue';
import {
  ScheduleEmailInput,
  BatchScheduleInput,
  EmailJobPayload,
  DashboardStats,
} from '../types';
import Papa from 'papaparse';

export class EmailService {
  /**
   * Schedule a single email
   */
  public static async scheduleEmail(input: ScheduleEmailInput, userId?: string) {
    const senderEmail = input.senderEmail || env.DEFAULT_SENDER_EMAIL;
    const scheduledDate = new Date(input.scheduledAt);
    const now = Date.now();
    const delayMs = Math.max(0, scheduledDate.getTime() - now);
    const delayBetweenMs = input.delayBetweenMs ?? env.MIN_DELAY_BETWEEN_EMAILS_MS;
    const hourlyLimit = input.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // 1. Create DB record
    const emailJob = await prisma.emailJob.create({
      data: {
        userId,
        senderEmail,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        body: input.body,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
        delayBetweenMs,
        hourlyLimit,
        bullmqJobId: '', // Will be updated
      },
    });

    const deterministicJobId = `email-${emailJob.id}`;

    // 2. Schedule in BullMQ
    const payload: EmailJobPayload = {
      emailJobId: emailJob.id,
      senderEmail,
      senderName: input.senderName || env.DEFAULT_SENDER_NAME,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      subject: input.subject,
      body: input.body,
      scheduledAt: scheduledDate.toISOString(),
      delayBetweenMs,
      hourlyLimit,
      userId,
    };

    await scheduleEmailJob(payload, delayMs);

    // 3. Update job record with bullmqJobId
    const updated = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullmqJobId: deterministicJobId },
    });

    return updated;
  }

  /**
   * Batch schedule emails from uploaded leads/CSV with staggered delays
   */
  public static async batchScheduleEmails(input: BatchScheduleInput, userId?: string) {
    const senderEmail = input.senderEmail || env.DEFAULT_SENDER_EMAIL;
    const baseScheduledTime = new Date(input.scheduledAt).getTime();
    const delayBetweenMs = input.delayBetweenMs ?? env.MIN_DELAY_BETWEEN_EMAILS_MS;
    const hourlyLimit = input.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // 1. Create Batch record
    const batch = await prisma.emailBatch.create({
      data: {
        userId,
        name: input.batchName || `Campaign - ${new Date().toLocaleDateString()}`,
        totalLeads: input.recipients.length,
        scheduledCount: input.recipients.length,
      },
    });

    const createdJobs = [];
    const now = Date.now();

    // 2. Iterate and create scheduled jobs with staggered start times based on delayBetweenMs
    for (let i = 0; i < input.recipients.length; i++) {
      const recipient = input.recipients[i];
      // Stagger each lead's send time by delayBetweenMs
      const leadScheduledTime = new Date(baseScheduledTime + i * delayBetweenMs);
      const delayMs = Math.max(0, leadScheduledTime.getTime() - now);

      // Variable substitution (e.g. {{name}}, {{email}})
      let personalizedSubject = input.subject;
      let personalizedBody = input.body;

      personalizedSubject = personalizedSubject.replace(/\{\{email\}\}/gi, recipient.email);
      personalizedBody = personalizedBody.replace(/\{\{email\}\}/gi, recipient.email);

      if (recipient.name) {
        personalizedSubject = personalizedSubject.replace(/\{\{name\}\}/gi, recipient.name);
        personalizedBody = personalizedBody.replace(/\{\{name\}\}/gi, recipient.name);
      }

      if (recipient.customFields) {
        for (const [key, val] of Object.entries(recipient.customFields)) {
          const reg = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
          personalizedSubject = personalizedSubject.replace(reg, val);
          personalizedBody = personalizedBody.replace(reg, val);
        }
      }

      const emailJob = await prisma.emailJob.create({
        data: {
          userId,
          batchId: batch.id,
          senderEmail,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: personalizedSubject,
          body: personalizedBody,
          status: 'SCHEDULED',
          scheduledAt: leadScheduledTime,
          delayBetweenMs,
          hourlyLimit,
        },
      });

      const deterministicJobId = `email-${emailJob.id}`;

      const payload: EmailJobPayload = {
        emailJobId: emailJob.id,
        senderEmail,
        senderName: input.senderName || env.DEFAULT_SENDER_NAME,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: personalizedSubject,
        body: personalizedBody,
        scheduledAt: leadScheduledTime.toISOString(),
        delayBetweenMs,
        hourlyLimit,
        batchId: batch.id,
        userId,
      };

      await scheduleEmailJob(payload, delayMs);

      await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: { bullmqJobId: deterministicJobId },
      });

      createdJobs.push(emailJob);
    }

    return {
      batch,
      totalScheduled: createdJobs.length,
      firstScheduledAt: new Date(baseScheduledTime).toISOString(),
      lastScheduledAt: new Date(baseScheduledTime + (input.recipients.length - 1) * delayBetweenMs).toISOString(),
    };
  }

  /**
   * Parse CSV/TXT file content to extract valid email addresses and metadata
   */
  public static parseLeadsFile(fileContent: string): {
    validLeads: Array<{ email: string; name?: string; customFields?: Record<string, string> }>;
    invalidCount: number;
    totalCount: number;
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const parsed = Papa.parse<Record<string, string>>(fileContent.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    const validLeads: Array<{ email: string; name?: string; customFields?: Record<string, string> }> = [];
    let invalidCount = 0;

    if (parsed.data && parsed.data.length > 0) {
      for (const row of parsed.data) {
        // Find email column (case-insensitive search for 'email', 'e-mail', 'mail', or first column)
        const emailKey = Object.keys(row).find((k) => /email|e-mail|mail/i.test(k.trim())) || Object.keys(row)[0];
        const nameKey = Object.keys(row).find((k) => /name|firstname|first_name|fullName/i.test(k.trim()));

        const rawEmail = row[emailKey]?.trim();
        if (rawEmail && emailRegex.test(rawEmail)) {
          const leadName = nameKey ? row[nameKey]?.trim() : undefined;
          validLeads.push({
            email: rawEmail,
            name: leadName,
            customFields: row,
          });
        } else {
          invalidCount++;
        }
      }
    } else {
      // Fallback: plaintext line-by-line parsing
      const lines = fileContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match && emailRegex.test(match[0])) {
          validLeads.push({ email: match[0] });
        } else {
          invalidCount++;
        }
      }
    }

    return {
      validLeads,
      invalidCount,
      totalCount: validLeads.length + invalidCount,
    };
  }

  /**
   * Get scheduled emails list
   */
  public static async getScheduledEmails(params: {
    userId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED_RESCHEDULED'] },
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.search) {
      where.AND = [
        ...(params.userId ? [{ userId: params.userId }] : []),
        {
          OR: [
            { recipientEmail: { contains: params.search } },
            { subject: { contains: params.search } },
            { senderEmail: { contains: params.search } },
          ],
        },
      ];
      delete where.userId;
    }

    const [items, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get sent emails list
   */
  public static async getSentEmails(params: {
    userId?: string;
    search?: string;
    statusFilter?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const allowedStatuses = params.statusFilter ? [params.statusFilter] : ['SENT', 'FAILED', 'CANCELLED'];
    const where: any = {
      status: { in: allowedStatuses },
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.search) {
      where.AND = [
        ...(params.userId ? [{ userId: params.userId }] : []),
        {
          OR: [
            { recipientEmail: { contains: params.search } },
            { subject: { contains: params.search } },
            { senderEmail: { contains: params.search } },
          ],
        },
      ];
      delete where.userId;
    }

    const [items, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel a scheduled email
   */
  public static async cancelScheduledEmail(id: string) {
    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      throw new Error('Email job not found');
    }

    if (job.status !== 'SCHEDULED' && job.status !== 'RATE_LIMITED_RESCHEDULED') {
      throw new Error(`Cannot cancel email with status: ${job.status}`);
    }

    // Cancel in BullMQ
    if (job.bullmqJobId) {
      await cancelBullMQJob(job.bullmqJobId);
    }

    // Update in DB
    const updated = await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }

  /**
   * Delete an email record permanently
   */
  public static async deleteEmail(id: string) {
    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      throw new Error('Email not found');
    }
    if (job.bullmqJobId) {
      await cancelBullMQJob(job.bullmqJobId).catch(() => {});
    }
    return prisma.emailJob.delete({ where: { id } });
  }

  /**
   * Delete sample mock emails
   */
  public static async deleteMockSamples() {
    return prisma.emailJob.deleteMany({
      where: {
        etherealUrl: {
          contains: 'sample-preview',
        },
      },
    });
  }

  /**
   * Get Dashboard stats summary
   */
  public static async getStats(userId?: string): Promise<DashboardStats> {
    const userFilter = userId ? { userId } : {};

    const [scheduled, sent, failed, rescheduled, senders] = await Promise.all([
      prisma.emailJob.count({
        where: { ...userFilter, status: { in: ['SCHEDULED', 'PROCESSING'] } },
      }),
      prisma.emailJob.count({
        where: { ...userFilter, status: 'SENT' },
      }),
      prisma.emailJob.count({
        where: { ...userFilter, status: 'FAILED' },
      }),
      prisma.emailJob.count({
        where: { ...userFilter, status: 'RATE_LIMITED_RESCHEDULED' },
      }),
      prisma.senderAccount.count({
        where: { isActive: true },
      }),
    ]);

    // Calculate sent in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlySentCount = await prisma.emailJob.count({
      where: {
        ...userFilter,
        status: 'SENT',
        sentAt: { gte: oneHourAgo },
      },
    });

    return {
      totalScheduled: scheduled,
      totalSent: sent,
      totalFailed: failed,
      totalRescheduled: rescheduled,
      activeSendersCount: Math.max(1, senders),
      hourlySendRate: hourlySentCount,
    };
  }
}
