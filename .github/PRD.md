# Vekt – Automated Recruitment Orchestration Engine

**Project Name:** **Vekt** (derived from "Weight")

---

## 1. Executive Summary

**Vekt** is a minimalist, backend-first, open-source recruitment engine designed to automate the initial vetting of candidates. Unlike heavy enterprise ATS (Applicant Tracking Systems), Vekt focuses on **durable orchestration** and **customizable AI evaluation**. It allows recruiters to define specific "weighting" logic (prompts) per job, ensuring that the AI evaluates candidates exactly like a human member of that specific team would.

---

## 2. Core Principles

* **Minimalist Infrastructure:** Single-binary feel (SQLite + Next.js).
* **Programmable Hiring:** Recruiters write the "logic" for the hire via custom AI prompts.
* **Durable Execution:** No lost applications; every step is retried via Inngest until successful.
* **Privacy & Portability:** Self-hosted, GDPR-ready, and supports local LLMs (Ollama).

---

## 3. Target Personas

| Persona | Goal | Key Pain Point |
| --- | --- | --- |
| **The Candidate** | Apply quickly and get updates. | "The Black Hole" (never hearing back). |
| **The Recruiter** | Find the "Gold" in a pile of 500 resumes. | Manual screening of unqualified PDFs. |
| **The Admin** | Manage the team and API costs. | Complex user management in SaaS tools. |
| **The Developer** | Deploy and customize the engine. | Heavy, opinionated frameworks. |

---

## 4. Functional Requirements

### 4.1 Job & Prompt Management

* **Job Creation:** Recruiters create listings with standard fields (Title, Description, etc.).
* **Custom Weighting (New):** Each job has an `evaluation_prompt` field.
* *Example:* "Prioritize candidates with 3+ years of React experience. Penalize for lack of testing knowledge."


* **Prompt Templates:** Pre-defined templates (e.g., "Technical Deep-Dive," "Culture Fit," "Executive Leadership").

### 4.2 AI-Powered Evaluation

* **Multi-Provider:** Support for OpenAI (Cloud) or Ollama (Local/Private).
* **Structured Feedback:** The AI must return a JSON object, not just a number:
* `score`: (0-100)
* `reasoning`: A 2-sentence justification.
* `pros/cons`: Specific bullet points based on the custom job prompt.



### 4.3 Candidate Orchestration

* **Resume Ingestion:** PDF text extraction handled locally (via `pdf-parse`).
* **Status Tracking:** Candidates move through a deterministic state machine:
* `APPLIED` $\rightarrow$ `ANALYZING` $\rightarrow$ `QUEUED` (High Score) **OR** `FLAGGED` (Low Score).


* **Magic Links:** The status page link (`/status/{candidateId}`) is delivered via transactional email at each stage transition — candidates never need to know or copy their ID manually.

### 4.4 Dashboards

* **Recruiter Dashboard:** A "Priority Queue" showing high-scoring candidates first. Includes an "Override" button to manually move candidates.
* **Admin Dashboard:** Manage recruiter accounts, set global `RETENTION_DAYS` for data scrubbing, configure the status email delay (`STATUS_EMAIL_DELAY_HOURS`), monitor API token usage, and edit candidate email templates.

### 4.5 Email Notifications

Vekt sends automated transactional emails to candidates at each major lifecycle stage via **Resend**. Templates are stored in the database and editable by admins through the Admin Dashboard.

| Trigger | Email Type | When Sent |
| --- | --- | --- |
| Application submitted | `APPLIED` | Immediately after the candidate submits their application |
| AI evaluation complete (high score) | `SHORTLISTED` | After `STATUS_EMAIL_DELAY_HOURS` hours (default 48 h) |
| AI evaluation complete (low score) | `REJECTED` | After `STATUS_EMAIL_DELAY_HOURS` hours (default 48 h) |
| Recruiter manually accepts/rejects/shortlists | `ACCEPTED` / `REJECTED` / `SHORTLISTED` | After `STATUS_EMAIL_DELAY_HOURS` hours (default 48 h) |
| Data deletion approaching | `DATA_RETENTION_WARNING` | 7 days before the candidate's data is scheduled for deletion |

