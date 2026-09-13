# Instructions for use

Article 13 requires that a high-risk system ships with instructions that let a
deployer understand its output and use it properly. This is that document.

## Intended purpose

Vekt ranks job applications by estimated relevance to a job description, so a
recruiter can prioritise which applications to read first. It is a
prioritisation aid.

## Not the intended purpose

Do not use Vekt to:

- make a final hiring or rejection decision without a person reviewing it;
- compare candidates across different jobs, different prompts, or different
  `evaluatorVersion` values — those scores are not comparable;
- infer anything about a candidate beyond fit to the stated requirements
  (personality, reliability, likelihood to stay, salary expectations);
- screen for anything the job description does not actually require.

## How a score is produced

1. The candidate uploads a PDF CV (max 5 MB). Text is extracted with `unpdf`.
2. `lib/redact.ts` removes direct identifiers — name, email, phone, URLs, date
   of birth, and lines stating nationality, citizenship, marital status or
   gender — before any text leaves the server.
3. `lib/ai.ts` builds a prompt from the job title, job description, the job's
   optional `customPrompt` weighting criteria, and the redacted CV text.
4. The configured provider (`mock`, `openai`, `openrouter`, `ollama`) returns a
   score 0–100, two sentences of reasoning, and pros/cons lists.
5. `lib/scoring.ts` maps the score onto a status using the job's `threshold`
   (default 75).

The score is produced by a general-purpose language model. It is not a
measurement of anything. Two runs with different models or a changed prompt
will produce different numbers for the same CV.

## Configuration a deployer must set deliberately

| Setting | Default | What it means |
| --- | --- | --- |
| `AI_PROVIDER` | `mock` | `mock` produces a deterministic pseudo-score from the prompt hash and assesses nothing. Never leave it on in production and never treat its output as an evaluation. |
| `AUTO_REJECT_BELOW_THRESHOLD` | `false` | See [`human-oversight.md`](./human-oversight.md). |
| Job `threshold` | 75 | The cut-off is a policy choice with disparate-impact consequences. Write down why you picked it. |
| Job `customPrompt` | none | Free-text weighting criteria injected into the prompt. This is the highest-risk field in the product: it is where a deployer can, accidentally or otherwise, instruct the model to weigh a proxy for a protected characteristic. Review it like you would review a job advert. |
| `RETENTION_DAYS` | 90 | Candidate data purge window. |
| `STATUS_EMAIL_DELAY_HOURS` | 48 | Delay before a status email is sent; cancelled if a recruiter changes the decision first. |

## Information to give candidates

`components/ai-disclosure.tsx` renders the disclosure on the application form
and the status page. It states four things, and a fork should keep all four:

1. an AI system is involved in the assessment;
2. what it does (scores the CV against the posting to help prioritise);
3. that direct identifiers are removed first;
4. that a person decides, and how to ask for an explanation or human review.

Article 50 transparency duties have applied since 2 August 2026 and were not
deferred by the Digital Omnibus. Removing this component from a deployment that
serves EU candidates is a live compliance problem, not a future one.

## Human oversight expected of the deployer

Assign named people who review `NEEDS_REVIEW` candidates, who have the
authority and the time to disagree with the score, and who understand that the
score carries no measured accuracy. Oversight that rubber-stamps the ranking is
not oversight.
