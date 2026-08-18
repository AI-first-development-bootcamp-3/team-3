-- AlterTable
ALTER TABLE "time_reports" ADD COLUMN "hours" DECIMAL(4,1);

UPDATE "time_reports"
SET "hours" = ROUND((
  CASE
    WHEN "endTime" > "startTime" THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 3600.0
    ELSE EXTRACT(EPOCH FROM ("endTime" - "startTime" + INTERVAL '24 hours')) / 3600.0
  END
)::numeric, 1);

ALTER TABLE "time_reports" ALTER COLUMN "hours" SET NOT NULL;
