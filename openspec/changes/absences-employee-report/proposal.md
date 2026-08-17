## Why

Employees have no way to report an absence yet: `frontend/src/pages/Absences.tsx` is a one-line placeholder (`<h1>Absences</h1>`), and no `absence.service.ts`/`controller`/`routes` exist anywhere in the repo. This is SCRUM-147 (parent) / SCRUM-162 (backend), SCRUM-163 (frontend), SCRUM-164 (tests).

## What Changes

- `POST /absences` — authenticated employee submits `type`, `startDate`, and an optional `endDate` (defaults to `startDate` for a single-day absence). Working days are computed via the shared `expandWorkingDays` utility (Fri/Sat excluded); a conflict check runs before the row is persisted; `userId` is always the JWT subject, never a body field.
- Hebrew RTL, mobile-first absence report form, replacing the `Absences.tsx` placeholder: type dropdown (חופשה / מחלה / מילואים / אחר), single-date or date-range picker, a visible working-day count, and conflict/validation errors shown against the specific date(s).
- Reconcile the frontend's existing provisional `Absence` type (`frontend/src/types/absence.ts`) with the real backend contract — it currently has a `missingDocument` field with no backend equivalent and a `cancelled` flag that doesn't match the backend's `isActive` soft-delete convention (see design.md Decisions).
- Backend route/service tests and frontend schema/component tests covering all four types, single date, a range, a range spanning a weekend, and conflict rejection naming the clashing dates.

### Non-goals

- Half-day input — the `Absence.halfDay` schema field exists (from `absences-schema`) but none of SCRUM-147/162/163/164's acceptance criteria mention a half-day control; this change defaults it to `false` and adds no UI for it. Flagged as an open question in design.md, not silently decided.
- Editing or cancelling an absence (SCRUM-150), attaching a supporting document (SCRUM-148), the month-close guard (SCRUM-146, not yet spec'd), and any admin-facing view or approval flow.
- A history/listing view of past absences — out of SCRUM-147's acceptance criteria.
- A live server-side "preview the working-day count before submit" endpoint — the form computes its own pre-submit preview (see design.md Decisions); only the actual `POST` response is authoritative.

## Capabilities

### New Capabilities

- `backend/absences-create`: authenticated employee creates an absence (fixed type list, single date or range, weekend-excluded working-day count, pre-persistence conflict check).
- `frontend/absences-report-form`: Hebrew RTL absence-reporting form — type selection, single/range date input, working-day count display, per-date error display.

## Impact

- **Affected code**: new `backend/src/{types/absence.schema.ts, services/absence.service.ts, controllers/absence.controller.ts, routes/absence.routes.ts}`; new `frontend/src/{services/absences.ts, components/AbsenceReportForm.tsx, components/AbsenceReportForm.schema.ts}`; edits to `frontend/src/pages/Absences.tsx` and `frontend/src/types/absence.ts`; `app.ts` route mount.
- **Blocking gap, checked directly on this branch today (2026-08-17):** `Absences/Employee-reports/SCRUM-147` was forked from a `development` pointer that is **98 commits behind `origin/development`**. It is missing the `Absence` Prisma model / `AbsenceType` enum (landed via SCRUM-151) and `workingDays.service.ts` / `expandWorkingDays` (landed via SCRUM-155/156) — both hard prerequisites for section 1 of tasks.md. See design.md Context for the full list of what's present vs. missing.
- **Depends on, not yet merged anywhere:** conflict validation (SCRUM-145/157/158, `absenceConflict.service.ts`'s `checkAbsenceConflicts`) exists in full only on the unmerged sibling branch `Absences/conflict-validation/SCRUM-145`. This change's AC ("conflict check runs before the absence is persisted") cannot be implemented until that lands or is otherwise brought in — see design.md Open Questions for the merge-order decision this needs.
- **No new schema in this change** — it consumes the `Absence`/`AbsenceType` shape already defined by `absences-schema` (SCRUM-151), once synced onto this branch.
