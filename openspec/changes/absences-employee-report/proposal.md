## Why

Employees have no way to report an absence yet: `frontend/src/pages/Absences.tsx` is a one-line placeholder (`<h1>Absences</h1>`), and no `absence.service.ts`/`controller`/`routes` exist anywhere in the repo. This is SCRUM-147 (parent) / SCRUM-162 (backend), SCRUM-163 (frontend), SCRUM-164 (tests).

## What Changes

- `POST /absences` — authenticated employee submits `type`, `startDate`, and an optional `endDate` (defaults to `startDate` for a single-day absence). Working days are computed via the shared `expandWorkingDays` utility (Fri/Sat excluded); a conflict check runs before the row is persisted; `userId` is always the JWT subject, never a body field.
- Hebrew RTL, mobile-first absence report form (`ManualAbsence`, sibling to the existing `ManualReport` work-report component — see design.md Decisions for why): type picker (חופשה - חצי יום / חופשה - יום מלא / מחלה / מילואים / אחר), single-date or date-range input, a visible working-day count, and conflict/validation errors shown against the specific date(s). Replaces the `Absences.tsx` placeholder and is reachable both as its own route and as the second tab of the existing `ManualReport` entry modal.
- Reconcile the frontend's existing provisional `Absence` type (`frontend/src/types/absence.ts`) with the real backend contract — it currently has a `missingDocument` field with no backend equivalent and a `cancelled` flag that doesn't match the backend's `isActive` soft-delete convention (see design.md Decisions).
- Backend route/service tests and frontend schema/component tests covering all four types, single date, a range, a range spanning a weekend, and conflict rejection naming the clashing dates.

### Non-goals

- Half-day for non-Vacation types — the Figma mock (see design.md Decisions) exposes half-day only as a Vacation sub-option ("חופשה - חצי יום" vs "חופשה - יום מלא"); Sick/Reserve/Other are always full-day in this change.
- Editing or cancelling an absence (SCRUM-150), attaching a supporting document (SCRUM-148, also visible in the Figma mock but not built here — see design.md Decisions), the month-close guard (SCRUM-146, not yet spec'd), and any admin-facing view or approval flow.
- A history/listing view of past absences — out of SCRUM-147's acceptance criteria.
- A live server-side "preview the working-day count before submit" endpoint — the form computes its own pre-submit preview (see design.md Decisions); only the actual `POST` response is authoritative.

## Capabilities

### New Capabilities

- `backend/absences-create`: authenticated employee creates an absence (fixed type list, single date or range, weekend-excluded working-day count, pre-persistence conflict check).
- `frontend/absences-report-form`: Hebrew RTL absence-reporting form — type selection, single/range date input, working-day count display, per-date error display.

## Impact

- **Affected code**: new `backend/src/{types/absence.schema.ts, services/absence.service.ts, controllers/absence.controller.ts, routes/absence.routes.ts}`; new `frontend/src/{services/absences.ts, components/ManualAbsence.tsx, components/ManualAbsence.schema.ts, components/ManualAbsence.css}`; edits to `frontend/src/pages/{Absences.tsx, Reports.tsx}`, `frontend/src/components/ManualReport.tsx` (new optional `onSwitchToAbsence` prop, tab enabled), and `frontend/src/types/absence.ts`; `app.ts` route mount. See design.md Decisions for why the component is `ManualAbsence` (not the originally-planned standalone `AbsenceReportForm`) and how it's reached from two places.
- **Prerequisites resolved via a branch sync (2026-08-17):** `Absences/Employee-reports/SCRUM-147` has been synced onto `origin/development` (`f823a05`), bringing in the `Absence` Prisma model / `AbsenceType` enum (SCRUM-151), `workingDays.service.ts` / `expandWorkingDays` (SCRUM-155/156), and `absenceConflict.service.ts` / `checkAbsenceConflicts` (SCRUM-145/157/158, merged into `origin/development` ahead of this branch at `a365561`). All three are now present and usable — see design.md Context.
- **No new schema in this change** — it consumes the `Absence`/`AbsenceType` shape already defined by `absences-schema` (SCRUM-151), now present on this branch.
