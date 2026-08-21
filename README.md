# ReachInbox Email Scheduler & Dashboard 🚀

A production-grade, distributed **Email Scheduler service and Dashboard** engineered for high-throughput, persistent scheduling without cron jobs. Built with **TypeScript**, **Express.js**, **BullMQ**, **Redis**, **Prisma (Relational DB)**, **Ethereal Email (SMTP)**, and **React (Vite + Tailwind CSS)**.

---

## 🌟 Key Highlights & Feature Matrix

| Requirement | Implementation Details | Status |
| :--- | :--- | :--- |
| **No Cron Jobs** | Pure **BullMQ delayed jobs** (`emailQueue.add('send-email', payload, { delay, jobId })`) with deterministic IDs for strict idempotency. | ✅ Complete |
| **Persistence & Restart Safety** | Persistent Relational DB + Redis queue. `PersistenceService.reconcileJobsOnStartup()` guarantees future jobs fire at exact scheduled timestamps after restarts without duplicate sends. | ✅ Complete |
| **Worker Concurrency** | Configurable BullMQ worker concurrency (`WORKER_CONCURRENCY`, default `5`), safe for parallel multi-instance scaling. | ✅ Complete |
| **Provider Throttling Delay** | Configurable delay between each send (`MIN_DELAY_BETWEEN_EMAILS_MS`, default `2000ms` / 2 seconds) + staggered lead scheduling. | ✅ Complete |
| **Hourly Rate Limiting** | Redis atomic sliding window per sender (`ratelimit:sender:{email}:{hourWindow}`) and global (`ratelimit:global:{hourWindow}`). | ✅ Complete |
| **Auto-Rescheduling under Load** | When hourly limit is hit, jobs are **never dropped or failed**—they are seamlessly rescheduled into the start of the next hour window. | ✅ Complete |
| **Multi-Sender Support** | Support for multiple sender addresses with distinct hourly quotas, usage progress meters, and SMTP configurations. | ✅ Complete |
| **Ethereal Email SMTP** | Sends via Ethereal test SMTP; generates real clickable preview URLs (`getPreviewUrl(info)`) viewable directly from dashboard. | ✅ Complete |
| **Google OAuth Login** | Real Google OAuth login via `@react-oauth/google` with fallback 1-click Instant Demo login for zero-config evaluation. | ✅ Complete |
| **CSV / TXT Lead Uploader** | Drag-and-drop file upload, automated lead extraction, validation counts, and template variable replacement (`{{name}}`, `{{email}}`). | ✅ Complete |
| **Real-time UI Dashboard** | Scheduled and Sent email tables with live polling sync, search, status badges, and cancellation. | ✅ Complete |

---

## 🏗️ Architecture & Technical Deep Dive

```
+-----------------------------------------------------------------------------------+
|                                React Frontend (Vite)                             |
|  - Google OAuth / Demo Login       - CSV Lead Drag & Drop (Lead Counter)         |
|  - Scheduled Emails Table (Cancel) - Sent Emails Table (Ethereal Preview Links)   |
|  - Rate Limits & Senders Monitor   - Live KPI Metrics (Auto-sync every 3.5s)     |
+------------------------------------------+----------------------------------------+
                                           | HTTP API (JSON / FormData)
                                           v
+-----------------------------------------------------------------------------------+
|                                Express.js Backend                                 |
|  - Auth Middleware & JWT Verification    - CSV Lead Parser (Papaparse)            |
|  - Idempotent Job Dispatcher             - Persistence & Restart Reconciler       |
+--------------------+-------------------------------------+------------------------+
                     |                                     |
                     v                                     v
       +----------------------------+        +---------------------------+
       |   Prisma Relational DB     |        |       Redis Engine        |
       |  (SQLite / PostgreSQL)     |        |  - BullMQ Delayed Sets    |
       |  - Users                   |        |  - Atomic Hourly Counters |
       |  - EmailJobs               |        |  - Distributed Locks      |
       |  - SenderAccounts          |        +-------------+-------------+
       |  - EmailBatches            |                      |
       +----------------------------+                      v
                                             +---------------------------+
                                             |       BullMQ Worker       |
                                             |  - Concurrency: 5+        |
                                             |  - Provider Delay (2s)    |
                                             |  - Hourly Rate Limiter    |
                                             +-------------+-------------+
                                                           |
                                                           v
                                             +---------------------------+
                                             |   Ethereal SMTP Server    |
                                             |  - Fake SMTP Delivery     |
                                             |  - Web Preview Link       |
                                             +---------------------------+
```

