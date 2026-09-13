# Compliance

Vekt screens CVs for employment decisions. In the EU that is a regulated
activity, and this directory documents what the software does about it.

**This is engineering documentation, not legal advice.** Nothing here makes
anyone compliant. It exists so that a deployer, an auditor or a candidate can
find out what the system actually does without reading the source.

## Where Vekt sits

Screening CVs for hiring is an Annex III high-risk use under the EU AI Act,
alongside evaluating exams and assessing loan applications. The
free-and-open-source exemption in Article 2(12) does not help: it does not
apply to systems placed on the market or put into service as high-risk systems,
or to systems falling under Article 5 or Article 50. Vekt being MIT-licensed
changes nothing about this.

## Who is responsible for what

| Role | Who | Obligations |
| --- | --- | --- |
| Provider | Whoever places the system on the market or puts it into service under their own name | Risk management, data governance, record-keeping, transparency, human oversight, accuracy (Arts. 9–15), plus conformity assessment and registration |
| Deployer | The organisation running a Vekt instance to screen its own applicants | Use it per the instructions, assign competent human oversight, inform candidates, keep logs |

If you fork Vekt, configure it and run it to hire for your own company, you are
the deployer. If you package it and offer it to others as a hiring product, you
are the provider and the heavy obligations are yours — not the upstream
project's.

Using an open-weights model (Ollama, Qwen, Llama) inside the pipeline does not
reduce anything. The provider of the overall system is responsible for
documenting and bias-testing the whole system including the model component,
even where the model's own publisher never did.

## Dates that matter

| Date | What applies |
| --- | --- |
| 2 Feb 2025 | Article 5 prohibited practices |
| 2 Aug 2026 | Article 50 transparency duties — **already in force**, and they apply based on what a system does, not its risk tier |
| 2 Dec 2026 | Art. 50(2) watermarking for systems already on the market; new Art. 5 prohibitions |
| 2 Dec 2027 | Annex III high-risk obligations (Arts. 9–15 etc.) |

The high-risk date moved from 2 August 2026 to 2 December 2027 under Regulation
(EU) 2026/1744, the Digital Omnibus on AI, which entered into force on 27 July
2026. That is a deferral, not a repeal. The Article 50 duties were **not**
deferred, which is why the candidate-facing disclosure in
`components/ai-disclosure.tsx` is not optional today.

## Contents

- [`instructions-for-use.md`](./instructions-for-use.md) — what the system does, its
  limits, and how to configure it (Art. 13)
- [`human-oversight.md`](./human-oversight.md) — the human-in-the-loop design and the
  `AUTO_REJECT_BELOW_THRESHOLD` switch (Art. 14, GDPR Art. 22)
- [`records-and-logging.md`](./records-and-logging.md) — what is recorded per decision
  and how it collides with GDPR deletion (Art. 12)
- [`accuracy-and-limitations.md`](./accuracy-and-limitations.md) — known failure modes
  and the accuracy figures Vekt does **not** have (Art. 15)

## What is still missing

Honest list, because a compliance directory that only lists wins is worthless:

- No accuracy or bias metrics have been measured. See
  [`accuracy-and-limitations.md`](./accuracy-and-limitations.md).
- No risk management system (Art. 9) — that is an organisational process, not a
  file in a repo, and it belongs to whoever acts as provider.
- No conformity assessment, CE marking or EU database registration.
- No fundamental rights impact assessment template for deployers.
- Redaction is regex-based and best-effort; it removes direct identifiers, not
  every proxy for them.
