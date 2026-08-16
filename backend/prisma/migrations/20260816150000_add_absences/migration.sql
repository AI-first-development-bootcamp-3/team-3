-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK', 'RESERVE_DUTY', 'OTHER');

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "absenceId" TEXT;

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "halfDay" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
-- Not representable via Prisma's schema syntax (no `@@check` in this
-- Prisma version) — added as raw SQL so it exists at the database level
-- regardless of which code path writes a row.
ALTER TABLE "absences" ADD CONSTRAINT "absences_date_range_valid" CHECK ("endDate" >= "startDate");

-- CreateIndex
CREATE INDEX "absences_userId_isActive_startDate_endDate_idx" ON "absences"("userId", "isActive", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "absences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
