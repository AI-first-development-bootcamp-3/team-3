## Context

Repo state as of this branch (`Absences/Employee-reports/SCRUM-147`), checked directly rather than assumed, 2026-08-17:

- This branch's `development` ancestor is `9d7ad13` (`Merge main into development...`). `origin/development` has moved to `175178a` — **98 commits ahead**. `git merge-base --is-ancestor` confirms neither the schema nor working-days work has reached this branch.
- **Missing from this branch, present on `origin/development`:** the `Absence` model + `AbsenceType` enum and `Attachment.absenceId` (SCRUM-151/`absences-schema`); `backend/src/services/workingDays.service.ts` exporting `expandWorkingDays(start, end, options?): { workingDays: Date[]; count: number }` (SCRUM-155/156/`working-day-calculation`, Sun–Thu week, throws `AppError.badRequest` on an inverted range, holiday-calendar extension point unused). This branch's `backend/prisma/schema.prisma` currently has no `Absence` model at all.
- **Already present on this branch** (predate the fork, unaffected by the staleness above): Hebrew `dayjs` locale (SCRUM-38), Ant Design + `ConfigProvider` (SCRUM-36), the react-hook-form + `zodResolver` form pattern (SCRUM-37), `apiClient.request`/`ApiError`, and the `authenticate`/`requireRole` middleware with `req.user = { sub, role }`.
- **Not merged anywhere yet, not even on `origin/development`:** conflict validation (SCRUM-145/157/158) exists only on the unmerged sibling branch `Absences/conflict-validation/SCRUM-145`, whose tip (`59e4a0d`) already has a complete, tested `checkAbsenceConflicts({ userId, startDate, endDate, halfDay, excludeAbsenceId? }): Promise<{ hasConflict: boolean; conflicts: { date: string; reason: 'OVERLAPPING_ABSENCE' | 'WORK_HOURS_CONFLICT' }[] }>` — it checks both overlapping absences and reported work-hour budget (9h full day / 4.5h half day). This is not an assumed interface — the real implementation exists, it just isn't merged.
- The frontend has a provisional `Absence` type (`frontend/src/types/absence.ts`) predating the real schema: `missingDocument: boolean` has no backend equivalent, and `cancelled: boolean` doesn't match the backend's `isActive` soft-delete flag (true = active, inverted sense). `pages/Absences.tsx` is a one-line placeholder.
- `POST /reports` (`scrum-114-single-report`) is the closest shipped precedent for this shape: `userId` from JWT `sub` only, zod body validation, imperative submit (not `useMutation`), 400 `details` mapped to inline field errors on the frontend. This change reuses that shape rather than inventing a new one.

## Goals / Non-Goals

**Goals:**
- Define `POST /absences` and the report form precisely enough to implement in one pass once the two prerequisite gaps above (schema/working-days sync, conflict-validation merge) are resolved.
- Reuse existing conventions (`AppError`, `validate` middleware, JWT-`sub`-as-owner, form/error patterns) rather than introducing new ones.

**Non-Goals:**
- Resolving the branch staleness or merging SCRUM-145 — this proposal specs against their contracts and flags both as blocking prerequisites in tasks.md, but doesn't perform the merges itself.
- Half-day UI (see proposal.md Non-goals and Open Questions below).

## Decisions

### `POST /absences`, root-mounted, no `/api` prefix
Matches existing routes (`/reports`, `/login`) — this codebase's routers all mount at server root.

### `userId` from JWT `sub` only, never a request-body field
Same rationale as `scrum-114`: an employee reporting their own absence must not be able to file one as someone else (IDOR). Admin-on-behalf reporting is out of scope for SCRUM-147.

### `endDate` optional in the request, defaults to `startDate` server-side
Matches the parent story's AC ("Either a single date or a date range"). A single date is represented as `startDate === endDate` on the stored row, per `absences-schema`'s own requirement ("Single-day absence has equal start and end date") — no separate "is this a range" flag needed.

