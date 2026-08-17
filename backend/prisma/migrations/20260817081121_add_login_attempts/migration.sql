-- CreateEnum
CREATE TYPE "LoginAttemptOutcome" AS ENUM ('CREDENTIAL_REJECTED', 'THROTTLED', 'LOCKED', 'SUCCESS');

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "emailNormalised" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "outcome" "LoginAttemptOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_emailNormalised_createdAt_idx" ON "login_attempts"("emailNormalised", "createdAt");

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
