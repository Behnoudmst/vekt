# Vekt — Workspace Instructions

Vekt is a self-hosted, AI-powered recruitment platform built with Next.js 15 App Router, Prisma 7 (SQLite), NextAuth v5, and Inngest durable functions.

## Architecture

**Three user roles with distinct UX surfaces:**
- **Public** — job listings (`/jobs/[slug]`) and multi-step apply form
- **Recruiter** — dashboard at `/recruiter/` (shortlist, accept, reject candidates)
- **Admin** — dashboard at `/admin/` (user management, settings, email templates)

**Candidate evaluation pipeline (Inngest-orchestrated):**
```
POST /api/candidates → PDF stored in private/uploads/ → Inngest triggers
  → unpdf text extraction → AI scores CV against job description
  → Score ≥ threshold → SHORTLISTED, else REJECTED
  → Delayed status email scheduled (default 48 h, cancellable)
```

When `INNGEST_EVENT_KEY` is blank (dev), the pipeline runs directly in-process. The data-retention cron only runs when Inngest is active.

**Key directories:**
- `app/` — Next.js App Router pages and API routes
- `lib/` — Core utilities: `ai.ts` (providers), `email.ts` (Resend), `inngest.ts` (client + functions), `scoring.ts` (formula), `schemas.ts` (Zod), `auth.ts` (NextAuth config), `queue.ts` (Inngest event helpers)
- `schema/schema.prisma` — Single source of truth for all models
- `components/ui/` — shadcn/ui components; **always use these over raw HTML elements**
- `generated/` — Prisma client output; never edit manually
- `private/uploads/` — Resume PDFs stored outside web root; served only via `/api/uploads/[filename]` (auth-gated)

## Screening Questions

Jobs can have per-job screening questions (`ScreeningQuestion` → `ScreeningOption` → `CandidateAnswer`).

- `QuestionType`: `SINGLE` (radio) or `MULTIPLE` (checkbox)
- Apply form shows a 2nd step when questions exist; state is preserved across steps
- **IDOR protection**: answer submission validates all `questionId`/`optionId` values belong to the target job
- Recruiters manage questions via `PUT /api/job-listings/[id]/questions`
- Recruiter applications page displays answers alongside AI reasoning

## Email Templates

Email templates are admin-editable and stored in the `EmailTemplate` table (keyed by `EmailType`).

| Type | Trigger |
|---|---|
| `APPLIED` | Candidate submits application |
| `SHORTLISTED` / `REJECTED` / `ACCEPTED` | Status change |
| `DATA_RETENTION_WARNING` | 7 days before auto-deletion |

Template variables: `{{candidateName}}`, `{{jobTitle}}`, `{{companyName}}`, `{{statusPageUrl}}`, `{{retentionDate}}`

`EmailLog` records every sent email with Resend delivery ID for auditing.

## Scoring Formula

$$Score = (Score_{relevance} \times 0.4) + (Score_{experience} \times 0.6)$$

Candidates with $Score \geq threshold$ (default 75) are `SHORTLISTED`. See `lib/scoring.ts`.

## AI Providers

Set `AI_PROVIDER` in env:

| Value | Notes |
|---|---|
| `mock` (default) | Deterministic random — no external calls; safe for dev/test |
| `openai` | GPT-4o; requires `OPENAI_API_KEY` |
| `ollama` | Local model; requires `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

## Build & Dev Commands

```bash
pnpm run dev          # Start Next.js dev server (http://localhost:3000)
pnpm run build        # Production build
pnpm run lint         # ESLint
pnpm run db:migrate   # Run Prisma migrations (creates/updates DB)
pnpm run db:seed      # Seed admin account + sample job + email templates
pnpm run db:generate  # Regenerate Prisma client after schema changes
```

After changing `schema.prisma`, always run `db:migrate` then `db:generate`.

## Key Conventions

- **UI components**: Use `components/ui/` (shadcn) — never raw `<button>`, `<input>`, etc.
- **Validation**: All user input validated with Zod schemas in `lib/schemas.ts`; extend there
- **Auth checks**: API routes use `auth()` from `lib/auth.ts`; role checked via `session.user.role`
- **File serving**: Resumes served via `/api/uploads/[filename]` only — never expose `private/uploads/` directly
- **Logging**: Use `lib/logger.ts` (Pino); always include structured context (`{ candidateId, jobId, step }`)
- **HTML email bodies**: Must go through `lib/sanitize-html.ts` before rendering
- **Status transitions**: `APPLIED → ANALYZING → SHORTLISTED/REJECTED → ACCEPTED/REJECTED` — never skip states

## Environment Variables

```env
# Required
DATABASE_URL="file:/absolute/path/to/dev.db"
AUTH_SECRET=""                    # openssl rand -base64 32
SEED_ADMIN_EMAIL=""
SEED_ADMIN_PASSWORD=""

# Optional — AI
AI_PROVIDER="mock"                # mock | openai | ollama
OPENAI_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL=""

# Optional — Inngest (required for prod pipeline)
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# Optional — Email
RESEND_API_KEY=""
EMAIL_FROM="noreply@vekt.io"

# Optional — Branding/Contact
APP_URL="http://localhost:3000"
COMPANY_NAME="Vekt"
SUPPORT_EMAIL=""
PRIVACY_CONTACT_EMAIL=""
LOG_LEVEL="info"
```

See `.env.example` for the full list.

## Docker

`docker-compose up` starts the app + Inngest together. The `private/uploads/` directory and SQLite file are bind-mounted for persistence. Multi-stage `Dockerfile` compiles `better-sqlite3` native modules; do not bypass this stage.
