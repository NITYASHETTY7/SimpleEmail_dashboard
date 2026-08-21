# ReachInbox Email Scheduler & Dashboard 🚀

A production-grade, distributed **Email Job Scheduler service and Analytics Dashboard** engineered for high-throughput, persistent scheduling without cron jobs. Built to satisfy all core requirements and advanced production enhancements for the ReachInbox Full-Stack Engineering Assignment.

---

## 📋 Comprehensive Requirements Mapping

| Assignment Requirement | Implementation in Codebase | Status |
| :--- | :--- | :--- |
| **No Cron Jobs** | Pure **BullMQ delayed queue** (`emailQueue.add('send-email', payload, { delay, jobId })`) with deterministic IDs for strict idempotency. | ✅ Complete |
| **Relational DB** | **Prisma ORM** with SQLite (local development) and PostgreSQL support (production). | ✅ Complete |
| **Persistence on Restart** | `PersistenceService.reconcileJobsOnStartup()` + 10s watchdog reconciler synchronizes pending DB jobs with BullMQ with remaining delay offsets. | ✅ Complete |
| **Worker Concurrency** | Configurable concurrency via `WORKER_CONCURRENCY` (default `5`), allowing parallel multi-threaded email dispatching. | ✅ Complete |
| **Provider Throttling Delay** | Configurable delay between sends via `MIN_DELAY_BETWEEN_EMAILS_MS` (default `2000ms` / 2 seconds) + per-campaign custom throttles. | ✅ Complete |
| **Hourly Rate Limiting** | Redis atomic sliding window counters (`ratelimit:sender:{email}:{hourWindow}`) and global limits (`ratelimit:global:{hourWindow}`). | ✅ Complete |
| **Auto-Rescheduling under Load** | When hourly quota is reached, jobs are **never dropped or permanently failed**—they are seamlessly rescheduled into the start of the next hour window. | ✅ Complete |
| **Multi-Sender Support** | Sender accounts model (`SenderAccount`) with individual hourly limits, SMTP configurations, and usage tracking. | ✅ Complete |
| **Ethereal Email SMTP** | Auto-generates test SMTP accounts and captures real clickable preview URLs (`getPreviewUrl(info)`) for live email inspection. | ✅ Complete |
| **Real Google OAuth Login** | Full Google OAuth 2.0 via `@react-oauth/google` displaying user Name, Email, Avatar, and Logout. | ✅ Complete |
| **Figma-Matched UI** | Pixel-accurate sidebar, top header, KPI metric counters, scheduled/sent tabs, and search bar. | ✅ Complete |
| **Compose Modal & CSV Upload** | Rich text editor, inline lead chips, `+N` badge counter, and instant CSV/TXT lead parsing (`{{name}}`, `{{email}}`). | ✅ Complete |
| **Scheduled & Sent Tables** | Clean tables with recipient info, subjects, send/scheduled timestamps, status badges, loading skeletons, and empty states. | ✅ Complete |

---

## 🌟 Extra & Out-of-Scope Highlights (Above & Beyond)

In addition to all core requirements, the following production-grade features were built:

1. **👑 SuperAdmin Multi-Tenant Mode (`superadmin@gmail.com`)**:
   * Logging in with `superadmin@gmail.com` unlocks a system-wide view displaying **all scheduled and sent emails across every user profile** in the database.
   * Standard users (via Google OAuth or email sign-in) receive an isolated, private workspace starting with a clean inbox showing strictly their own emails.

2. **🖼️ In-App Email Detail Modal & Fullscreen Reader**:
   * Clicking any row in either the Scheduled or Sent table opens a modal showing the rendered HTML body, recipient/sender metadata, retry counts, and throttle parameters.
   * Includes a **Fullscreen Toggle (`⤢`)** for distraction-free, large-canvas reading.

3. **📸 Image Attachment Embedding**:
   * Uploading image attachments embeds them directly into the email body with responsive, natural aspect ratio scaling (`object-fit: contain`) without awkward cropping.

4. **✨ Live Real-Time Auto-Polling**:
   * The dashboard auto-syncs every 3.5 seconds. If an email is currently open in the detail modal while its scheduled time arrives, the modal automatically transitions from `SCHEDULED` to `SENT` and reveals the **"Open in Ethereal Inbox"** button in real time.

5. **📂 Client-Side & Server-Side Lead Parsing**:
   * CSV and TXT files are parsed instantly on the client side for zero-latency UI responsiveness, with parallel backend validation and auto-detected column headers (`email`, `name`, `first_name`).

6. **☁️ Multi-Cloud Deployment Ready**:
   * Ready-to-deploy descriptors: [`render.yaml`](./render.yaml) for the persistent backend worker and [`vercel.json`](./vercel.json) for the frontend React SPA.

---

## 🏗️ Architecture & Technical Deep Dive

```
+-----------------------------------------------------------------------------------+
|                                React Frontend (Vite)                             |
|  - Google OAuth / SuperAdmin Login - CSV Lead Drag & Drop (Lead Counter)         |
|  - Scheduled Emails Table (Cancel) - Sent Emails Table (Ethereal Preview Links)   |
|  - Full Page Email Reader (Modal)  - Live KPI Metrics (Auto-sync every 3.5s)     |
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
       |   Prisma Relational DB     |        |   Cloud Redis (Upstash)   |
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
                                             |  - 10s Overdue Watchdog   |
                                             +-------------+-------------+
                                                           |
                                                           v
                                             +---------------------------+
                                             |   Ethereal SMTP Server    |
                                             |  - Fake SMTP Delivery     |
                                             |  - Web Preview Link       |
                                             +---------------------------+
```

