## Context

SCRUM-114 is the first employee hours slice. Auth, Prisma Client/Project/Task, Ant Design forms, and `apiClient` already exist. There is no assignment join (SCRUM-71) and no report table.

Routes mount at the server root (`POST /login`), not under `/api`.

## Goals / Non-Goals

**Goals:** persist one report; Hebrew entry form with cascade; save + reset; tests with each slice.

**Non-Goals:** assignment filter, 9h warnings UX, listing today's rows, edit, month lock, timer.

## Decisions

### Model name `TimeReport`, HTTP path `/reports`

`TimeReport` avoids clashing with generic “report”. Path stays `/reports` to match Jira and keep URLs short. Why not `/api/reports`: existing routers have no `/api` prefix.

### Store `clientId` + `projectId` + `taskId` and verify they match

Jira lists all three FKs. The service loads the task with project+client and rejects mismatches or inactive rows with `400`. Why not task-only: the ticket requires persisting all three; verification prevents inconsistent rows.

### `date` as `@db.Date`, times as `@db.Time`

A timesheet is a calendar day plus wall-clock range in Israel, not an overnight UTC interval. Overnight (end before start) is `400` in this change (data integrity); 9h warnings stay in SCRUM-115.

### `userId` from JWT `sub` only

Prevents filing hours as someone else (IDOR). Admins creating reports for others is a later story.

### Temporary unfiltered `GET /me/reporting-options`

The form needs a tree. SCRUM-71 will filter to assigned tasks. Why `/me/`: the resource is already “for the current user”; filtering later does not change the path.

### Imperative submit (not `useMutation`)

Login already uses `try/catch` + `isSubmitting`. There is no list cache to invalidate yet.

## Risks / Trade-offs

Employees currently see every active task until SCRUM-71. Acceptable for this slice; documented in code and Non-goals.

## Migration Plan

Additive Prisma migration. No existing table changes besides new relations on User/Client/Project/Task.

## Open Questions

None blocking. Assignment filter deferred to SCRUM-71 by team decision.
