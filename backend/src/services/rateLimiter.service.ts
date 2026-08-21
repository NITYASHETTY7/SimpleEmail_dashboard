import { redisClient } from '../config/redis';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { RateLimitCheckResult } from '../types';

export class RateLimiterService {
  /**
   * Generates a Redis key for the current 1-hour window for a sender
   * Key pattern: ratelimit:sender:{senderEmail}:{yyyyMMddHH}
   */
  private static getHourWindowKey(senderEmail: string, date: Date = new Date()): { key: string; windowStart: Date; windowEnd: Date } {
    const d = new Date(date);
    d.setMinutes(0, 0, 0); // Round down to start of hour
    const windowStart = new Date(d);
    
    const nextHour = new Date(d);
    nextHour.setHours(d.getHours() + 1);
    const windowEnd = nextHour;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');

    const key = `ratelimit:sender:${senderEmail.toLowerCase()}:${yyyy}${mm}${dd}${hh}`;
    return { key, windowStart, windowEnd };
  }

  /**
   * Global hour window key
   */
  private static getGlobalHourWindowKey(date: Date = new Date()): { key: string; windowStart: Date; windowEnd: Date } {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    const windowStart = new Date(d);
    
    const nextHour = new Date(d);
    nextHour.setHours(d.getHours() + 1);
    const windowEnd = nextHour;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');

    const key = `ratelimit:global:${yyyy}${mm}${dd}${hh}`;
    return { key, windowStart, windowEnd };
  }

  /**
   * Checks if an email send is allowed in the current hour window.
   * If allowed, atomically increments the counter and sets TTL.
   * If limit exceeded, returns the reschedule delay in milliseconds until the start of the next hour window.
   */
  public static async checkAndConsumeToken(
    senderEmail: string,
    customSenderLimit?: number
  ): Promise<RateLimitCheckResult> {
    const now = new Date();
    const senderLimit = customSenderLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const globalLimit = env.GLOBAL_MAX_EMAILS_PER_HOUR;

    const senderWindow = this.getHourWindowKey(senderEmail, now);
    const globalWindow = this.getGlobalHourWindowKey(now);

    const msUntilNextHour = senderWindow.windowEnd.getTime() - now.getTime();
    // Add small 500ms safety buffer into the next hour window
    const rescheduleDelayMs = Math.max(1000, msUntilNextHour + 500);

    // Atomic check using Redis multi/pipeline or Lua script
    const pipeline = redisClient.pipeline();
    pipeline.get(senderWindow.key);
    pipeline.get(globalWindow.key);
    const results = await pipeline.exec();

    const currentSenderCount = results?.[0]?.[1] ? parseInt(results[0][1] as string, 10) : 0;
    const currentGlobalCount = results?.[1]?.[1] ? parseInt(results[1][1] as string, 10) : 0;

    // Check sender limit
    if (currentSenderCount >= senderLimit) {
      console.warn(
        `⚠️ [RateLimiter] Sender limit reached for ${senderEmail} (${currentSenderCount}/${senderLimit}). Rescheduling in ${Math.round(
          rescheduleDelayMs / 1000
        )}s`
      );
      return {
        allowed: false,
        currentCount: currentSenderCount,
        limit: senderLimit,
        remaining: 0,
        resetTimeMs: senderWindow.windowEnd.getTime(),
        rescheduleDelayMs,
      };
    }

    // Check global limit
    if (currentGlobalCount >= globalLimit) {
      console.warn(
        `⚠️ [RateLimiter] Global limit reached (${currentGlobalCount}/${globalLimit}). Rescheduling in ${Math.round(
          rescheduleDelayMs / 1000
        )}s`
      );
      return {
        allowed: false,
        currentCount: currentGlobalCount,
        limit: globalLimit,
        remaining: 0,
        resetTimeMs: globalWindow.windowEnd.getTime(),
        rescheduleDelayMs,
      };
    }

    // Increment both counters atomically
    const incrPipeline = redisClient.pipeline();
    incrPipeline.incr(senderWindow.key);
    incrPipeline.expire(senderWindow.key, 7200); // 2 hours TTL for safety
    incrPipeline.incr(globalWindow.key);
    incrPipeline.expire(globalWindow.key, 7200);

    const incrResults = await incrPipeline.exec();
    const newSenderCount = (incrResults?.[0]?.[1] as number) || currentSenderCount + 1;

    // Async record audit in DB for reporting (non-blocking)
    prisma.rateLimitAudit
      .create({
        data: {
          senderEmail,
          windowKey: senderWindow.key,
          emailsSentInWindow: newSenderCount,
          limit: senderLimit,
        },
      })
      .catch((err) => {
        // Silent error so db write doesn't block email queue
        console.error('RateLimitAudit error:', err.message);
      });

    return {
      allowed: true,
      currentCount: newSenderCount,
      limit: senderLimit,
      remaining: Math.max(0, senderLimit - newSenderCount),
      resetTimeMs: senderWindow.windowEnd.getTime(),
      rescheduleDelayMs: 0,
    };
  }

  /**
   * Helper to retrieve current usage stats for a sender
   */
  public static async getSenderUsage(senderEmail: string): Promise<{ count: number; limit: number; remaining: number }> {
    const now = new Date();
    const senderWindow = this.getHourWindowKey(senderEmail, now);
    const countStr = await redisClient.get(senderWindow.key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    return {
      count,
      limit,
      remaining: Math.max(0, limit - count),
    };
  }
}
