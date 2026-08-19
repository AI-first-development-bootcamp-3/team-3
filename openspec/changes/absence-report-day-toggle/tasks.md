## 1. Form state

- [x] 1.1 Add local `isMultiDay` state (default `false`) to `AbsenceReportForm`
- [x] 1.2 When `isMultiDay` is `false`, render only the type selector and the start date field; keep `endDate` unset (submitted equal to `startDate`, as the schema already handles)
- [x] 1.3 Add the "דיווח על היעדרות ליותר מיום אחד" link/button below the date field that sets `isMultiDay` to `true`; do not render any control that sets it back to `false`

## 2. Range mode

- [x] 2.1 When `isMultiDay` is `true`, render the existing "עד תאריך" field alongside/below the start date field and hide the "more days" link
- [x] 2.2 Confirm the working-day count (`countWorkingDays`) and conflict/validation banners behave unchanged in both modes

## 3. Styling

- [x] 3.1 Add styles for the new link/divider in `ManualReport.css` near the existing `.absence-report__*` rules, matching the visual weight of the reference screenshot (small underlined link, centered)

## 4. Tests

- [x] 4.1 Update `ManualReport.test.tsx` (and/or add a dedicated `AbsenceReportForm.test.tsx`) to cover: default one-day view has no end-date field, clicking the link reveals it, one-day submit sends `endDate === startDate`, range submit sends the entered `endDate`
- [x] 4.2 Run the frontend test suite and confirm no existing absence-tab tests broke

## 5. Backend: schema and service

- [x] 5.1 Add `updateAbsenceBodySchema` to `absence.schema.ts` (same shape as `createAbsenceBodySchema`: `type`, `startDate`, optional `endDate`, optional `attachmentIds`, same inverted-date refinement)
- [x] 5.2 Add `attachments` to `AbsenceDto` and populate it in `createAbsence` and `listAbsencesForMonth` from `Attachment` rows where `absenceId` matches
- [x] 5.3 Add `updateAbsence(userId, absenceId, input)` to `absence.service.ts`: `findFirst` by id (404 if not found — soft-delete filter already excludes cancelled rows), 403 if `row.userId !== userId`, recompute `workingDayCount` via `expandWorkingDays`, run `checkAbsenceConflicts` with `excludeAbsenceId: absenceId` (409 on conflict), `prisma.absence.update` with the new type/dates, reconcile `attachmentIds` as the full desired set (unlink removed ones, link newly submitted ones with the existing ownership constraint), return the updated `AbsenceDto` including `attachments`

## 6. Backend: route and controller

- [x] 6.1 Add `updateMyAbsence` controller calling `updateAbsence`, returning `200` with the updated absence
- [x] 6.2 Add `PATCH /absences/:id` route: `authGuardRateLimit`, `authenticate`, `writeRateLimit`, `validate({ params: absenceIdParamSchema, body: updateAbsenceBodySchema })`, with Swagger docs matching the `POST /absences` block's style
- [x] 6.3 Backend tests: owner update succeeds and recomputes `workingDayCount`; update excludes its own dates from conflict check; update still conflicts with a different absence/reported hours; 403 for another user's absence; 404 for unknown/cancelled id; 400 for bad type or inverted dates; attachment reconciliation (add + remove) persists correctly

## 7. Frontend: data layer

- [x] 7.1 Add `attachments` to the `Absence` type in `frontend/src/types.ts`
- [x] 7.2 Add `updateAbsence(id, body)` to `services/absences.ts` calling `PATCH /absences/:id`

## 8. Frontend: form pre-fill and edit mode

- [x] 8.1 Add an optional `existingAbsence` prop to `AbsenceReportForm`; when present, initialize `type`/`startDate`/`endDate` from it, set `isMultiDay` to `startDate !== endDate`, and seed `uploadedFiles` from `existingAbsence.attachments`
- [x] 8.2 When `existingAbsence` is present, hide the "דיווח על היעדרות ליותר מיום אחד" link (the range is already shown per the pre-filled dates)
- [x] 8.3 On submit, call `updateAbsence(existingAbsence.id, …)` when `existingAbsence` is present, otherwise the existing `createAbsence(…)` path
- [x] 8.4 In `ManualReport.tsx`, pass the day's first entry of `dayAbsences` (if any) into `AbsenceReportForm` as `existingAbsence`

## 9. Tests

- [x] 9.1 Update/extend `ManualReport.test.tsx` (or a dedicated `AbsenceReportForm.test.tsx`): opening the absence tab for a day with a saved one-day absence pre-fills type/date with no "more days" link; opening it for a saved range pre-fills both dates already expanded; editing and saving calls `PATCH /absences/:id` (not `POST /absences`) with the edited values; conflict/validation banners still work in edit mode
- [x] 9.2 Run the frontend and backend test suites and confirm nothing else broke

## 10. Fix: general דיווח ידני entry point pre-filled the wrong day's absence

- [x] 10.1 In `Reports.tsx`, `openManualReport` computed `absences: absencesCoveringDate(monthAbsences, date)` unconditionally, even when called with no `isoDate` (the general button, which defaults to today) — so if today already had a saved absence, opening **דיווח העדרות** from the general button silently loaded it in edit mode instead of a blank form. Fixed by only computing `absences` when the call is for an explicit, specific day (`isoDate !== undefined`); the general entry point now always passes `absences: []`
- [x] 10.2 Add regression tests in `Reports.test.tsx`: the general button opens a blank absence form even when today already has a saved absence; clicking that day's own row still opens it in edit mode (unaffected)
