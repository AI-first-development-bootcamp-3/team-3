-- CreateEnum
CREATE TYPE "TimeReportAuditAction" AS ENUM ('REPLACED', 'DELETED');

-- CreateTable
CREATE TABLE "time_report_audits" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "action" "TimeReportAuditAction" NOT NULL,
    "previousJson" JSONB NOT NULL,
    "nextJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_report_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_report_audits_employeeId_date_idx" ON "time_report_audits"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "time_report_audits" ADD CONSTRAINT "time_report_audits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_report_audits" ADD CONSTRAINT "time_report_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
