## Why

SCRUM-63 asks for the schema backing the admin epic (SCRUM-5): tables for
clients/projects/tasks with active/inactive flags, project→client and
task→project FKs, a many-to-many user↔task assignment, and open/closed status
on tasks — all following the SCRUM-51 soft-delete convention (no hard
deletes) and running through the SCRUM-44 migration tooling.

Most of this already exists: `backend/prisma/schema.prisma` already has
`Client`, `Project`, and `Task` models with `isActive` soft-delete flags and
the `project → client` / `task → project` foreign keys (added in earlier
sprints, ahead of this epic being scoped). The two pieces that are actually
missing are (1) the `User ↔ Task` many-to-many assignment — nothing currently
links a user to a task — and (2) a task-lifecycle status distinct from
`isActive`: today `Task.isActive` only means "not soft-deleted," but the
acceptance criteria call for open/closed as its own concept, mirroring how
`Absence.isActive` deliberately does *not* double as business status (see
`openspec/changes/absences-schema/design.md`) — that same separation applies
here.

## What Changes

- New `TaskAssignment` join table: `userId` + `taskId` (composite unique),
  `createdAt`; no soft-delete flag of its own — an assignment is either
  present or removed (removal is an admin action, not user-facing history to
  preserve)
- `Task.status` enum (`OPEN` / `CLOSED`), default `OPEN`, added alongside the
  existing `Task.isActive` — `isActive` keeps meaning "soft-deleted or not,"
  `status` is the separate open/closed lifecycle SCRUM-63 asks for
- One migration via the existing Prisma migration tooling (SCRUM-44),
  following the soft-delete convention (SCRUM-51) — no hard deletes anywhere
  in this change
- `Client`, `Project`, `Task` base tables, their `isActive` flags, and their
  FK chain are confirmed as already satisfying SCRUM-63 — **no changes to
  those** beyond adding `Task.status`

### Non-goals

- Any CRUD endpoints or UI for clients/projects/tasks/assignments — that's
  SCRUM-67/68/69/70/71, each depending on this change
- Changing `Client`/`Project`'s existing `isActive`-only soft-delete — only
  `Task` gets an additional status field, per the acceptance criteria

## Capabilities

### New Capabilities

- `backend-admin-data-model`: the `TaskAssignment` join table and `Task`
  lifecycle status that the rest of the admin epic's CRUD stories depend on

## Impact

- `backend/prisma/schema.prisma`: add `TaskAssignment` model, add `status`
  field + `TaskStatus` enum to `Task`
- New migration under `backend/prisma/migrations/`
- No API or frontend code touched by this change
