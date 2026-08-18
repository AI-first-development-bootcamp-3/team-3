## Context

See proposal.md - Why. SCRUM-69 explicitly calls out that the behavior when
a client is deactivated must be defined and documented, not left implicit —
this design records that decision.

## Goals / Non-Goals

**Goals:**
- An explicit, testable answer to "what happens to a project when its
  client is deactivated"

**Non-Goals:**
- Any UI or workflow for reviewing/cleaning up orphaned-looking projects
  under an inactive client — not asked for, can be a future story if needed

## Decisions

**Deactivating a client does not cascade to its projects.** A project's
`isActive` is independent of its client's `isActive`. Rationale: cascading
deactivation would silently change data an admin didn't directly touch —
exactly what SCRUM-69 says not to do ("does not silently delete its
projects"). The admin can still see and manage those projects normally;
the project list simply also shows which client (active or not) each
project belongs to.

*Alternative considered:* auto-deactivate a client's projects when the
client is deactivated. Rejected — explicitly ruled out by the acceptance
criteria.

*Alternative considered:* block deactivating a client that still has active
projects. Rejected — no such constraint is in the acceptance criteria, and
it would make client deactivation needlessly two-step for no stated benefit.

**New projects can only be created under an active client, but existing
projects under a client that later becomes inactive stay as they are.**
The active-client restriction applies at creation time only — it's a
data-entry guard, not an ongoing invariant enforced retroactively.

## Risks / Trade-offs

- [An admin viewing the project list might not immediately notice a
  project's client has been deactivated] → Mitigated by the list showing
  the client's status alongside the project's own (from `frontend-admin-
  projects`'s spec: the list surfaces the client column).
