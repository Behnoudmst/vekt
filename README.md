# Vekt — AI-Powered Recruitment Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

Vekt is a self-hosted recruitment platform that automates candidate screening using AI. Recruiters post jobs, candidates apply with a CV, and an AI pipeline scores and ranks applicants — surfacing the best ones in a priority queue for human review.

---

## Features

- **AI resume scoring** — pluggable provider: `mock` (default), OpenAI, or local Ollama
- **Durable evaluation pipeline** — powered by [Inngest](https://inngest.com); falls back to direct execution when no event key is configured
- **Recruiter dashboard** — shortlist, accept, or reject candidates; view per-candidate AI analysis
- **Admin dashboard** — manage recruiter accounts, configure data retention
- **GDPR-compliant** — strictly necessary cookies only, configurable auto-deletion of candidate data, privacy policy included
- **Swagger UI** — full API documentation at `/api-docs`
- **Docker-ready** — single `docker-compose up` to run locally

---

## How It Works

```
Candidate submits application (name, email, PDF CV)
  └─ PDF stored on disk
  └─ DB record created  →  status: APPLIED

Inngest pipeline triggers
  └─ PDF text extracted (unpdf)
  └─ AI scores the CV against the job description
  └─ Score ≥ threshold  →  status: SHORTLISTED
     Score < threshold  →  status: REJECTED

Recruiter reviews shortlisted candidates
  └─ Accept   →  status: ACCEPTED
  └─ Shortlist (re-queue)  →  status: SHORTLISTED
  └─ Reject   →  status: REJECTED
```

### Scoring Formula

$$Score_{total} = (Score_{relevance} \times 0.4) + (Score_{experience} \times 0.6)$$

Candidates with $Score_{total} \ge 75$ are surfaced in the **Shortlisted** queue.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via **Prisma 7** + `better-sqlite3` |
| Auth | **NextAuth v5** — credentials (email + bcrypt password) |
| AI Pipeline | **Inngest** (durable functions) |
| AI Providers | Mock · OpenAI · Ollama |
| PDF Extraction | **unpdf** |
| Validation | **Zod** |
| Logging | **Pino** (structured JSON; pretty-printed in dev) |
| UI Components | **shadcn/ui** + Tailwind CSS v4 |
| Rich Text | **Tiptap** |
| API Docs | **Swagger UI** |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Clone & install

```bash
git clone https://github.com/Behnoudmst/vekta.git
cd vekta
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — the minimum required variables:

```env
# Absolute path to the SQLite database file
DATABASE_URL="file:/absolute/path/to/dev.db"

# Any random string ≥ 32 characters
AUTH_SECRET="your-secret-min-32-chars"

# Seed credentials
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="change-me"
SEED_RECRUITER_EMAIL="recruiter@example.com"
SEED_RECRUITER_PASSWORD="change-me"
```

See [`.env.example`](.env.example) for all available options including AI provider configuration.

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Seed the database

Creates one **Admin** account and one **Recruiter** account using the credentials from `.env`.

```bash
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## AI Providers

Set `AI_PROVIDER` in `.env` to one of the following:

| Value | Description | Required env vars |
|---|---|---|
| `mock` (default) | Random deterministic scores — no external calls | — |
| `openai` | GPT-4o via OpenAI API | `OPENAI_API_KEY` |
| `ollama` | Local model via Ollama | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

---

## Docker

```bash
docker-compose up --build
```

The compose file mounts a local `./data` volume for the SQLite file and uploads. No external services required.

---

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/apply` | Public | Candidate application form |
| `/status/[id]` | Public | Application status tracker |
| `/privacy` | Public | GDPR privacy policy |
| `/login` | Public | Recruiter / admin login |
| `/recruiter` | Recruiter | Shortlisted candidates queue |
| `/recruiter/all` | Recruiter | All candidates with actions |
| `/admin` | Admin | User management + data retention settings |
| `/api-docs` | Public | Swagger UI — full API reference |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed admin + recruiter accounts |
| `npm run db:generate` | Regenerate Prisma client after schema changes |

---

## License

MIT — see [LICENSE](LICENSE).

| `/recruiter` | **Priority Queue** — candidates with score ≥ 75, sorted by score desc |
| `/recruiter/all` | All candidates with status and scores |
| `/api-docs` | Swagger UI — interactive API documentation |

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/candidates` | — | Submit application (multipart/form-data) |
| `GET` | `/api/candidates` | — | List all candidates (debug) |
| `GET` | `/api/recruiter/queue` | ✅ | Priority queue (score ≥ 75) |
| `PATCH` | `/api/recruiter/review/:id` | ✅ | Record HIRE / REJECT decision |
| `GET` | `/api/swagger` | — | OpenAPI 3.0 JSON spec |

---

## Candidate Status Flow

```
APPLIED → PENDING_Q1 → PENDING_Q2 → PRIORITY_QUEUE → HUMAN_REVIEWED
                                  ↘ REJECTED (score < 75 or service failure)
```

---

## Resilience

- Each external service call is retried up to **3 times** with exponential back-off.
- If Service 1 fails all retries, the candidate is marked `REJECTED` and the pipeline exits gracefully.
- Set `MOCK_Q1_FAIL=true` in `.env` to test this path.

---

## NPM Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed default recruiter user
npm run db:generate  # Regenerate Prisma client after schema changes
```
