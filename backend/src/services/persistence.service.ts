import { prisma } from '../config/db';
import { emailQueue, scheduleEmailJob } from '../queues/email.queue';
import { EmailJobPayload } from '../types';

export class PersistenceService {
  /**
   * Reconciles scheduled jobs between the relational database and BullMQ queue upon server boot.
   */
  public static async reconcileJobsOnStartup(): Promise<void> {
    console.log('🔄 [Persistence] Checking database for scheduled jobs to synchronize with BullMQ...');

    try {
      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          status: {
            in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'],
          },
        },
      });

      console.log(`📋 [Persistence] Found ${pendingJobs.length} active scheduled job(s) in database.`);

      let reconciledCount = 0;
      const now = Date.now();

      for (const job of pendingJobs) {
        const scheduledTimeMs = new Date(job.scheduledAt).getTime();
        const remainingDelayMs = Math.max(0, scheduledTimeMs - now);

        const payload: EmailJobPayload = {
          emailJobId: job.id,
          senderEmail: job.senderEmail,
          senderName: job.senderName || undefined,
          recipientEmail: job.recipientEmail,
          recipientName: job.recipientName || undefined,
          subject: job.subject,
          body: job.body,
          scheduledAt: job.scheduledAt.toISOString(),
          delayBetweenMs: job.delayBetweenMs,
          hourlyLimit: job.hourlyLimit,
          batchId: job.batchId || undefined,
          userId: job.userId || undefined,
        };

        await scheduleEmailJob(payload, remainingDelayMs);
        reconciledCount++;
        console.log(
          `   ✨ Synced Job ${job.id} for ${job.recipientEmail} with ${Math.round(remainingDelayMs / 1000)}s delay.`
        );
      }

      console.log(`✅ [Persistence] Reconciled and ensured ${reconciledCount} jobs in BullMQ queue.`);
    } catch (error: any) {
      console.error('❌ [Persistence] Error during startup reconciliation:', error.message);
    }
  }

  /**
   * Starts a continuous background reconciler that checks for any overdue emails every 10 seconds.
   */
  public static startBackgroundReconciler(): void {
    setInterval(async () => {
      try {
        const overdueJobs = await prisma.emailJob.findMany({
          where: {
            status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'] },
            scheduledAt: { lte: new Date() },
          },
        });

        for (const job of overdueJobs) {
          const payload: EmailJobPayload = {
            emailJobId: job.id,
            senderEmail: job.senderEmail,
            senderName: job.senderName || undefined,
            recipientEmail: job.recipientEmail,
            recipientName: job.recipientName || undefined,
            subject: job.subject,
            body: job.body,
            scheduledAt: job.scheduledAt.toISOString(),
            delayBetweenMs: job.delayBetweenMs,
            hourlyLimit: job.hourlyLimit,
            batchId: job.batchId || undefined,
            userId: job.userId || undefined,
          };
          await scheduleEmailJob(payload, 0);
        }
      } catch (err: any) {
        console.error('⚠️ [Persistence] Background reconciliation error:', err.message);
      }
    }, 10000);
  }
}