### 1. How Scheduling Works (No Cron)
- Scheduling requests calculate `delayMs = Math.max(0, scheduledAt.getTime() - Date.now())`.
- The job is enqueued in BullMQ with deterministic ID `email-${job.id}`.
- BullMQ leverages Redis sorted sets (`ZADD`) with timestamps. Redis wakes up the job at the exact millisecond when the delay expires.

### 2. Server Restart & Idempotency Guarantee
- State is persisted in the relational database (`EmailJob` model).
- If the server restarts:
  - Redis persists delayed jobs in memory/AOF.
  - On startup, `PersistenceService.reconcileJobsOnStartup()` scans the database for any pending `SCHEDULED` or `RATE_LIMITED_RESCHEDULED` jobs and ensures they exist in BullMQ with the remaining time offset.
  - Completed (`SENT`) or `CANCELLED` jobs are never re-queued, preventing duplicate emails.

### 3. Rate Limiting & Concurrency Architecture
- **Worker Concurrency**: Set via `WORKER_CONCURRENCY` (default: 5). Multiple worker threads process jobs concurrently with distributed atomic job claiming.
- **Minimum Provider Delay**: Set via `MIN_DELAY_BETWEEN_EMAILS_MS` (default: `2000ms` / 2 seconds). The worker throttles between sends to avoid provider connection exhaustion.
- **Hourly Window Rate Limiting**:
  - Keyed by `ratelimit:sender:{senderEmail}:{YYYYMMDDHH}` with 2-hour TTL in Redis.
  - When the count reaches `hourlyLimit` (e.g. 100/hr):
    - **Jobs are never dropped or permanently failed**.
    - The worker calculates the exact millisecond offset until the next hour window (`windowEnd - now + 500ms`).
    - The job is rescheduled in BullMQ with that delay, and marked as `RATE_LIMITED_RESCHEDULED` in the database.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ or v20+
- **Redis**: Local Redis or via Docker (`docker run -d -p 6379:6379 redis:7-alpine`)

---

### Option A: Quick Run (Recommended)

#### 1. Start Redis
```bash
docker run -d --name reachinbox-redis -p 6379:6379 redis:7-alpine
```
*(Or use `docker compose up -d redis`)*

#### 2. Backend Setup
```bash
cd backend
npm install

# Initialize database schema & seed demo senders
npx prisma db push
npm run seed

# Start backend server
npm run dev
```
Backend will start on `http://localhost:5000`. Ethereal SMTP test credentials will automatically generate on boot.

#### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on `http://localhost:3000`.

---

## ⚙️ Configuration & Environment Variables

### Backend `.env` (`backend/.env`):
```env
PORT=5000
NODE_ENV=development

# Database (SQLite default for zero-setup, or PostgreSQL)
DATABASE_URL="file:./dev.db"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# BullMQ Worker Concurrency
WORKER_CONCURRENCY=5

# Throttling & Rate Limits
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100
GLOBAL_MAX_EMAILS_PER_HOUR=500

# Security
JWT_SECRET=super-secret-jwt-key-reachinbox-scheduler-2025

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: Ethereal Email Credentials (auto-generated if empty)
ETHEREAL_USER=
ETHEREAL_PASS=
DEFAULT_SENDER_EMAIL=scheduler@reachinbox.test
DEFAULT_SENDER_NAME=ReachInbox Scheduler
```

### Frontend `.env` (`frontend/.env`):
```env
# Optional Google Client ID for real Google OAuth login
VITE_GOOGLE_CLIENT_ID=
```

---

## 🧪 Testing & Verification Guide

