-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('CLOCK_IN_OUT', 'SUM_HOURS');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "reportFormat" "ReportFormat" NOT NULL DEFAULT 'CLOCK_IN_OUT';
