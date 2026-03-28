**Security Audit Report**

Project: Vekt  
Date: March 23, 2026  
Scope: Static application security review of auth, authorization, public/protected routes, file handling, deployment config, and dependency posture.

## Findings

### 1. Recruiters can read all candidates, resumes, and AI evaluations across jobs
Severity: High  
Affected area: Authorization, candidate PII, resume access

Why it matters:  
Authenticated recruiter access is not scoped to owned jobs on several read paths. A recruiter can view candidates, emails, AI reasoning, and resume links for jobs they do not own. This is a direct cross-tenant data exposure risk.

Evidence:
- page.tsx
- page.tsx
- route.ts
- route.ts
- route.ts
- route.ts
- [app/recruiter/jobs/[jobId]/page.tsx](app/recruiter/jobs/[jobId]/page.tsx)
- [app/api/uploads/[filename]/route.ts](app/api/uploads/[filename]/route.ts)

Recommended fix:
- Enforce owner-or-admin checks on every recruiter read path.
- Scope candidate queries by job ownership.
- Restrict resume download to authorized users for the related candidate/job.

Suggested issue title:
- Enforce recruiter ownership checks on candidate reads and resume downloads

### 2. Recruiters can change the status of any candidate by ID
Severity: High  
Affected area: Authorization, workflow integrity, candidate communications

Why it matters:  
The recruiter review endpoint updates candidate status after checking only that the user is signed in. Since candidate IDs are exposed through broad recruiter views, any recruiter can accept, reject, or shortlist another recruiter’s candidates and trigger outbound emails.

Evidence:
- [app/api/recruiter/review/[id]/route.ts#L16](app/api/recruiter/review/[id]/route.ts#L16)
- [app/api/recruiter/review/[id]/route.ts#L30](app/api/recruiter/review/[id]/route.ts#L30)
- [app/api/recruiter/review/[id]/route.ts#L42](app/api/recruiter/review/[id]/route.ts#L42)
- [app/api/recruiter/review/[id]/route.ts#L49](app/api/recruiter/review/[id]/route.ts#L49)

Recommended fix:
- Load the candidate’s related job before mutation.
- Allow status changes only for the owning recruiter or an admin.
- Return `403` on cross-owner access attempts.

Suggested issue title:
- Add ownership enforcement to recruiter candidate review endpoint

### 3. Stored XSS via unsanitized job descriptions
Severity: High  
Affected area: Public job pages, recruiter dashboard, authenticated browser sessions

Why it matters:  
Job descriptions are accepted as arbitrary strings and rendered with `dangerouslySetInnerHTML`. A recruiter can store malicious HTML/JS and execute script in another user’s browser when they view job cards or job pages.

Evidence:
- schemas.ts
- page.tsx
- [app/jobs/[slug]/ApplyForm.tsx#L106](app/jobs/[slug]/ApplyForm.tsx#L106)
- JobListingsSection.tsx

Recommended fix:
- Sanitize description HTML server-side with a strict allowlist.
- Prefer storing structured rich text or markdown instead of raw HTML.
- Add a CSP as defense in depth.

Suggested issue title:
- Sanitize stored job description HTML to prevent XSS

### 4. Docker deployment includes predictable secrets and seeded admin credentials
Severity: High  
Affected area: Deployment security, auth, signed callbacks

Why it matters:  
The compose file and seed flow allow insecure defaults for `AUTH_SECRET`, `INNGEST_SIGNING_KEY`, and admin credentials. The entrypoint also runs the seed script automatically. A careless self-hosted deployment can start with guessable secrets and known admin login values.

Evidence:
- docker-compose.yml
- docker-compose.yml
- docker-compose.yml
- docker-compose.yml
- docker-entrypoint.sh
- docker-entrypoint.sh
- seed.ts
- seed.ts
- seed.ts

Recommended fix:
- Remove insecure default secrets from production manifests.
- Fail startup when required secrets are missing.
- Make seeding explicit or one-time only.
- Remove default fallback admin passwords from seed logic.

Suggested issue title:
- Remove insecure deployment defaults and auto-seeded admin credentials

### 5. Public status and unsubscribe flows use raw candidate IDs as bearer tokens
Severity: Medium  
Affected area: Candidate privacy, link security, email preference integrity

Why it matters:  
Anyone with a candidate ID can access the status page and unsubscribe the candidate. The unsubscribe route is also a state-changing `GET`, which is vulnerable to mailbox link scanners and accidental prefetch.

Evidence:
- email.ts
- email.ts
- email.ts
- email.ts
- email.ts
- [app/status/[id]/page.tsx#L19](app/status/[id]/page.tsx#L19)
- [app/status/[id]/page.tsx#L26](app/status/[id]/page.tsx#L26)
- [app/status/[id]/page.tsx#L27](app/status/[id]/page.tsx#L27)
- [app/status/[id]/page.tsx#L113](app/status/[id]/page.tsx#L113)
- route.ts
- route.ts

Recommended fix:
- Replace candidate IDs in public links with separate high-entropy tokens.
- Make unsubscribe a signed POST or confirmation flow.
- Add expiry and regeneration for public tokens.

Suggested issue title:
- Replace raw candidate ID links with signed public tokens

## Open Questions / Assumptions

- This report assumes recruiters should only access candidates for jobs they own. That appears consistent with the ownership checks already present in [app/api/job-listings/[id]/route.ts#L48](app/api/job-listings/[id]/route.ts#L48) and [app/api/job-listings/[id]/route.ts#L51](app/api/job-listings/[id]/route.ts#L51).
- I did not run live DAST or package-manager audit commands during this review.
- I did not confirm a specific lockfile CVE from the currently pinned dependencies. Dependency risk is present mainly as process risk, especially around use of beta auth packages.

## Hardening Backlog

1. Add rate limiting for login and candidate submission endpoints.
2. Add security headers in next.config.ts or upstream proxy:
   - Content-Security-Policy
   - X-Frame-Options or `frame-ancestors`
   - Strict-Transport-Security
3. Review whether admin routes should also be covered by middleware, even though server-side page and API checks already exist.
4. Add CI security checks:
   - dependency audit
   - container image scanning
   - secret detection
   - basic SAST rules

## Recommended Priority

1. Fix recruiter read/write authorization
2. Fix stored XSS in job descriptions
3. Remove insecure deployment defaults
4. Replace raw candidate-ID public links
5. Add platform hardening controls