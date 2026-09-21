-- CreateEnum
CREATE TYPE "SeasonType" AS ENUM ('HUMAN_MMA', 'ROBOT_ROOSTER');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "virtualCoins" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "specWeight" TEXT NOT NULL,
    "specStyle" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "seasonType" "SeasonType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fights" (
    "id" TEXT NOT NULL,
    "competitorAId" TEXT NOT NULL,
    "competitorBId" TEXT NOT NULL,
    "oddA" DOUBLE PRECISION NOT NULL,
    "oddB" DOUBLE PRECISION NOT NULL,
    "seasonType" "SeasonType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "chosenWinnerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "potentialPayout" DOUBLE PRECISION NOT NULL,
    "oddAtPlacement" DOUBLE PRECISION NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "competitors_seasonType_idx" ON "competitors"("seasonType");

-- CreateIndex
CREATE INDEX "fights_seasonType_isFinished_idx" ON "fights"("seasonType", "isFinished");

-- CreateIndex
CREATE INDEX "fights_scheduledAt_idx" ON "fights"("scheduledAt");

-- CreateIndex
CREATE INDEX "bets_userId_status_idx" ON "bets"("userId", "status");

-- CreateIndex
CREATE INDEX "bets_fightId_status_idx" ON "bets"("fightId", "status");

-- AddForeignKey
ALTER TABLE "fights" ADD CONSTRAINT "fights_competitorAId_fkey" FOREIGN KEY ("competitorAId") REFERENCES "competitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fights" ADD CONSTRAINT "fights_competitorBId_fkey" FOREIGN KEY ("competitorBId") REFERENCES "competitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fights" ADD CONSTRAINT "fights_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "fights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_chosenWinnerId_fkey" FOREIGN KEY ("chosenWinnerId") REFERENCES "competitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
