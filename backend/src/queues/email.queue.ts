import { Queue } from 'bullmq';
import { createRedisClient } from '../config/redis';
import { EmailJobPayload } from '../types';

export const EMAIL_QUEUE_NAME = 'email-scheduler-queue';

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400 * 7,
      count: 5000,
    },
    removeOnFail: {
      age: 86400 * 14,
    },
  },
});

/**
 * Adds an email job to BullMQ with a calculated delay.
 * Strict idempotency is maintained by setting jobId = `email-${payload.emailJobId}`.
 */
export async function scheduleEmailJob(payload: EmailJobPayload, delayMs: number) {
  const deterministicJobId = `email-${payload.emailJobId}`;
  
  try {
    const existing = await emailQueue.getJob(deterministicJobId);
    if (existing) {
      await existing.remove();
    }
  } catch {}

  const job = await emailQueue.add('send-email', payload, {
    jobId: deterministicJobId,
    delay: Math.max(0, delayMs),
  });

  return job;
}

/**
 * Cancels a scheduled job in BullMQ if it exists.
 */
export async function cancelBullMQJob(jobId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to remove BullMQ job ${jobId}:`, error);
    return false;
  }
}
