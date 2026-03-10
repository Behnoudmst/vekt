# 📝 PRD: Automated Recruitment Orchestration Engine (AROE)

## 1. Executive Summary

The **Spark-hire** is a backend-heavy orchestration system designed to automate the screening and ranking of candidates. By integrating two external evaluation services and a weighted scoring algorithm, the system identifies "Top Talent" (Score $\ge 75$) and surfaces them to human recruiters via a priority queue.
 
Search for the skills that might help you with implementation and use the skills available. 

## 2. Target Personas

* **The Candidate:** Needs a seamless way to apply and clear instructions for the next steps (questionnaires).
* **The Recruiter:** Needs an interface that shows only high-quality candidates, sorted by their calculated potential.
* **The Developer (Evaluator):** Needs to see clean code, error handling, and a way to test the "black-box" integrations.

## 3. Functional Requirements

### 3.1 Candidate Ingestion (Step 1)

* **Feature:** Multi-part form for basic data (Name, Email) and PDF Resume upload.
* **Constraint:** pdf files will be stored in local disk.
* **Database:** A `Candidate` record is created with a status of `INITIAL_APPLIED`.


### 3.2 Automated Evaluation Workflow (Steps 2 & 3)

The engine must trigger two sequential or parallel external calls:

* **Service 1 (Questionnaire):** Analysis of written responses.
* **Service 2 (Automated Call):** Analysis of verbal/audio questionnaire.
* **Production Requirement:** Since these are "black boxes," the engine must implement **Retries** if the service is down and **Webhooks** (or polling) to receive the results.

### 3.3 The Scoring Engine (Step 4)

* **Logic:** Once both scores are received, the engine calculates the weighted average.
* **Formula:** 
$$Score_{total} = (Score_{Q1} \times 0.4) + (Score_{Q2} \times 0.6)$$


* **Threshold:** If $Score_{total} \ge 75$, the candidate is flagged for the **Priority Queue**.

### 3.4 Recruiter Interface (Steps 5 & 6)

* **Feature:** A protected dashboard for recruiters.
* **View:** A "Priority Queue" list sorted by `Score` (descending) and `ApplicationDate` (ascending).
* **Action:** A "Review" button that allows the recruiter to see the PDF and finalize the hire/reject decision.

---

## 4. Technical Architecture (Next.js Specific)

### 4.1 State Management (The Database)

We will use **SQLite** with the following `CandidateStatus` enum:

1. `APPLIED`
2. `PENDING_Q1` (Waiting for first service)
3. `PENDING_Q2` (Waiting for call results)
4. `SCORED`
5. `PRIORITY_QUEUE` (Score $\ge 75$)
6. `REJECTED` (Score $< 75$)
7. `HUMAN_REVIEWED` (Final state)

### 4.2 Durable Execution (The "Secret Sauce")

To make it production-ready in a serverless environment like Next.js, we will use **Inngest**.

* **Why?** If the "Automated Call" service takes 5 minutes to process, a standard Next.js API route will time out. Inngest allows the function to "sleep" and wait for an event (the score) without crashing.

### 4.3 External Service Simulation

We will create a `/lib/mocks` directory that implements the `QuestionnaireService` interface. This allows the evaluator to run the project without needing real API keys for 3rd party services.

---

## 5. Non-Functional Requirements (Production Readiness)

* **Observability:** Implement structured logging (e.g., `Pino`) to track every state change for every candidate.
* **Security:** API routes for the Recruiter Dashboard must be protected (use  NextAuth).
* **Validation:** All incoming data must be validated using **Zod** schemas to prevent SQL injection or corrupt scoring data.
* **Interactivity:** Provide a **Swagger (OpenAPI)** UI via `next-swagger-doc` so the evaluator can trigger steps manually.
* **database:** use Prisma with a SQlite database 

**ui:** Use shadcn ui components for login and general forms etc. 

**api and state:** Use Zustand for global state and axios for api calls
---

## 6. Success Metrics

* **Correctness:** Does the math match the 40/60 weighted requirement?
* **Resilience:** Does the app handle a "Service 1 Failed" scenario?
* **Clarity:** Is the "Priority Queue" easily identifiable in the UI?

---


**Updated Features**
in recruiter dashboard, there should be possibility for him to add new job listings, These listings will be visible on the home page as list and visitors can apply to each of them. make the necessarry changes


