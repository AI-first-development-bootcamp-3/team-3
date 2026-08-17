## Why

SCRUM-144's working-day calculation is the shared rule every Absences feature needs to turn a date range into a duration. Left unwritten, the first endpoint that needs it (create/view absence) would invent its own Friday/Saturday exclusion, and a second would likely diverge from it. SCRUM-155 delivers that single, pure function; SCRUM-156 locks its edge-case behavior down with tests before anything else depends on it.

## What Changes

- Add a pure function that expands a date range into the list of working days (Israeli work week: Sunday–Thursday, excluding Friday and Saturday) and returns a count for display _(SCRUM-155)_
- Reject inverted ranges (end date before start date) rather than silently returning an empty or negative result _(SCRUM-155)_
- Leave an explicit extension point for a future holiday calendar; Israeli public holidays are **not** implemented now _(SCRUM-155, per SCRUM-144)_
- Add unit tests covering: a range spanning one or more weekends, a range consisting only of Friday/Saturday (zero working days), single-day ranges on both a working day and a weekend day, an inverted range, and ranges crossing a month and a year boundary _(SCRUM-156)_

### Non-goals

- No Israeli holiday calendar — only the injection point is provided (deferred scope per SCRUM-144)
- No database access and no HTTP endpoint — this is a pure function; wiring it into an Absences create/view endpoint is separate, later work
- No frontend display of the resulting count

## Capabilities

### New Capabilities

- `backend/working-day-calculation`: Shared pure function that expands a date range into working days (Sun–Thu) and a count, with an extension point for a future holiday calendar. Single source of truth — no other code should implement its own weekend exclusion.

### Modified Capabilities

None — first change introducing this capability.

## Impact

**Created:** `backend/src/services/workingDays.service.ts`, `backend/src/services/test/workingDays.service.test.ts`

**Dependencies introduced:** none (native `Date`, no new npm packages)

**External systems:** none

**Downstream:** Future Absences endpoints (duration calculation on create/view) are expected to call this function rather than reimplementing weekend logic

**Constraints carried from Jira:** SCRUM-144 acceptance criteria — excludes Friday and Saturday; returns a count the UI can show; extension point left for a future holiday calendar (not implemented now); single source of truth with no duplicate weekend logic elsewhere in the codebase
