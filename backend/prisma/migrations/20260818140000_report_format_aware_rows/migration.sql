-- Row-level clock pair, set only on rows whose project reports CLOCK_IN_OUT.
-- Nullable by design: every row that exists today is an hours-only row, so
-- NULL is the correct value for all of them and no backfill is needed here.
-- "startTime"/"endTime" keep meaning the day attendance window.
ALTER TABLE "time_reports" ADD COLUMN "rowStartTime" TIME;
ALTER TABLE "time_reports" ADD COLUMN "rowEndTime" TIME;

-- Flip the default away from CLOCK_IN_OUT (see design.md, D8). That default
-- predated TimeReport.hours; keeping it would have made every project created
-- from here on demand per-row clock pairs nobody asked for.
--
-- Deliberately NOT accompanied by an UPDATE over existing rows: the formats
-- already stored were chosen on purpose (the seed sets a mix, and the admin
-- screen has been live), and SQL cannot tell a chosen CLOCK_IN_OUT from an
-- inherited one. Flattening them would discard real configuration. A project
-- still sitting on the old default is one edit away in AdminHourSettings.
ALTER TABLE "projects" ALTER COLUMN "reportFormat" SET DEFAULT 'SUM_HOURS';