### 1. Test Single & Batch Scheduling
1. Open `http://localhost:3000` and sign in with **Google Login** or click **Enter Dashboard (Instant Demo)**.
2. Click **"Compose Email"**.
3. Select **"Batch Leads (CSV)"** and drag & drop `sample_leads.csv` included in the root directory.
4. Notice the lead counter updates to **10 valid email leads detected**.
5. Set delay to `2s` and choose **"Send Immediately"** or **"In 2 Minutes"**.
6. Click **Schedule Campaign**.
7. Watch the **Scheduled Emails** tab update live, transition to **Sending...**, and move to **Sent Emails**.
8. In **Sent Emails**, click **"View in Ethereal"** to view the rendered email on Ethereal's web viewer!

### 2. Test Server Restart Persistence
1. Compose a campaign with start time set to **"In 5 Minutes"** (or custom time in the future).
2. Stop the backend server in your terminal (`Ctrl + C`).
3. Note that the jobs remain safely stored in the database and Redis.
4. Restart the backend server (`npm run dev`).
5. Notice the console output: `[Persistence] Reconciled and ensured X jobs in BullMQ queue.`
6. When the scheduled time arrives, the worker sends the emails on time with zero duplicate sends!

### 3. Test Rate Limiting
1. Open **"Rate Limits & Senders"** in the header.
2. Set a sender's limit to `10 emails/hr`.
3. Upload a batch of 15 leads.
4. The first 10 emails are processed and delivered.
5. The remaining 5 emails are automatically rescheduled with status `RATE_LIMITED_RESCHEDULED` for the next hour window without dropping any jobs.

---

## 📹 Video Demo Checklist (Max 5 mins)

1. **Dashboard Walkthrough**: Scheduled tab, Sent tab, KPI counters.
2. **Scheduling a Batch**: Drag-and-drop `sample_leads.csv`, customize delay (e.g. 2s) & subject.
3. **Ethereal Preview**: Click "View in Ethereal" to inspect the rendered email.
4. **Server Restart Demonstration**: Schedule email 2 mins in future -> Kill backend -> Restart backend -> Confirm execution.
5. **Rate Limiting Demonstration**: Show auto-rescheduling when limit is exceeded.

---

## 📦 Project Structure

```
Email_Dashboard/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Prisma ORM Database Models
│   ├── src/
│   │   ├── config/               # Env, Redis, DB, Mailer configs
│   │   ├── controllers/          # Express route controllers
│   │   ├── middleware/           # Auth & Error middlewares
│   │   ├── queues/               # BullMQ Queue & Worker
│   │   ├── routes/               # API endpoint definitions
│   │   ├── services/             # Email, RateLimiter, Auth, Persistence services
│   │   ├── types/                # Strong TypeScript interfaces
│   │   ├── seed.ts               # Sample data seeder
│   │   └── server.ts             # Express entrypoint & lifecycle
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/             # Google Login & Instant Demo
│   │   │   ├── common/           # Badges, Toasts, Skeletons
│   │   │   ├── compose/          # Compose & CSV Drag-and-Drop Modal
│   │   │   ├── layout/           # Header with Cluster Health & Profile
│   │   │   ├── senders/          # Rate Limit & Senders Monitor Modal
│   │   │   ├── stats/            # KPI Metric Summary Cards
│   │   │   └── tables/           # Scheduled & Sent Email Tables
│   │   ├── context/              # Auth Context
│   │   ├── services/             # API HTTP client
│   │   ├── types/                # Frontend TypeScript types
│   │   ├── App.tsx               # Main Application View
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── sample_leads.csv              # 10 sample leads for immediate testing
├── docker-compose.yml            # Redis & PostgreSQL compose configuration
└── README.md
```

---

## ⚖️ Trade-offs & Design Decisions

1. **BullMQ over Cron**: We selected BullMQ delayed jobs over cron polling because BullMQ provides sub-millisecond precision, distributed locking, exponential backoff retries, and high-throughput Redis data structures.
2. **Dual Layer Rate Limiting**: We enforced rate limiting at both the schedule stagger level and worker execution level to handle distributed horizontal worker scaling safely without race conditions.
3. **Database Support**: We set SQLite as default for instant local zero-configuration execution while providing full compatibility with PostgreSQL/MySQL via Prisma.
