# Records and logging

Art. 12 requires that a high-risk system keeps records allowing its operation
to be traced. A stored number is not a record: "the AI scored this CV 62" is
untraceable unless you also know which model produced it, from which prompt,
under which version of the code.

## What is stored per evaluation

The `Evaluation` row now carries:

| Field | Purpose |
| --- | --- |
| `score`, `reasoning`, `pros`, `cons` | the model's output |
| `promptSnapshot` | the exact system + user prompt sent |
| `promptHash` | SHA-256 of that snapshot, for grouping and integrity |
| `provider` | `mock` / `openai` / `openrouter` / `ollama` |
| `model` | the exact model identifier the adapter used |
| `evaluatorVersion` | `EVALUATOR_VERSION` in `lib/ai.ts` at the time |
| `redactions` | JSON counts of identifiers removed, e.g. `{"email":1,"name":3}` |
| `autoDecision` | whether the deployer had human review switched off |

Rows written before this change carry `provider = "unknown"`. That is
deliberate: they are not traceable and must not be presented as if they were.

`EVALUATOR_VERSION` must be bumped by hand whenever the prompt, scoring
instructions or redaction behaviour changes. Evaluations from different
versions are not comparable and must not be ranked against each other.

## Structured logs

`lib/queue.ts` logs provider, model, prompt hash, evaluator version and whether
the candidate is awaiting human review at pipeline completion. `lib/logger.ts`
emits structured JSON, so these are queryable in whatever the deployer ships
logs to. Deployers should retain them; the Act expects logs to be kept for an
appropriate period, and "we rotated them after a week" is not an answer to a
candidate's complaint six months later.

## The collision with GDPR

GDPR pushes you to delete candidate data. The AI Act pushes you to keep
decision records. Both are true at once and they are not in conflict if you
separate them:

- **Delete**: the CV file, `resumeText`, name, email — everything that is the
  candidate's personal data. The `purge-expired-candidates` cron already does
  this at `RETENTION_DAYS`.
- **Keep**: the decision, the score, the provenance, the fact a human reviewed
  it. These describe *the system's behaviour*, and most of it is not personal
  data once the candidate record is gone.

Known gap: `promptSnapshot` contains the redacted CV text, so it is deleted
along with the candidate by the cascade. That is the right GDPR answer and a
weak Art. 12 answer. A deployer with a long-lived audit requirement should
consider storing a hash plus the structured fields separately from the
snapshot. Not implemented here.
