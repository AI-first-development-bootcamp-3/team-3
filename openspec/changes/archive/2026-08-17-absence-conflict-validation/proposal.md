## Why

Absences and reported work hours are recorded through separate paths with nothing between them today: an employee could submit a full-day vacation on a date that already has a full 9-hour time report, or two overlapping absence requests, and neither would be caught. SCRUM-145 exists to close that gap. SCRUM-157 builds the one shared rule that detects these clashes; SCRUM-158 locks its behavior down with tests before the create endpoint (SCRUM-162) and the update/cancel endpoints (SCRUM-173) are built on top of it — both are required by SCRUM-145's own acceptance criteria ("enforced server-side").

## What Changes

- Add a shared, server-side conflict-check function that a proposed absence (user, date range, half-day flag) is run through before it is persisted, covering both the create and edit paths from one implementation _(SCRUM-157)_
- Detect overlap with another active absence for the same user, for any degree of range overlap (not just identical dates) _(SCRUM-157)_
- Detect a full-day absence proposed on a date that already has a full day of work reported (9 of 9 standard hours, per SCRUM-117's daily total) _(SCRUM-157)_
- Permit a half-day absence alongside up to a half-day of reported work (4.5 of 9 hours, per SCRUM-149) on the same date — the one allowed combination _(SCRUM-157)_
- Ignore cancelled (soft-deleted) absences when checking for overlap — enforced automatically once `Absence` is added to the Prisma soft-delete extension, not reimplemented here _(SCRUM-157)_
- Return the specific clashing dates (plus which rule each one tripped) so the calling endpoint can compose its own user-facing message; this function itself returns locale-agnostic data — Hebrew message composition is explicitly the calling endpoint's concern, not this change's _(SCRUM-157)_
- Add tests covering both rejection paths, the one allowed combination, partial-range overlap, and the cancelled-absence exclusion _(SCRUM-158)_

### Non-goals

- No Hebrew error copy — this change returns structured, locale-agnostic conflict data; formatting it into the Hebrew message SCRUM-145 requires is done by whichever endpoint calls this function (SCRUM-162 / SCRUM-173)
- No HTTP endpoint — this is a service-level function; wiring it into `POST /absences` and the update/cancel endpoints is SCRUM-162 and SCRUM-173's work, not this change's
- No month-lock enforcement — that is SCRUM-159, a separate server-side guard layered on top of the same mutating paths
- No client-side/preview validation — SCRUM-145's own acceptance criteria is explicit that the UI may preview but must not be the only check; a frontend preview, if built, is separate work
- No Israeli holiday calendar — inherited as-is from SCRUM-144/155's working-day function, unchanged here

## Capabilities

### New Capabilities
- `backend/absence-conflict-validation`: Shared function that checks a proposed absence against a user's existing absences and reported work hours, and reports the specific conflicting dates and reasons.

### Modified Capabilities

None.

## Impact

**Created:** `backend/src/services/absenceConflict.service.ts`, `backend/src/services/test/absenceConflict.service.test.ts`

**Blocking dependencies — not yet on this branch:**
- `Absence` Prisma model and migration (designed in `openspec/changes/absences-schema/`, built on branch `Absences/data-model-and-migrations/SCRUM-151`) — not present on `Absences/conflict-validation/SCRUM-145` yet
- `TimeReport` model and migration (`client_id, project_id, task_id, date, work_location, start_time, end_time, description, user_id`, per SCRUM-121, built on branch `feat/SCRUM-121-reports-post`, currently in review) — not present on this branch yet
- This change cannot be implemented until both land here (merge or rebase from `development` once available)

**Reused, already on this branch's ancestry but not yet merged into it either:** `expandWorkingDays` (`backend/src/services/workingDays.service.ts`, branch `Absences/Working-day-calculation/SCRUM-144`) — the natural fit for turning an absence's date range into the individual dates to check, rather than reimplementing range iteration here

**Downstream:** SCRUM-162 (create absence endpoint) and SCRUM-173 (update/cancel absence endpoints) call this function before persisting; SCRUM-149 (half-day absence UX) depends on this rule already existing

**External systems:** none — no new npm packages; reads only the existing (once-merged) `Absence` and `TimeReport` tables via Prisma
