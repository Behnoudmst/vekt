-- Evaluation provenance (EU AI Act Art. 12 record-keeping).
-- Existing rows keep "unknown" provider/model: they were produced before the
-- pipeline recorded provenance and must not be presented as traceable.
ALTER TABLE "Evaluation" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Evaluation" ADD COLUMN "model" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Evaluation" ADD COLUMN "promptHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Evaluation" ADD COLUMN "evaluatorVersion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Evaluation" ADD COLUMN "redactions" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Evaluation" ADD COLUMN "autoDecision" BOOLEAN NOT NULL DEFAULT false;

-- CandidateStatus is stored as TEXT, so the new NEEDS_REVIEW value needs no
-- schema change. No existing rows are migrated: past REJECTED decisions stay
-- as they are recorded.
