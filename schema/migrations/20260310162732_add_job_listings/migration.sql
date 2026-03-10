-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resumePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "scoreQ1" REAL,
    "scoreQ2" REAL,
    "scoreTotal" REAL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jobListingId" TEXT,
    CONSTRAINT "Candidate_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("appliedAt", "email", "id", "name", "resumePath", "scoreQ1", "scoreQ2", "scoreTotal", "status", "updatedAt") SELECT "appliedAt", "email", "id", "name", "resumePath", "scoreQ1", "scoreQ2", "scoreTotal", "status", "updatedAt" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
