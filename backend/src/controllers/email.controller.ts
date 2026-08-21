import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { EmailService } from '../services/email.service';
import { RateLimiterService } from '../services/rateLimiter.service';
import { prisma } from '../config/db';
import { env } from '../config/env';

export class EmailController {
  /**
   * Schedule a single email
   */
  public static async scheduleEmail(req: AuthRequest, res: Response) {
    try {
      const { senderEmail, senderName, recipientEmail, recipientName, subject, body, scheduledAt, delayBetweenMs, hourlyLimit } = req.body;

      if (!recipientEmail || !subject || !body || !scheduledAt) {
        return res.status(400).json({
          success: false,
          message: 'recipientEmail, subject, body, and scheduledAt are required fields.',
        });
      }

      const job = await EmailService.scheduleEmail(
        {
          senderEmail,
          senderName,
          recipientEmail,
          recipientName,
          subject,
          body,
          scheduledAt,
          delayBetweenMs,
          hourlyLimit,
        },
        req.user?.id
      );

      return res.status(201).json({
        success: true,
        message: 'Email scheduled successfully',
        data: job,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Schedule batch emails (e.g. from lead upload)
   */
  public static async batchSchedule(req: AuthRequest, res: Response) {
    try {
      const { senderEmail, senderName, recipients, subject, body, scheduledAt, delayBetweenMs, hourlyLimit, batchName } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'recipients must be a non-empty array',
        });
      }

      if (!subject || !body || !scheduledAt) {
        return res.status(400).json({
          success: false,
          message: 'subject, body, and scheduledAt are required fields.',
        });
      }

      const result = await EmailService.batchScheduleEmails(
        {
          senderEmail,
          senderName,
          recipients,
          subject,
          body,
          scheduledAt,
          delayBetweenMs,
          hourlyLimit,
          batchName,
        },
        req.user?.id
      );

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${result.totalScheduled} emails`,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Parse uploaded lead file (CSV/TXT)
   */
  public static async parseLeadsFile(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const result = EmailService.parseLeadsFile(fileContent);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get scheduled emails list
   */
  public static async getScheduledEmails(req: AuthRequest, res: Response) {
    try {
      const search = req.query.search as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const isSuperAdmin = req.user?.email?.toLowerCase().includes('superadmin');

      const result = await EmailService.getScheduledEmails({
        userId: isSuperAdmin ? undefined : req.user?.id,
        search,
        page,
        limit,
      });

      return res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get sent/failed emails list
   */
  public static async getSentEmails(req: AuthRequest, res: Response) {
    try {
      const search = req.query.search as string;
      const statusFilter = req.query.status as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const isSuperAdmin = req.user?.email?.toLowerCase().includes('superadmin');

      const result = await EmailService.getSentEmails({
        userId: isSuperAdmin ? undefined : req.user?.id,
        search,
        statusFilter,
        page,
        limit,
      });

      return res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Cancel a scheduled email
   */
  public static async cancelScheduledEmail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await EmailService.cancelScheduledEmail(id);

      return res.json({
        success: true,
        message: 'Email cancelled successfully',
        data: job,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete an email permanently
   */
  public static async deleteEmail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await EmailService.deleteEmail(id);

      return res.json({
        success: true,
        message: 'Email deleted successfully',
        data: job,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete mock sample emails
   */
  public static async deleteMockSamples(req: AuthRequest, res: Response) {
    try {
      const result = await EmailService.deleteMockSamples();
      return res.json({
        success: true,
        message: 'Mock emails cleared',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get dashboard metrics and stats
   */
  public static async getStats(req: AuthRequest, res: Response) {
    try {
      const isSuperAdmin = req.user?.email?.toLowerCase().includes('superadmin');
      const stats = await EmailService.getStats(isSuperAdmin ? undefined : req.user?.id);
      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List sender accounts and rate limit status
   */
  public static async getSenders(req: AuthRequest, res: Response) {
    try {
      const senders = await prisma.senderAccount.findMany({
        where: { isActive: true },
      });

      // If no senders in DB, return default sender
      if (senders.length === 0) {
        const defaultSenderUsage = await RateLimiterService.getSenderUsage(env.DEFAULT_SENDER_EMAIL);
        return res.json({
          success: true,
          data: [
            {
              id: 'default',
              email: env.DEFAULT_SENDER_EMAIL,
              name: env.DEFAULT_SENDER_NAME,
              hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
              currentUsage: defaultSenderUsage.count,
              remainingInWindow: defaultSenderUsage.remaining,
            },
          ],
        });
      }

      const sendersWithUsage = await Promise.all(
        senders.map(async (sender) => {
          const usage = await RateLimiterService.getSenderUsage(sender.email);
          return {
            ...sender,
            currentUsage: usage.count,
            remainingInWindow: usage.remaining,
          };
        })
      );

      return res.json({
        success: true,
        data: sendersWithUsage,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Add a new sender account
   */
  public static async createSender(req: AuthRequest, res: Response) {
    try {
      const { email, name, hourlyLimit, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'email is required' });
      }

      const sender = await prisma.senderAccount.upsert({
        where: { email },
        update: {
          name,
          hourlyLimit: hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
        },
        create: {
          email,
          name,
          hourlyLimit: hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER,
          smtpHost: smtpHost || 'smtp.ethereal.email',
          smtpPort: smtpPort || 587,
          smtpUser,
          smtpPass,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Sender account configured successfully',
        data: sender,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
