# 📝 PRD: Vekt – Automated Recruitment Orchestration Engine

**Version:** 2.2 (Finalized Rebrand)

**Project Name:** **Vekt** (derived from "Weight")

**Status:** Implementation Ready

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


* **Magic Links:** Candidates receive a secure link to view their application status without a password.

### 4.4 Dashboards

* **Recruiter Dashboard:** A "Priority Queue" showing high-scoring candidates first. Includes an "Override" button to manually move candidates.
* **Admin Dashboard:** Manage recruiter accounts, set global `RETENTION_DAYS` for data scrubbing, and monitor API token usage.

---

## 5. Technical Architecture

### 5.1 The Stack

* **Framework:** Next.js 15 (App Router).
* **ORM/DB:** Prisma + SQLite (Default) / Turso (Production/Edge).
* **Orchestration:** **Inngest** (handles retries, delays, and background AI processing).
* **Styling:** Tailwind CSS + shadcn/ui.
* **Auth:** NextAuth.js (supporting `.env` based admin credentials).

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
}

model Evaluation {
  score            Int
  reasoning        String
  promptSnapshot   String      // The prompt used at time of scoring
  candidateId      String      @unique
}

```

---

## 6. The "Vekt" Evaluation Workflow

Vekt uses a layered prompt approach to calculate the final score ($S$):

$$S = f(\text{System Prompt}, \text{Recruiter Context}, \text{Job Prompt}, \text{Resume})$$

1. **Ingest:** Candidate uploads PDF $\rightarrow$ Text extracted using unpdf package $\rightarrow$ File stored in `/uploads`.
2. **Trigger:** Inngest sends a webhook to the `analyze_candidate` worker.
3. **Context Assembly:** System pulls the **Job Custom Prompt** and **Recruiter Preferences**.
4. **AI Request:**
* If `AI_PROVIDER=ollama`, send to local endpoint.
* If `AI_PROVIDER=openai`, send to GPT-4o.


5. **State Update:** Candidate is moved to `QUEUED` if $S \ge \text{threshold}$, else `FLAGGED`.

---

## 7. Non-Functional Requirements

* **Auditability:** Every score must be accompanied by the `promptSnapshot` so recruiters know *why* the AI gave that score.
* **Resilience:** If the OpenAI API is down, Inngest will back off and retry for up to 24 hours.
* **Observability:** Structured logging using `pino` for every state transition.
* **Compliance:** Automatic deletion of `resumeText` and PDF files after `RETENTION_DAYS`.

---

## 8. Success Metrics

* **Recruiter Efficiency:** Reduction in time spent on initial resume screening by $>70\%$.
* **DevX:** Ability to go from `git clone` to "First Evaluation" in under 3 minutes.
* **Reliability:** 0% "Zombie" applications (applications stuck in `ANALYZING` state).

---

### Would you like me to generate the **`README.md`** for the GitHub repository based on this PRD to help you start the project?