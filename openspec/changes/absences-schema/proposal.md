## Why

SCRUM-143 ("Absence data model + migrations") needs its shape settled before any migration is written, per its subtask SCRUM-151. The absences domain touches an existing ambiguity in the schema — an `Attachment` model that was built anticipating absence supporting documents but isn't yet wired to an absence — plus overlapping "status" concepts across the parent ticket, the soft-delete convention (SCRUM-51), and the frontend's existing `Absence` type. This change settles those before code is written, so the team can review the shape once rather than during a PR.

## What Changes

- Introduce an `Absence` entity: one row per absence (not per day), with `userId`, `type`, `startDate`/`endDate`, `halfDay`, and `isActive` doubling as both SCRUM-51's soft-delete flag and the "cancelled" business state.
- Introduce an `AbsenceType` enum (`VACATION`, `SICK`, `RESERVE_DUTY`, `OTHER`), matching the frontend's existing `AbsenceType` union.
- Record the team's decision on how absence supporting documents are stored: extend the existing `Attachment` model with a nullable `absenceId` relation, rather than introducing a new `AbsenceDocument` model.
- Record an indexing note (`userId`, `startDate`, `endDate`) supporting the conflict-validation (SCRUM-145) and month-lock (SCRUM-146) lookups that will consume this schema.
- No schema, migration, or application code changes — this change produces the design artifacts only.

## Capabilities

### New Capabilities
- `backend/absences-data-layer`: schema-level requirements for storing absences and their supporting documents — entity shape, date-range representation, type/half-day representation, and soft-delete behavior.

### Modified Capabilities
_(none — the existing `backend/data-layer` and `backend/file-storage` capabilities, defined in the still-open `backend-foundation` change, are extended by this change's recommended direction but their requirements are not altered by this change itself; any edit to those specs happens when SCRUM-143 implements the migration.)_

## Impact

- **Affected specs**: adds `specs/backend/absences-data-layer/spec.md` in this change; no existing spec files are edited.
- **Affected code**: none in this change. Once reviewed, SCRUM-143 will edit `backend/prisma/schema.prisma` (add `Absence` model, `AbsenceType` enum, extend `Attachment` with a nullable `absenceId`), `backend/src/config/prisma.ts` (add `Absence` to `SOFT_DELETE_MODELS`), and add a Prisma migration.
- **Affected downstream tickets**: SCRUM-144 (working-day calculation), SCRUM-145 (conflict validation), SCRUM-146 (month-lock), SCRUM-147–150 (absence stories) all depend on the shape recorded here.
