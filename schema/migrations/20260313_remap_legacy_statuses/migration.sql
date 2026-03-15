-- Remap legacy CandidateStatus values to the new enum (run once, idempotent)
UPDATE "Candidate" SET status = 'QUEUED'         WHERE status = 'PRIORITY_QUEUE';
UPDATE "Candidate" SET status = 'FLAGGED'        WHERE status = 'NOT_SUITABLE';
UPDATE "Candidate" SET status = 'FLAGGED'        WHERE status = 'REJECTED';
UPDATE "Candidate" SET status = 'ANALYZING'      WHERE status = 'PROCESSING';
UPDATE "Candidate" SET status = 'HUMAN_REVIEWED' WHERE status = 'HIRED';
