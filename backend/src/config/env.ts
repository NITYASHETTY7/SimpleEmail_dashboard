import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database & Redis
  DATABASE_URL: z.string().default('file:./dev.db'),
  REDIS_URL: z.string().optional().default(''),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional().default(''),
  
  // BullMQ Worker & Concurrency
  WORKER_CONCURRENCY: z.string().default('5').transform(Number),
  
  // Rate Limiting & Delays (defaults)
  MIN_DELAY_BETWEEN_EMAILS_MS: z.string().default('2000').transform(Number),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.string().default('100').transform(Number),
  GLOBAL_MAX_EMAILS_PER_HOUR: z.string().default('500').transform(Number),
  
  // Auth & Security
  JWT_SECRET: z.string().default('super-secret-jwt-key-reachinbox-scheduler-2025'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  
  // Ethereal SMTP Credentials (optional, auto-generated if blank)
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),
  DEFAULT_SENDER_EMAIL: z.string().default('oliver.brown@domain.io'),
  DEFAULT_SENDER_NAME: z.string().default('Oliver Brown'),
});

export const env = envSchema.parse(process.env || {});
export type EnvConfig = z.infer<typeof envSchema>;