**Delayed Dispatch & Cancellation:**

* Status-change emails (`SHORTLISTED`, `REJECTED`, `ACCEPTED`) are **not sent immediately**. When a status is set, Vekt fires a `vekt/candidate.status.email.scheduled` Inngest event carrying the `candidateId`, `emailType`, and `delayHours`.
* The `sendDelayedStatusEmail` Inngest function sleeps for `delayHours` and then dispatches the email.
* If a recruiter changes the candidate's status before the delay elapses, a `vekt/candidate.status.updated` event is fired. Inngest's `cancelOn` mechanism intercepts this and **cancels the pending email** automatically, then schedules a new delayed email for the updated status.
* Setting `STATUS_EMAIL_DELAY_HOURS` to `0` causes the email to be sent without any sleep (effectively immediate).
* The delay is configurable per-deployment from **Admin Dashboard → Email Templates → Status email delay** and is stored in the `Setting` table.

**Template System:**

* Templates are stored in the `EmailTemplate` database model, one row per `EmailType` enum value.
* Admins edit subject and HTML body via the Admin Dashboard.
* Templates support interpolation variables: `{{candidateName}}`, `{{jobTitle}}`, `{{companyName}}`, `{{statusPageUrl}}`, `{{retentionDate}}`.
* Default templates are seeded automatically on first run via `npm run db:seed`.

**Opt-Out & GDPR:**

* Every email includes a one-click **Unsubscribe** link (`/api/unsubscribe?id=<candidateId>`).
* Opt-out preference is stored as `emailOptOut` on the `Candidate` model.
* `DATA_RETENTION_WARNING` is dispatched regardless of opt-out status — it fulfils a legal GDPR data-retention obligation.
* No personally identifiable information (e.g. resume content) is ever included in email subjects.

---

## 5. Technical Architecture

### 5.1 The Stack

* **Framework:** Next.js 15 (App Router).
* **ORM/DB:** Prisma + SQLite (Default) / Turso (Production/Edge).
* **Orchestration:** **Inngest** (handles retries, delays, and background AI processing).
* **Styling:** Tailwind CSS + shadcn/ui.
* **Auth:** NextAuth.js (supporting `.env` based admin credentials).
* **Email:** Resend (transactional email delivery; templates stored in DB).

### 5.2 Data Model (Key Entities)

```prisma
model Job {
  id               String      @id @default(cuid())
  title            String
  customPrompt     String?     // The "Weighting" logic
  threshold        Int         @default(75)
  candidates       Candidate[]
}

model Candidate {
  id               String      @id @default(cuid())
  email            String
  resumeText       String      // Extracted PDF text
  status           Status      @default(APPLIED)
  evaluation       Evaluation?
  emailOptOut      Boolean     @default(false)
  emailLogs        EmailLog[]
}

model Evaluation {
  score            Int
  reasoning        String
  promptSnapshot   String      // The prompt used at time of scoring
  candidateId      String      @unique
}

/// Admin-editable email template; one row per EmailType
model EmailTemplate {
  type      EmailType @id
  subject   String
  body      String    // HTML; supports {{variable}} interpolation
  updatedAt DateTime  @updatedAt
}

/// Audit log of every outbound candidate email
model EmailLog {
  id          String    @id @default(cuid())
  candidateId String
  type        EmailType
  sentAt      DateTime  @default(now())
  resendId    String?   // Resend delivery ID
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}

enum EmailType {
  APPLIED
  SHORTLISTED
  REJECTED
  ACCEPTED
  DATA_RETENTION_WARNING
}

```

---

## 6. The "Vekt" Evaluation Workflow

Vekt uses a layered prompt approach to calculate the final score ($S$):

$$S = f(\text{System Prompt}, \text{Recruiter Context}, \text{Job Prompt}, \text{Resume})$$

