import { Worker, Job } from 'bullmq';
import { createRedisClient } from '../config/redis';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { getTransporterForSender, getPreviewUrl } from '../config/mailer';
import { RateLimiterService } from '../services/rateLimiter.service';
import { EMAIL_QUEUE_NAME, scheduleEmailJob } from './email.queue';
import { EmailJobPayload } from '../types';

export function setupEmailWorker() {
  console.log(`🚀 [Worker] Initializing BullMQ Worker with concurrency = ${env.WORKER_CONCURRENCY}`);

  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { emailJobId, senderEmail, senderName, recipientEmail, recipientName, subject, body, delayBetweenMs, hourlyLimit, batchId } =
        job.data;

      console.log(`\n📨 [Worker] Processing Job #${job.id} -> Recipient: ${recipientEmail} from ${senderEmail}`);

      // 1. Fetch current status from DB
      const dbJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
      });

      if (!dbJob) {
        console.warn(`⚠️ [Worker] Email job ${emailJobId} not found in database. Skipping.`);
        return { status: 'skipped', reason: 'job_not_found' };
      }

      if (dbJob.status === 'CANCELLED') {
        console.log(`🛑 [Worker] Email job ${emailJobId} was cancelled by user. Skipping.`);
        return { status: 'cancelled' };
      }

      // 2. Mark job as PROCESSING
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'PROCESSING' },
      });

      // 3. Check Hourly Rate Limit
      const rateLimitResult = await RateLimiterService.checkAndConsumeToken(senderEmail, hourlyLimit);

      if (!rateLimitResult.allowed) {
        const nextRunDate = new Date(Date.now() + rateLimitResult.rescheduleDelayMs);
        console.warn(
          `⏳ [Worker] Rate limit hit for sender ${senderEmail}. Rescheduling job ${emailJobId} to ${nextRunDate.toISOString()} (+${Math.round(
            rateLimitResult.rescheduleDelayMs / 1000
          )}s)`
        );

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED_RESCHEDULED',
            scheduledAt: nextRunDate,
            errorMessage: `Hourly limit of ${rateLimitResult.limit} reached. Rescheduled to next hour window.`,
          },
        });

        await scheduleEmailJob(
          {
            ...job.data,
            scheduledAt: nextRunDate.toISOString(),
          },
          rateLimitResult.rescheduleDelayMs
        );

        return {
          status: 'rescheduled',
          rescheduledAt: nextRunDate.toISOString(),
          delayMs: rateLimitResult.rescheduleDelayMs,
        };
      }

      // 4. Provider Send Delay
      const throttleDelay = delayBetweenMs || env.MIN_DELAY_BETWEEN_EMAILS_MS;
      if (throttleDelay > 0) {
        console.log(`⏱️ [Worker] Applying throttle delay of ${throttleDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, throttleDelay));
      }

      // 5. Send email via Ethereal SMTP
      try {
        const transporter = await getTransporterForSender(senderEmail);
        const fromHeader = senderName ? `"${senderName}" <${senderEmail}>` : senderEmail;
        const toHeader = recipientName ? `"${recipientName}" <${recipientEmail}>` : recipientEmail;

        const info = await transporter.sendMail({
          from: fromHeader,
          to: toHeader,
          subject: subject,
          html: body,
          text: body.replace(/<[^>]*>?/gm, ''),
        });

        const previewUrl = getPreviewUrl(info) || undefined;

        console.log(`✅ [Worker] Email SENT successfully to ${recipientEmail}`);
        if (previewUrl) {
          console.log(`   🔗 Ethereal Preview URL: ${previewUrl}`);
        }

        // 6. Update DB Record to SENT
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealUrl: previewUrl,
            errorMessage: null,
          },
        });

        if (batchId) {
          await prisma.emailBatch.update({
            where: { id: batchId },
            data: { sentCount: { increment: 1 } },
          }).catch(() => {});
        }

        return {
          status: 'sent',
          messageId: info.messageId,
          previewUrl,
        };
      } catch (err: any) {
        console.error(`❌ [Worker] Failed to send email to ${recipientEmail}:`, err.message);

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorMessage: err.message || 'Unknown SMTP error',
            retryCount: { increment: 1 },
          },
        });

        if (batchId) {
          await prisma.emailBatch.update({
            where: { id: batchId },
            data: { failedCount: { increment: 1 } },
          }).catch(() => {});
        }

        throw err;
      }
    },
    {
      connection: createRedisClient(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`🎯 [Worker] Job #${job.id} marked complete`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [Worker] Job #${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    console.warn(`⚠️ [Worker Notice]:`, err.message);
  });

  return worker;
}
