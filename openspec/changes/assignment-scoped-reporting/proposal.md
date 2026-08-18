## Why

Any authenticated user can report time against any active client → project →
task in the system. Reproduced on a running instance: `employee@abra.test` is
assigned to 7 tasks, `GET /me/reporting-options` offers him 20, and posting a
report against a task he has no assignment for returns `201`. The dropdown
hands him the unassigned work, so this needs no crafted request — it is the
ordinary path through the UI.

Two holes, both in the time-report service: `listReportingOptions` never
consults `task_assignments`, and the write path checks only that the three
ids form one active hierarchy — never who is asking. The `TaskAssignment`
table exists and is populated; only the enforcement was never wired up. The
main `time-reports` spec still records the gap as intentional ("Until
SCRUM-71, the tree SHALL include all active entities"), so the spec has to
be corrected alongside the code.

## What Changes

- `GET /me/reporting-options` returns only tasks the caller is assigned to,
  pruning projects and clients left empty. Active-only filtering and name
  sorting are unchanged.
- `POST /reports` and `POST /reports/batch` reject a row whose task the
  caller is not assigned to, with a per-row `taskId` detail alongside the
  existing hierarchy errors.
- The gate applies to **every role**. An admin reporting their own time is
  scoped exactly like an employee — admins carry assignments too, so nobody
  is locked out.
- Removing someone's assignment does not strand work they already reported:
  a day already holding a row for that user, date, project, and task can
  still be re-saved. A genuinely new row on an unassigned task is still
  refused.
- **BREAKING** for any caller that relied on the unscoped tree: a user with
  no assignments now receives an empty `clients` array rather than the whole
  catalogue. The entry form already blocks saving on an empty tree with an
  explanation, so this surfaces as existing behavior.

### Non-goals

- The admin screens for creating and editing assignments — those exist
  already.
- Restricting who may *read* reports. This change is about which work a
  person may report against.
- Any change to the frontend. The dropdown renders whatever the endpoint
  returns, so scoping the endpoint scopes the form.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `time-reports`: reporting options are scoped to the caller's assignments
  rather than listing every active entity, and creating a report requires an
  assignment to the task.

## Impact

- `backend/src/services/timeReport.service.ts`: `listReportingOptions` takes
  the caller and filters by `task_assignments`; the create and batch paths
  gain the assignment check. Stale `SCRUM-71` comments in this file go away
  with the gap they described.
- `backend/src/controllers/timeReport.controller.ts`: passes the caller's id
  into `listReportingOptions`.
- `backend/src/routes/test/timeReport.routes.test.ts`: the existing
  "returns the nested active tree sorted by name" case asserts the old
  unscoped behavior and is updated.
- `openspec/specs/time-reports/spec.md`: the "Until SCRUM-71" carve-out is
  removed at archive time.