1. **Ingest:** Candidate uploads PDF $\rightarrow$ Text extracted using unpdf package $\rightarrow$ File stored in `/uploads`.
2. **Trigger:** Inngest event `vekt/candidate.created` starts the durable pipeline.
3. **Email (APPLIED):** Inngest step `send-applied-email` dispatches a confirmation email with the status page link.
4. **Analyze:** Step `mark-analyzing` transitions candidate to `ANALYZING`.
5. **Context Assembly:** Step `fetch-candidate` loads the candidate plus **Job Custom Prompt**.
6. **AI Request:**
* If `AI_PROVIDER=ollama`, send to local endpoint.
* If `AI_PROVIDER=openai`, send to GPT-4o.


7. **State Update:** Step `save-evaluation` moves candidate to `SHORTLISTED` if $S \ge \text{threshold}$, else `REJECTED`.
8. **Email Scheduling:** Step `schedule-evaluation-email` reads `STATUS_EMAIL_DELAY_HOURS` from the DB and fires `vekt/candidate.status.email.scheduled`. The `sendDelayedStatusEmail` function sleeps for the configured hours, then sends the `SHORTLISTED` or `REJECTED` email.
9. **Recruiter Override:** When a recruiter acts via the dashboard, `PATCH /api/recruiter/review/[id]` updates the status, fires `vekt/candidate.status.updated` (cancelling any pending email for the previous status), and schedules a new `vekt/candidate.status.email.scheduled` event for the new status.

**GDPR Retention Warning (daily cron `purgeExpiredCandidates`):**

* Step `send-retention-warnings`: finds candidates whose `appliedAt` falls within the next 7 days of the retention cutoff, checks `EmailLog` to avoid duplicates, and dispatches `DATA_RETENTION_WARNING` emails.
* Subsequent step `delete-candidate-records` permanently removes expired records.

---

## 7. Non-Functional Requirements

* **Auditability:** Every score must be accompanied by the `promptSnapshot` so recruiters know *why* the AI gave that score. Every sent email is logged in `EmailLog` with the Resend delivery ID.
* **Resilience:** If the OpenAI API or Resend is unavailable, Inngest backs off and retries for up to 24 hours.
* **Observability:** Structured logging using `pino` for every state transition and email dispatch event.
* **Compliance:** Automatic deletion of `resumeText` and PDF files after `RETENTION_DAYS`. Candidates are warned 7 days in advance via email. Opt-out preferences are honoured; `DATA_RETENTION_WARNING` is the sole exception (legal obligation).
* **Privacy:** No PII (e.g. resume content) is included in email subjects.

---

## 8. Configuration Reference

| Variable | Description | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend API key for transactional email delivery | *(required for email)* |
| `EMAIL_FROM` | Sender address shown on all outbound emails | `noreply@vekt.io` |
| `APP_URL` | Public base URL used to build status page and unsubscribe links | `http://localhost:3000` |
| `AI_PROVIDER` | `mock` \| `openai` \| `ollama` | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (required when `AI_PROVIDER=openai`) | — |
| `OLLAMA_BASE_URL` | Local Ollama endpoint | `http://localhost:11434` |
| `DATABASE_URL` | SQLite path or Turso connection string | `file:./dev.db` |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) | *(required)* |

**Runtime settings (stored in DB, editable via Admin Dashboard):**

| Key | Description | Default |
| --- | --- | --- |
| `RETENTION_DAYS` | Days before a candidate record is eligible for automated scrubbing | `90` |
| `STATUS_EMAIL_DELAY_HOURS` | Hours to wait before sending a status-change email; `0` = immediate | `48` |

---

## 9. Success Metrics

* **Recruiter Efficiency:** Reduction in time spent on initial resume screening by $>70\%$.
* **DevX:** Ability to go from `git clone` to "First Evaluation" in under 3 minutes.
* **Reliability:** 0% "Zombie" applications (applications stuck in `ANALYZING` state).

