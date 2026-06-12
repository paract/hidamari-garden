-- CreateTable
CREATE TABLE "EvolutionSettings" (
    "level" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stageName" TEXT NOT NULL,
    "requiredAtsc" DECIMAL NOT NULL,
    "requiredExp" INTEGER NOT NULL
);
