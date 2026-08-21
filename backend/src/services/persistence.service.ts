import { prisma } from '../config/db';
import { emailQueue, scheduleEmailJob } from '../queues/email.queue';
import { EmailJobPayload } from '../types';

export class PersistenceService {
  /**
   * Reconciles scheduled jobs between the relational database and BullMQ queue upon server boot.
   * Ensures that:
   * 1. Future scheduled emails are queued with their accurate remaining delay.
   * 2. Any jobs that were pending while the server was down are processed.
   * 3. Already sent/cancelled jobs are NEVER duplicated or re-queued.
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
        const deterministicJobId = `email-${job.id}`;
        const existingBullJob = await emailQueue.getJob(deterministicJobId);

        if (!existingBullJob) {
          const scheduledTimeMs = new Date(job.scheduledAt).getTime();
          const remainingDelayMs = Math.max(0, scheduledTimeMs - now);

          const payload: EmailJobPayload = {
            emailJobId: job.id,
            senderEmail: job.senderEmail,
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
            `   ✨ Re-enqueued Job ${job.id} for ${job.recipientEmail} with ${Math.round(remainingDelayMs / 1000)}s delay.`
          );
        }
      }

      console.log(`✅ [Persistence] Reconciled and ensured ${reconciledCount} jobs in BullMQ queue.`);
    } catch (error: any) {
      console.error('❌ [Persistence] Error during startup reconciliation:', error.message);
    }
  }
}
