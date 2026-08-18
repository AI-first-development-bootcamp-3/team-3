-- CreateEnum
CREATE TYPE "WorkClockSessionStatus" AS ENUM ('ACTIVE', 'AWAITING_CONFIRM', 'DISCARDED');

-- CreateTable
CREATE TABLE "month_locks" (
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT NOT NULL,

    CONSTRAINT "month_locks_pkey" PRIMARY KEY ("year","month")
);

-- CreateTable
CREATE TABLE "work_clock_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "status" "WorkClockSessionStatus" NOT NULL,
    "autoStopped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_clock_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_clock_sessions_userId_status_idx" ON "work_clock_sessions"("userId", "status");

-- AddForeignKey
ALTER TABLE "work_clock_sessions" ADD CONSTRAINT "work_clock_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