### `type` wire format: uppercase enum values, matching the `Role` precedent
`AbsenceType` in Prisma is `VACATION | SICK | RESERVE_DUTY | OTHER`. The existing `Role` enum (`ADMIN`/`EMPLOYEE`) is validated with `z.enum(Role)` and sent/received uppercase over the wire (`adminUser.schema.ts`) — this change follows the same convention rather than inventing a lowercase wire format. The frontend's current lowercase `AbsenceType` union (`'vacation' | 'sick' | ...`) is updated to match; the four Hebrew display labels live in a `{ value, label }` map in the form component regardless, since Ant Design's `Select` needs that shape either way.

### Conflict rejection reuses the existing `ErrorDetail[]` shape, on `409`
`checkAbsenceConflicts` returns `{ date, reason }[]`. Rather than inventing a new response shape for this one endpoint, the service maps each conflict to `{ field: <ISO date>, message: <Hebrew reason text> }` and throws `AppError.conflict(...)` with those as `details` — the same shape `validate` already produces for `400`s. The frontend's existing "map `error.details` to inline errors" pattern (established in `ReportEntryForm`/`scrum-114`) then handles both `400` and `409` uniformly with no new client-side branch. Matches `admin-create-user-backend`'s precedent of using `409`/`AppError.conflict` for "well-formed request, conflicts with current state."

### Working-day count preview is computed client-side, not fetched
SCRUM-163's AC requires the count to be visible before submit, and this change adds no live-preview endpoint (see proposal.md Non-goals). The form re-implements the same trivial Sun–Thu exclusion `expandWorkingDays` already does (a five-line pure function) purely for instant UI feedback. The `POST /absences` response's own count remains authoritative and is what's shown after a successful save; the pre-submit number is a preview only. Trade-off: if a holiday calendar is ever added to the backend utility, this client copy would silently drift — accepted for now (no holiday calendar exists yet on either side), flagged in Risks.

### `halfDay` defaults to `false`, no form control added
The schema field exists (`absences-schema`) and `checkAbsenceConflicts` already consumes it, but no acceptance criterion across SCRUM-147/162/163/164 mentions a half-day input. Building a control nobody asked for risks guessing wrong at the UX; omitting it entirely risks blocking a need product actually has. Resolved here as: default `false`, ship without the control, revisit as a fast-follow if product confirms it's needed — see Open Questions.

## Risks / Trade-offs

**Branch is 98 commits behind `origin/development`.** Syncing may surface merge conflicts well beyond the Absences epic (e.g. SCRUM-188 lockout, SCRUM-218 session revocation, admin CRUD/reports work all landed in that gap). → Mitigation: sync as its own prerequisite commit (tasks.md 0.1), before any Absences-specific code is written, so conflict resolution isn't tangled with new feature code.

**Conflict validation (SCRUM-145) isn't merged anywhere.** This change's core AC depends on it. → Mitigation: tasks.md 0.2 calls this out as blocking; the merge-order decision (merge SCRUM-145 into `development` first vs. cherry-pick its service file onto this branch) is left as an explicit open question rather than assumed, since it affects other teams' branches too.

**Client-side working-day preview can drift from the backend's count** if the backend utility's behavior changes (e.g. a future holiday calendar) without a matching frontend update. → Mitigation: documented here explicitly; the authoritative count always comes from the `POST` response, the client number is labeled/treated as a preview only.

## Migration Plan

No new schema in this change — `Absence`/`AbsenceType` and their migration already exist via `absences-schema` (SCRUM-151) and arrive with the branch sync (tasks.md 0.1).

## Open Questions

- **Merge order for SCRUM-145**: does this change wait for `Absences/conflict-validation/SCRUM-145` to merge into `development` first, or cherry-pick `absenceConflict.service.ts` directly onto this branch? Affects tasks.md 0.2 and whoever owns SCRUM-145's PR.
- **Half-day**: confirm with product/PM whether SCRUM-147's form needs a half-day toggle now or in a later story. Doesn't change `POST /absences`' shape (the field and default already exist) — only whether a control is added in SCRUM-163's scope.
