# Accuracy and limitations

Art. 15 expects declared accuracy metrics and robustness appropriate to the
purpose.

## Declared accuracy

**None.** Vekt has never been measured against a labelled dataset of CVs and
hiring outcomes. No precision, recall, or agreement-with-human-reviewer figure
exists. Any number claimed for Vekt's accuracy today would be invented.

This is the largest gap in the project and it is stated plainly so that no
deployer assumes otherwise.

## Known limitations

- **Scores are not calibrated.** The model is asked to produce an integer 0–100.
  Language models are poor at calibrated numeric judgement; the same CV rescored
  can drift by several points. The threshold (default 75) therefore sits on a
  noisy signal.
- **Scores are not comparable** across models, providers, prompt edits or
  `evaluatorVersion` values.
- **Redaction is best-effort.** `lib/redact.ts` removes direct identifiers.
  It does not remove proxies: university names, languages spoken, military
  service, career gaps, and writing style all carry signals of origin, age and
  gender that the model can and will use.
- **CV formatting affects the outcome.** Text extraction from a two-column or
  graphics-heavy PDF is lossy, which penalises candidates for design choices
  rather than qualifications.
- **Non-English CVs are untested.**
- **The `customPrompt` field is unconstrained.** A deployer can write weighting
  criteria that encode discrimination. Nothing in the code prevents this.
- **`mock` assesses nothing.** It derives a pseudo-score from the prompt hash.

## What a deployer should measure before relying on this

1. Take a set of past applications with known human decisions.
2. Score them with your exact configuration (model, prompt, threshold).
3. Compare against the human decisions — how often does the system rank a hired
   candidate below the threshold?
4. Break that down by whatever protected-characteristic data you may lawfully
   hold, or by proxy groups if you may not.
5. Re-run after every prompt or model change. That is what `evaluatorVersion`
   is for.

Until that is done, the ranking is an unvalidated heuristic, and the fact that a
person makes the final call is the only thing standing between it and a
discriminatory outcome.