### 1. How Scheduling Works (Strictly No Cron)
* When an email is scheduled for a future time, `delayMs = Math.max(0, scheduledAt.getTime() - Date.now())` is computed.
* The job is placed into BullMQ with a deterministic Job ID: `email-${job.id}`.
* BullMQ uses Redis sorted sets (`ZADD`) with timestamps. Redis wakes up the job at the exact scheduled millisecond.

### 2. Restart & Persistence Guarantee
* All jobs are persisted in the relational database (`EmailJob` model).
* On boot, `PersistenceService.reconcileJobsOnStartup()` scans the database for any pending `SCHEDULED` or `RATE_LIMITED_RESCHEDULED` jobs and syncs them with BullMQ using their accurate remaining delay offsets.
* A continuous **10-second background watchdog** verifies and dispatches any overdue jobs immediately.
* Completed (`SENT`) or `CANCELLED` jobs are never re-queued, guaranteeing idempotency.

### 3. Rate Limiting & Auto-Rescheduling Under Load
* **Sliding Window Keys**: Keyed by `ratelimit:sender:{senderEmail}:{YYYYMMDDHH}` with a 2-hour TTL in Redis.
* **Auto-Rescheduling**: When the count reaches `hourlyLimit` (e.g. 100/hr), jobs are **never dropped or failed**. The worker calculates the exact offset until the start of the next hour window (`windowEnd - now + 500ms`) and reschedules the job automatically.

---

## 🔑 Login Credentials & Demo Access

| Login Mode | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **👑 SuperAdmin** | `superadmin@gmail.com` | *(Any password / blank)* | Sees **all emails across all user profiles** in the entire database. |
| **👤 Standard User** | Any Google Account / custom email | *(Any password / blank)* | Private workspace starting with a clean empty inbox. |

---

## ⚙️ Environment Variables

### 🔹 Backend `.env` (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

# Database Configuration (SQLite local / PostgreSQL production)
DATABASE_URL="file:./dev.db"

# Cloud Redis (Upstash) or Local Redis (redis://127.0.0.1:6379)
REDIS_URL="redis://default:gQAAAAAAAbnVAAIgcDEyYjVmYmZhZDc3MTc0OGY1OTU3YmZiYTkzMzcxY2UzNA@concrete-bee-113109.upstash.io:6379"

# BullMQ Worker Concurrency & Throttling
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100
GLOBAL_MAX_EMAILS_PER_HOUR=500

# Auth & Security
JWT_SECRET="super-secret-jwt-key-reachinbox-scheduler-2025"
GOOGLE_CLIENT_ID="84300577342-r2nlfsnrh4ov1hfuaku21757vhteqo87.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Default Sender Account
DEFAULT_SENDER_EMAIL="oliver.brown@domain.io"
DEFAULT_SENDER_NAME="Oliver Brown"
```

### 🔹 Frontend `.env` (`frontend/.env`)

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID="84300577342-r2nlfsnrh4ov1hfuaku21757vhteqo87.apps.googleusercontent.com"

# API Base URL (leave blank for local Vite proxy, or set to your deployed backend URL)
VITE_API_BASE_URL="http://localhost:5000/api"
```

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Install Dependencies

```powershell
# Clone repository
git clone https://github.com/NITYASHETTY7/SimpleEmail_dashboard.git
cd SimpleEmail_dashboard

# Install Backend Dependencies
cd backend
npm install
npx prisma generate
npx prisma db push

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Run the Application

Open two terminal tabs:

**Terminal 1 (Backend):**
```powershell
cd backend
npm run dev
```
*(Backend runs on `http://localhost:5000`)*

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
*(Frontend runs on `http://localhost:3000`)*

---

## 🧪 Demo & Testing Guide (For Video Recording)

1. **Scheduling an Email / Lead List**:
   * Open the Compose modal, enter subject and body, upload [`sample_leads_figma.csv`](./sample_leads_figma.csv), set a start time or delay (e.g. 2s), and click Schedule.
   * Notice the instant lead counter badge (`+N`) and scheduled entries in the **Scheduled** tab.

2. **Verifying Real Delivery & Ethereal Inbox**:
   * Once the scheduled time arrives, the email moves to the **Sent** tab.
   * Click the email row to open the full reader modal and click **Open in Ethereal Inbox** to view the live delivered email on Ethereal's web viewer.

3. **Demonstrating Server Restart Safety**:
   * Schedule an email for 2 minutes in the future.
   * Kill the backend terminal process (`Ctrl + C`).
   * Restart the backend (`npm run dev`).
   * Notice in the terminal logs: `[Persistence] Reconciled and ensured X jobs in BullMQ queue`. The email fires at the exact original timestamp without duplication!

4. **Demonstrating Rate Limiting Under Load**:
   * Set `hourlyLimit = 2` in the Compose modal and schedule a batch of 5 leads.
   * The first 2 emails send immediately; the remaining 3 are automatically marked as `RATE_LIMITED_RESCHEDULED` and delayed to the start of the next hour window.

---

## ⚖️ Assumptions, Shortcuts & Trade-offs

1. **Ethereal Test SMTP**: Used Ethereal SMTP to simulate real email transport with public preview links without incurring live domain reputation risks.
2. **SQLite / PostgreSQL Hybrid**: Configured SQLite for zero-friction local development while providing full Prisma compatibility for PostgreSQL deployments on cloud platforms like Render.
3. **Sliding Window Rate Limiter**: Implemented atomic Redis hour-bucket keys (`ratelimit:sender:{email}:{hourWindow}`) which offer $O(1)$ performance and low memory overhead under high concurrency.
