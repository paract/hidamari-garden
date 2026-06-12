-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '00:00',
    "endTime" TEXT NOT NULL DEFAULT '23:59',
    "sponsorName" TEXT,
    "announcement" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DailyKeyword" ("announcement", "createdAt", "date", "id", "keyword", "sponsorName") SELECT "announcement", "createdAt", "date", "id", "keyword", "sponsorName" FROM "DailyKeyword";
DROP TABLE "DailyKeyword";
ALTER TABLE "new_DailyKeyword" RENAME TO "DailyKeyword";
CREATE UNIQUE INDEX "DailyKeyword_date_key" ON "DailyKeyword"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
