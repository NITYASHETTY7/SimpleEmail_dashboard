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

## 🌟 Complete List of Extra Features & Granular Enhancements

Here is the exhaustive list of all production-grade features and minute details added:

### 1. 👑 SuperAdmin Oversight View (`superadmin@gmail.com`)
* Logging in with `superadmin@gmail.com` bypasses tenant filters to display **all historical scheduled and sent emails across every user profile** in the database.
* Standard users (via Google OAuth or email sign-in) get an isolated workspace starting with a clean inbox showing only their own emails.

### 2. 🔲 In-App Email Detail Modal with Fullscreen Reader Mode
* Clicking any email row in either Scheduled or Sent tab opens a detail viewer showing rendered HTML body, sender/recipient metadata, retry counts, and throttle settings.
* **Fullscreen Toggle (`⤢` / `⤡`)**: Expands the viewer to `max-w-6xl` full-page reader mode for clean, large-canvas reading.
* **One-Click Ethereal Link**: Direct "Open in Ethereal Inbox" button for delivered emails.

### 3. 📸 Crisp, Natural Aspect Ratio Embedded Image Attachments
* Uploading image attachments embeds them directly into the email body (`<img ... />`).
* Uses `object-fit: contain` with auto-height up to `480px` and rounded borders, preserving full natural proportions without cropping diagrams or logos.

### 4. ✍️ Selection-Preserving Rich Text Editor Toolbar
* Floating toolbar with:
  * **Headings Dropdown**: Normal text, Large Heading 1 (`H1`), Subheading 2 (`H2`).
  * **Styling**: Bold (`B`), Italic (`I`), Underline (`U`), Strikethrough (`S`).
  * **Alignment**: Left, Center, Right.
  * **Lists**: Numbered list (`1.`, `2.`) and Bulleted list (`•`) with custom indentation and outside disc markers.
  * **Green Highlight Flag**: Quick highlight in ReachInbox signature green (`#00AA4F`).
  * **Blockquote**: Single clean green left-border quote that prevents cumulative nested border stacking.
  * **Undo / Redo**: Quick history actions.
* **Selection Preservation**: Toolbar clicks do not wipe or collapse highlighted text selections in Chromium browsers.

### 5. 🏷️ Interactive Lead Chip Manager in Compose Modal
* **Expandable Lead Chips**: Compact view shows initial leads with a green `+N` badge. Clicking expands/collapses the full lead list.
* **Inline Lead Addition**: Type any email directly in the recipient bar and press `Enter` or `,` to add.
* **Individual Chip Removal**: Remove individual recipients with `✕` or click `Clear Leads`.
* **Collapsible Cc & Bcc**: Expandable rows supporting multiple Cc/Bcc recipient chips.

### 6. 📂 Instant Client-Side & Server-Side Lead Parsing
* Dual-layer CSV/TXT parsing: Client-side FileReader for zero-latency UI population + backend validation.
* Auto-detects column headers (`email`, `mail`, `name`, `first_name`, or raw email lines).

### 7. ⏱️ Active 10-Second Watchdog Reconciler
* Continuous background watchdog running every 10 seconds to detect any overdue scheduled emails and dispatch them through BullMQ with zero delay (`delay = 0`).
* Startup reconciliation restores pending jobs with accurate remaining delay offsets after server restarts.

### 8. 🔄 Live Real-Time Auto-Polling
* Main dashboard auto-refreshes every 3.5 seconds.
* Active detail modal polls in the background to automatically transition badges from `SCHEDULED` to `SENT` and reveal the Ethereal preview link the moment an email is delivered.

### 9. 🗑️ Hover Quick-Delete for Email Records
* Red trash icon (`Trash2`) on hover over any email row to delete individual emails cleanly.

### 10. 🛡️ Resilient Authentication & Clean Login State
* Login inputs start completely empty with `autoComplete="off"` (no browser auto-fill).
* Fallback demo authentication for instant zero-config evaluation.
* Clear error banners for Google OAuth domain authorization.

### 11. ☁️ Production Cloud Deployment Descriptors
* **Render Blueprint** ([`render.yaml`](./render.yaml)) for persistent Node + BullMQ background queue workers.
* **Vercel SPA Configuration** ([`vercel.json`](./vercel.json)) with route rewrites and TypeScript environment typing.

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
4. **Google Cloud Origin Propagation**: Google Cloud Console OAuth origins take 2 to 5 minutes to propagate after adding new deployment domains.
