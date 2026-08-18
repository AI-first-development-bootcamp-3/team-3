## Context

See proposal.md — Why. What shapes the approach:

- `TaskAssignment` is current-state only: presence of the row means assigned,
  removal means not assigned. There is no history and no soft-delete flag, so
  "was this person assigned when they reported?" is a question the data
  cannot answer.
- Every user already carries assignments — admins 4–7, employees 7–8 — so a
  uniform gate locks nobody out.
- `createTimeReportBatch` already reads the day's stored rows before its
  transaction deletes them, keyed by project + task, because a row keeps the
  report format it was saved under (`report-format-aware-entry`, D6). That
  same read answers "did this row already exist?" for free.
- The entry form already blocks saving on an empty options tree with an
  explanation, so scoping the endpoint needs no frontend counterpart.

## Goals / Non-Goals

**Goals:**

- One rule, enforced on the write path, that the dropdown merely reflects.
- No way for an admin's later edit to strand work someone already reported.

**Non-Goals:**

- Restricting who may read reports.
- Recording assignment history so past authorization can be reconstructed.

## Decisions

### D1: No role bypass

The gate applies to `ADMIN` and `EMPLOYEE` alike. An admin reporting their own
time is reporting their own time.

*Alternative considered:* let admins see and report against everything, on
the reasoning that they administer the catalogue anyway. Rejected — it
reinstates the exact hole for the accounts with the most reach, and the data
gives no reason to: admins carry assignments like everyone else. Administering
projects and reporting hours against them are different acts.

### D2: `400` with a per-row `taskId` detail, not `403`

`403` is the better verb for an authorization refusal, but a day is submitted
as one batch and refused as one response. A single `403` cannot say *which*
row was the problem, and the form marks errors per card. So the refusal joins
the existing per-row `ErrorDetail` channel that hierarchy errors already use,
under its own message.

It also keeps the response indistinguishable in shape from "no such active
task", which avoids turning the endpoint into an oracle for the catalogue the
caller cannot see.

### D3: A row already reported survives losing its assignment

Withdrawing an assignment must not make an employee's submitted day
unsavable — they would be unable to correct a typo on work they genuinely did.
So a submitted row that matches a row already stored for that caller, date,
project, and task is allowed through the gate; anything new is not.

This deliberately mirrors how the same endpoint already treats report format
(`report-format-aware-entry`, D6): an admin's setting change never rewrites
or blocks history. The carve-out is narrow — it needs an exact match on all
four fields, and it reuses the map that read is already building, so it costs
no extra query.

*Trade-off:* someone unassigned from a task can still re-save a day that
already contains it, including editing that row's hours. That is the price of
not stranding their data, and it cannot be used to report against anything
new. If assignment withdrawal ever needs to be immediate and total, the
honest fix is to delete or archive the affected rows explicitly rather than
to leave a day the person can open but never save.

### D4: Scope in the query, not after it

`listReportingOptions` filters through the assignment relation in the Prisma
query rather than fetching everything and filtering in memory, so the
catalogue the caller cannot see is never loaded.

## Risks / Trade-offs

- **A user with no assignments now sees an empty form** → the form already
  handles the empty tree with an explanation; this is existing behavior, not
  a new dead end. Worth checking the copy reads sensibly for someone newly
  hired and not yet assigned.
- **Assignment has no history**, so D3's "already reported" carve-out is the
  only thing standing between an admin's edit and someone's unsavable day.
  If the carve-out is ever removed, that consequence returns.
- **Two pending changes modify the same two requirements.**
  `report-format-aware-entry` also rewrites "Reporting options for the entry
  form" and touches the same service. This change's MODIFIED block builds on
  that wording → archive `report-format-aware-entry` first, or reconcile the
  two blocks by hand.

## Migration Plan

No schema change and no data migration. Backend-only; the frontend picks up
the scoped tree without redeploying anything of its own. Rollback is reverting
the service and controller changes.
