-- CreateTable
CREATE TABLE "EmailTemplate" (
    "type" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resendId" TEXT,
    CONSTRAINT "EmailLog_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resumePath" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jobId" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" DATETIME,
    "privacyPolicyVersion" TEXT,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("appliedAt", "consentAt", "consentGiven", "email", "id", "jobId", "name", "privacyPolicyVersion", "resumePath", "resumeText", "status", "updatedAt") SELECT "appliedAt", "consentAt", "consentGiven", "email", "id", "jobId", "name", "privacyPolicyVersion", "resumePath", "resumeText", "status", "updatedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
