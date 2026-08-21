import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDB, prisma } from './config/db';
import { getOrCreateDefaultTransporter } from './config/mailer';
import { setupEmailWorker } from './queues/email.worker';
import { PersistenceService } from './services/persistence.service';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ReachInbox Email Scheduler Backend',
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Global Error Handler
app.use(errorHandler);

// Server Boot Sequence
async function startServer() {
  try {
    console.log('🚀 Starting ReachInbox Email Scheduler Service...');

    // 1. Connect Relational Database
    await connectDB();

    // 2. Initialize Ethereal SMTP Transporter
    await getOrCreateDefaultTransporter();

    // 3. Initialize BullMQ Worker
    const worker = setupEmailWorker();

    // 4. Seed initial sample data if brand new database
    const totalEmails = await prisma.emailJob.count();
    if (totalEmails === 0) {
      console.log('🌱 Brand new database detected. Creating initial demo accounts and emails...');
      const demoUser = await prisma.user.upsert({
        where: { email: 'oliver.brown@domain.io' },
        update: {},
        create: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          googleId: 'demo-google-user-oliver',
        },
      });

      await prisma.senderAccount.upsert({
        where: { email: 'oliver.brown@domain.io' },
        update: {},
        create: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          hourlyLimit: 100,
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
        },
      });

      // Seed 2 sample sent emails
      await prisma.emailJob.create({
        data: {
          senderEmail: 'oliver.brown@domain.io',
          recipientEmail: 'alex.morgan@company.com',
          recipientName: 'Alex Morgan',
          subject: 'ReachInbox Product Demo & Architecture',
          body: 'Hi Alex,\n\nHere is our distributed BullMQ email scheduler architecture overview. Rate limiting and delay queues are fully functional.\n\nBest,\nOliver',
          status: 'SENT',
          scheduledAt: new Date(Date.now() - 3600 * 1000),
          sentAt: new Date(Date.now() - 3590 * 1000),
          etherealUrl: 'https://ethereal.email/message/WaQKMgKddxQDoou...preview',
          delayBetweenMs: 2000,
          hourlyLimit: 100,
          userId: demoUser.id,
        },
      });

      await prisma.emailJob.create({
        data: {
          senderEmail: 'oliver.brown@domain.io',
          recipientEmail: 'sarah.connor@domain.io',
          recipientName: 'Sarah Connor',
          subject: 'Q3 Enterprise Scheduling Workflow',
          body: 'Hello Sarah,\n\nWe have scheduled the Q3 outbound campaign. All rate limiters and multi-sender quotas are locked in.\n\nRegards,\nOliver',
          status: 'SENT',
          scheduledAt: new Date(Date.now() - 7200 * 1000),
          sentAt: new Date(Date.now() - 7190 * 1000),
          etherealUrl: 'https://ethereal.email/message/XbQKMgKddxQDoou...preview',
          delayBetweenMs: 2000,
          hourlyLimit: 100,
          userId: demoUser.id,
        },
      });
    }

    // 5. Persistence & Restart Reconciler
    await PersistenceService.reconcileJobsOnStartup();
    PersistenceService.startBackgroundReconciler();

    // 6. Start Express HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`\n=================================================`);
      console.log(`✅ [Server] Running on http://localhost:${env.PORT}`);
      console.log(`⚙️  [Config] Worker Concurrency: ${env.WORKER_CONCURRENCY}`);
      console.log(`⏱️  [Config] Provider Send Delay: ${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms`);
      console.log(`📊 [Config] Sender Hourly Limit: ${env.MAX_EMAILS_PER_HOUR_PER_SENDER} emails/hr`);
      console.log(`🌐 [Config] Global Hourly Limit: ${env.GLOBAL_MAX_EMAILS_PER_HOUR} emails/hr`);
      console.log(`=================================================\n`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      await worker.close();
      server.close(() => {
        console.log('🚪 HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
