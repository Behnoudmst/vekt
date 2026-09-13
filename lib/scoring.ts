import { CandidateStatus } from "@/generated/client";

/**
 * Determines whether a candidate score meets the job's threshold.
 * Candidates at or above threshold are SHORTLISTED.
 */
export function meetsThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}

/**
 * Maps an AI score onto a candidate status.
 *
 * Below-threshold candidates go to NEEDS_REVIEW by default rather than
 * REJECTED. An automatic rejection with no human in the loop is a decision
 * produced solely by automated processing that has a significant effect on the
 * person — the shape Article 22 GDPR restricts, and the case EU AI Act
 * Article 14 human oversight is meant to prevent. Deployers who have their own
 * legal basis can switch it on with the AUTO_REJECT_BELOW_THRESHOLD setting.
 *
 * @param autoRejectEnabled deployer setting; defaults to false everywhere.
 */
export function decideStatus(
  score: number,
  threshold: number,
  autoRejectEnabled: boolean,
): CandidateStatus {
  if (meetsThreshold(score, threshold)) return CandidateStatus.SHORTLISTED;
  return autoRejectEnabled
    ? CandidateStatus.REJECTED
    : CandidateStatus.NEEDS_REVIEW;
}
