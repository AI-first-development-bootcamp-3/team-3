## Context

See proposal.md - Why. `admin-crud-patterns` (SCRUM-65) built
`AdminEntityForm` around an `isActive` toggle, since every other admin
entity (users, clients, projects) uses `isActive` as its soft-delete
mechanism. `admin-data-model` (SCRUM-63) added `Task.status` (open/closed)
as a separate field from `Task.isActive` specifically because SCRUM-70 wants
"delete" to mean closed, not deactivated.

## Goals / Non-Goals

**Goals:**
- Task's "delete" maps to `status: CLOSED`, matching SCRUM-70's acceptance
  criteria exactly, without changing `AdminEntityForm`'s contract for every
  other entity that genuinely uses `isActive`

**Non-Goals:**
- Redesigning `AdminEntityForm` itself — this change adapts how it's used
  for tasks, not the shared component

## Decisions

**`AdminEntityForm`'s toggle slot is wired to `Task.status` (open ↔ closed)
for the tasks screen, not `Task.isActive`.** `Task.isActive` keeps its
generic soft-delete meaning (available if a task ever needs true removal
from listings, e.g. created in error) but SCRUM-70's UI and API surface
only exposes and edits `status`. This keeps `AdminEntityForm` reusable as a
"toggle + confirm" pattern in general (the toggle's bound field is a prop,
not hardcoded to `isActive`) rather than forking a separate form component
just for tasks.

*Alternative considered:* give tasks their own bespoke form component
instead of reusing `AdminEntityForm`. Rejected — the toggle+confirm
structure is identical; only which field it binds to differs, which is a
parameterization, not a different pattern.

## Risks / Trade-offs

- [Two boolean-ish states on `Task` (`isActive`, `status`) not both exposed
  in this screen could confuse a future contributor] → Mitigated by this
  design doc and by `admin-data-model/design.md` already stating the same
  separation; `Task.isActive` is intentionally untouched by this change.
