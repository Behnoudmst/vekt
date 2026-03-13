/**
 * Determines whether a candidate score meets the job's threshold.
 * Candidates at or above threshold are SHORTLISTED; below are REJECTED.
 */
export function meetsThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}
