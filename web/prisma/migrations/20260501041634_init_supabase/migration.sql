-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionSettings" (
    "level" INTEGER NOT NULL,
    "stageName" TEXT NOT NULL,
    "requiredAtsc" DECIMAL(65,30) NOT NULL,
    "requiredExp" INTEGER NOT NULL,

    CONSTRAINT "EvolutionSettings_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "WalletLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyKeyword" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '00:00',
    "endTime" TEXT NOT NULL DEFAULT '23:59',
    "sponsorName" TEXT,
    "announcement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReward_userId_date_key" ON "DailyReward"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLinkToken_token_key" ON "WalletLinkToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "DailyKeyword_date_key" ON "DailyKeyword"("date");

-- AddForeignKey
ALTER TABLE "DailyReward" ADD CONSTRAINT "DailyReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
