-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "customPrompt" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 75,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Migrate existing rows, using id as slug fallback
INSERT INTO "new_Job" ("id", "slug", "title", "description", "location", "customPrompt", "threshold", "isActive", "createdAt", "updatedAt")
SELECT "id", "id", "title", "description", "location", "customPrompt", "threshold", "isActive", "createdAt", "updatedAt"
FROM "Job";

DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";

CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
