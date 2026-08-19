## Why

The **דיווח היעדרות** form always shows a "מתאריך" / "עד תאריך" date-range pair, even though most absences (a sick day, a single vacation day) are one day. This adds friction to the common case and doesn't match the product reference, which leads with a single-day option and offers a secondary link for reporting more days only when needed.

## What Changes

- `AbsenceReportForm` opens in **one-day mode** by default: סוג היעדרות selector plus a single date field. `endDate` is not shown and is submitted equal to `startDate`, matching existing API/schema behavior.
- A secondary link below the date field — "דיווח על היעדרות ליותר מיום אחד" — reveals the "עד תאריך" field so the employee can enter a range. This reveal is **one-way** for the lifetime of that open form (no control to collapse back to one-day mode); closing and reopening the form resets to one-day mode.
- No change to the `/absences` API, the Zod schema, or working-day counting for the create path — `endDate` was already optional and already defaults to `startDate` server-side and client-side.
- Add styling for the new link (and a visual separator) consistent with the existing `absence-report__*` styles.
- **Editing an existing absence:** opening **דיווח היעדרות** for a day that already has a saved absence SHALL pre-fill the form with that absence's type, date(s) — with the multi-day field already expanded if the saved absence spans a range — and attached documents, instead of a blank form. The employee SHALL be able to edit those fields, and saving SHALL update the existing absence row (same `id`) instead of creating a new one.
- **Backend:** add an authenticated update endpoint for an absence the caller owns. It re-validates type/dates the same way `POST /absences` does, recomputes `workingDayCount`, and runs the existing conflict check with `excludeAbsenceId` set to the absence's own id so it doesn't conflict with its own current dates. `AbsenceDto` gains an `attachments` field so the frontend can know what's already attached.
- Out of scope for editing: half-day type (still gated behind SCRUM-149), editing a cancelled absence (a cancelled row is simply not found — 404), bulk edit of multiple absences at once.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `absences-reporting`: the "Hebrew absence form in the daily drawer" requirement changes from always showing both dates to defaulting to one day with a link that reveals the end-date field for a range, and further changes to pre-fill and edit an existing absence when one is already saved for the opened day. Adds a new "Update an absence" backend requirement.

## Impact

- **Frontend:** `team-3/frontend/src/components/AbsenceReportForm.tsx` (day-mode state and conditional rendering; accept an existing-absence prop for pre-fill and switch submit to update-mode), `team-3/frontend/src/components/ManualReport.css` (new link/divider styles), `team-3/frontend/src/components/ManualReport.tsx` (pass the day's saved absence into the form), `team-3/frontend/src/services/absences.ts` (new `updateAbsence` client call), `team-3/frontend/src/types.ts` (`attachments` on `Absence`).
- **Backend:** `backend/src/routes/absence.routes.ts` (new `PATCH /absences/:id` route), `backend/src/controllers/absence.controller.ts` (new handler), `backend/src/services/absence.service.ts` (new `updateAbsence`, reusing `checkAbsenceConflicts` and `expandWorkingDays`; `attachments` added to `AbsenceDto`), `backend/src/types/absence.schema.ts` (new update body schema).
- **Not touched:** `AbsenceReport.schema.ts` (frontend), conflict-check logic itself (`excludeAbsenceId` support already existed), the cancel/delete path, attachment upload flow itself.
- **Tests:** existing coverage under `ManualReport.test.tsx` that exercises the absence tab needs to account for the date field only appearing after the "more days" link is clicked, plus new coverage for pre-fill and update-not-create behavior.
