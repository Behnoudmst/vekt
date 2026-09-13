# Human oversight

EU AI Act Art. 14 requires that a high-risk system can be effectively overseen
by a person. GDPR Art. 22 separately restricts decisions based solely on
automated processing that produce legal or similarly significant effects — an
automated job rejection is the textbook example.

## What changed

Before this change, the pipeline set a below-threshold candidate to `REJECTED`
and scheduled a rejection email 48 hours later. If nobody opened the dashboard,
the candidate was rejected by software alone. That is the shape both rules
exist to prevent.

Now:

- Below threshold and `AUTO_REJECT_BELOW_THRESHOLD` is `false` (the default)
  → status `NEEDS_REVIEW`, **no email is scheduled**. The candidate waits for a
  person. The recruiter's decision is what sends mail.
- Below threshold and the deployer has explicitly enabled auto-reject
  → status `REJECTED` and the delayed email, as before. The evaluation row
  records `autoDecision = true`, so it is visible afterwards which decisions
  were made without a human.
- At or above threshold → `SHORTLISTED`, unchanged.

The toggle lives in the admin dashboard with the Art. 22 warning next to it,
and flipping it writes a `logger.warn` line naming the admin who did it.

## Why default off rather than removing it

A deployer outside the EU, or one with an established legal basis and an
explicit-consent flow, may legitimately want automated filtering at volume.
Removing the capability would push those users to patch it back in silently.
Defaulting to off means the safe path is the path of least effort, and turning
it on is a recorded, deliberate act.

## What the interface must let a person do

Vekt's recruiter view shows, per candidate: the score, the model's two-sentence
reasoning, the pros/cons lists, and the screening-question answers. Reviewers
can shortlist, accept or reject regardless of score.

What it does **not** yet do, and what a serious Art. 14 implementation needs:

- surface the provenance fields (provider, model, `evaluatorVersion`) in the UI
  rather than only in the database;
- warn a reviewer when a batch was scored by a different model version than the
  one they have been comparing against;
- show an "explain this score" view to the candidate on request.

These are open issues, not solved problems. See `docs/compliance/README.md`.

## Reviewer guidance to give your team

- The score is a reading-order suggestion, not an assessment.
- Disagreeing with the score is the expected outcome some of the time. If your
  reviewers never override it, oversight is not happening.
- Never tell a candidate the score. Tell them the decision and the reasons a
  person actually relied on.
