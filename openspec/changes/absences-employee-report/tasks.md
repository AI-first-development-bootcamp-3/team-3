## 0. Prerequisites (blocking, outside this change's scope — see design.md Context)

- [ ] 0.1 Sync this branch onto `origin/development` (98 commits behind) — brings in the `Absence`/`AbsenceType` schema (SCRUM-151) and `workingDays.service.ts` (SCRUM-155/156) that section 1 depends on
- [ ] 0.2 Resolve the conflict-validation dependency (SCRUM-145) — merge `Absences/conflict-validation/SCRUM-145` into `development` first, or cherry-pick `absenceConflict.service.ts` onto this branch; see design.md Open Questions. Section 1.2 has nothing to call until this is decided

## 1. Backend — SCRUM-162

- [ ] 1.1 `types/absence.schema.ts` — zod: `type` (`z.enum(AbsenceType)`, uppercase wire format), `startDate` (ISO date), `endDate` (optional ISO date), `halfDay` (optional, default `false`)
- [ ] 1.2 `services/absence.service.ts` — `createAbsence(userId, input)`: default `endDate` to `startDate` when omitted, call `expandWorkingDays` for the count (its own `badRequest` on an inverted range covers that validation), call `checkAbsenceConflicts`; on a conflict, throw `AppError.conflict(...)` with `details` mapped from `{date, reason}` per design.md Decisions; otherwise `prisma.absence.create` scoped to `userId`, return the created absence plus `workingDaysCount`
- [ ] 1.3 `controllers/absence.controller.ts` + `routes/absence.routes.ts` — `POST /absences`, `authenticate` + `validate({ body: createAbsenceBodySchema })`, `userId` from `req.user.sub`, `@openapi` doc (400/401/409 responses), mount in `app.ts`
- [ ] 1.4 `createAbsence` test factory in `backend/src/test/factories.ts`

## 2. Frontend — SCRUM-163

- [ ] 2.1 Reconcile `frontend/src/types/absence.ts` with the real contract: drop `missingDocument`, replace `cancelled` with `isActive` (or map it at the service boundary), uppercase `AbsenceType` values — see design.md Decisions
- [ ] 2.2 `frontend/src/services/absences.ts` — `createAbsence()` calling `POST /absences` via `apiClient.request`
- [ ] 2.3 `AbsenceReportForm.tsx` + `AbsenceReportForm.schema.ts`: type `Select` with the four Hebrew labels (חופשה / מחלה / מילואים / אחר) mapped to uppercase enum values, `DatePicker`/`RangePicker` for single date or range, client-side working-day count preview (design.md Decisions), RTL/mobile-first layout, map `400`/`409` `details` to inline errors against the specific date field(s)
- [ ] 2.4 Render `AbsenceReportForm` from `pages/Absences.tsx`, replacing the placeholder `<h1>`

## 3. Tests — SCRUM-164

- [ ] 3.1 Backend route tests: each of the four types succeeds; single date (`startDate === endDate`); a date range; a range spanning a weekend yields the correct working-day count; overlapping/conflicting dates rejected `409` naming the clashing dates; unauthenticated `401`; malformed body `400`
- [ ] 3.2 Frontend: schema unit tests for the four types and single/range input; component test asserting a successful submit shows confirmation, and a conflict response renders an error against the specific date(s)

## 4. Verify

- [ ] 4.1 Backend `npm test` + `npm run lint` green
- [ ] 4.2 Frontend `npm test` + `npm run lint` green
- [ ] 4.3 `openspec validate --strict` passes for this change
- [ ] 4.4 Open PR
