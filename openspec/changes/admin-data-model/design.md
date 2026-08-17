## Context

See proposal.md - Why. `Client`, `Project`, `Task` models and their FK chain
already exist in `backend/prisma/schema.prisma` from earlier sprints; only
the assignment join table and task status are net-new. The soft-delete
convention (SCRUM-51) is already established via `isActive` on `User`,
`Client`, `Project`, `Task`, and `Absence` — this change follows the same
pattern rather than introducing a new one.

## Goals / Non-Goals

**Goals:**
- Add exactly the two missing pieces: `TaskAssignment` and `Task.status`
- Keep the migration additive — no changes to existing columns, no data
  backfill beyond a default value

**Non-Goals:**
- Redesigning `Client`/`Project`/`Task` — they already satisfy SCRUM-63's
  base-table requirements
- Assignment history/audit trail — out of scope per the spec (current-state
  only, see `specs/admin-data-model/spec.md`)

## Decisions

**`TaskAssignment` as a plain join table, not a soft-deletable entity.**
Unlike `User`/`Client`/`Project`/`Task`, an assignment has no independent
lifecycle worth preserving — "was this user ever assigned to this task" is
not a reporting requirement the way "was this task ever active" is. Row
presence == assigned; row absence == not assigned. Composite unique on
`(userId, taskId)` prevents duplicates at the DB level, matching the spec's
no-op-on-duplicate scenario.

*Alternative considered:* an `isActive` flag on `TaskAssignment` mirroring
the other models, with removal as a soft-delete. Rejected — it would leave
an ever-growing table of stale assignment rows with no scenario that reads
them, adding complexity the requirements don't ask for.

**`Task.status` as a new enum field, `isActive` untouched.**
Keeps the existing soft-delete semantics of `isActive` exactly as-is (no
migration risk to already-shipped code paths that read it), and adds
open/closed as an orthogonal concept — same separation already used for
`Absence.isActive` vs. its business state (see
`openspec/changes/absences-schema/design.md`).

*Alternative considered:* repurpose `isActive` as open/closed and add a
separate `isDeleted` for soft-delete. Rejected — larger migration surface
(every existing `isActive` read across the codebase would need re-auditing)
for no requirement that asks for it.

## Risks / Trade-offs

- [Two independent Task states (`isActive`, `status`) is one more field for
  future admin screens to reason about] → Mitigated by the spec scenarios
  making the independence explicit, and by `admin-crud-patterns` (SCRUM-65)
  building one shared form pattern that both fields plug into consistently.

## Migration Plan

Single additive Prisma migration:
1. Add `TaskStatus` enum (`OPEN`, `CLOSED`) and `Task.status` column,
   default `OPEN` — safe for existing rows, no backfill logic needed
2. Add `TaskAssignment` table with FKs to `User` and `Task`, composite
   unique on `(userId, taskId)`
3. Run via the existing SCRUM-44 migration tooling; no rollback complexity
   beyond the standard `prisma migrate` down path since nothing existing is
   altered
