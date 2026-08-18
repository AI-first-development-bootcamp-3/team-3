-- AlterTable
-- The column is added with DEFAULT CURRENT_TIMESTAMP, which is correct for
-- newly created users but WRONG for the existing rows this ADD COLUMN also
-- populates: authenticate() rejects any token whose iat predates
-- sessionsValidFrom, so stamping every existing user with the migration's
-- execution time would log every current user out at deploy. The UPDATE
-- below immediately backfills existing rows to a timestamp older than any
-- token that could possibly still be live (30 days, the remember-me
-- lifetime) so their sessions survive the deploy. See
-- openspec/changes/user-logout/design.md, Migration Plan step 1.
ALTER TABLE "users" ADD COLUMN     "sessionsValidFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: push every row that existed before this migration back before
-- the oldest possible live token, rather than to the migration timestamp.
UPDATE "users" SET "sessionsValidFrom" = CURRENT_TIMESTAMP - INTERVAL '30 days';
