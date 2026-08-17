Covers SCRUM-157 and SCRUM-158, subtasks of SCRUM-145, on branch `Absences/conflict-validation/SCRUM-145`.

## 1. Confirm prerequisites are on this branch

- [x] 1.1 Merge or rebase in the `Absence` model + migration (branch `Absences/data-model-and-migrations/SCRUM-151`) — `backend/prisma/schema.prisma` must contain `model Absence` before step 2 can compile — merged locally (uncommitted, per instruction not to commit); brought in schema, migration, `prisma.ts` soft-delete config, `attachment.service.ts` owner-retrieval fix, `factories.ts` `createAbsence`, and the `absences-schema` openspec docs
- [x] 1.2 Merge or rebase in the `TimeReport` model + migration (branch `feat/SCRUM-121-reports-post`) — `backend/prisma/schema.prisma` must contain `model TimeReport` before step 2 can compile — that branch has unrelated history (SCRUM-181 etc.), so only the schema/migration/factory pieces were ported in by hand rather than merging the whole branch
- [x] 1.3 Confirm `Absence` is present in `SOFT_DELETE_MODELS` in `backend/src/config/prisma.ts` (it is, on SCRUM-151's branch) so cancelled absences are excluded from reads automatically

## 2. Implement the conflict-check function (SCRUM-157)

- [x] 2.1 Add `backend/src/services/absenceConflict.service.ts` exporting `checkAbsenceConflicts({ userId, startDate, endDate, halfDay, excludeAbsenceId? })`
- [x] 2.2 Query active absences for the user overlapping the proposed range (`startDate <= proposedEndDate AND endDate >= proposedStartDate`), excluding `excludeAbsenceId` when supplied; expand overlapping rows to the specific overlapping dates
- [x] 2.3 Query `TimeReport` rows for the user with `date` inside the proposed range; sum `endTime - startTime` per date in application code
- [x] 2.4 Run the two queries in parallel (`Promise.all`)
- [x] 2.5 Apply the hours-budget rule from `design.md` → Decisions: full-day conflicts once reported hours for a date are `> 0`; half-day conflicts once reported hours for a date are `> 4.5`
- [x] 2.6 Return `{ hasConflict, conflicts: [{ date, reason }] }` with `reason` one of `'OVERLAPPING_ABSENCE' | 'WORK_HOURS_CONFLICT'`, per `design.md` → Result shape
- [x] 2.7 No database access assumptions beyond `Absence` and `TimeReport` — no Express types, no HTTP-layer concerns, no Hebrew string composition (that stays with the caller)

## 3. Unit/integration tests (SCRUM-158)

- [x] 3.1 Add `backend/src/services/test/absenceConflict.service.test.ts`
- [x] 3.2 Add `createAbsence()` and `createTimeReport()` factories to `backend/src/test/factories.ts`, following the existing pattern in that file (each field defaults to something valid and unique; overrides for what the test cares about) — closes the gap `absences-schema/design.md` flagged ("No `createAbsence()` test factory... breaking the pattern every other soft-deletable model follows")
- [x] 3.3 Test: overlapping absence for the same user is rejected, including partial-range overlap (not just identical dates)
- [x] 3.4 Test: non-overlapping (adjacent) absence is not rejected on overlap grounds
- [x] 3.5 Test: overlap on the same dates for a *different* user is not rejected
- [x] 3.6 Test: full-day absence on a date already fully reported (9h) is rejected
- [x] 3.7 Test: full-day absence on a date with partial (non-zero, non-9h) reported hours is rejected, per the hours-budget rule
- [x] 3.8 Test: full-day absence on a date with no reported hours is not rejected
- [x] 3.9 Test: half-day absence with exactly 4.5 reported hours that date is accepted (the intended combination)
- [x] 3.10 Test: half-day absence with no reported hours that date is not rejected
- [x] 3.11 Test: half-day absence with more than 4.5 reported hours that date is rejected
- [x] 3.12 Test: a cancelled (soft-deleted) absence on the same dates does not block a new absence
- [x] 3.13 Test: editing an absence with `excludeAbsenceId` set to its own id does not conflict with itself when dates are unchanged
- [x] 3.14 Test: editing an absence into a new range that overlaps a *different* active absence is rejected
- [x] 3.15 Test: a multi-date conflict (e.g. spanning two absences, or one overlap date plus one work-hours date) returns every conflicting date, each with its correct reason

## 4. Verify and close out

- [x] 4.1 `npm run lint`, `npm run typecheck` pass in `backend/`. `npm test` could not be run — no reachable Postgres and Docker Desktop is not available in this environment (same limitation `working-day-calculation`'s tasks.md hit); additionally, `globalSetup.ts`'s `execFileSync('npx', ...)` fails with `ENOENT` on Windows without `shell: true`, since `npx` resolves to `npx.cmd` here — worth a follow-up fix independent of this change. Tests are written and ready to run once a test database is reachable.
- [x] 4.2 Confirm no endpoint code was added in this change — `absenceConflict.service.ts` has no callers yet; wiring it in is SCRUM-162 (create) and SCRUM-173 (update/cancel)
- [x] 4.3 Re-read `design.md` → Open Questions before marking SCRUM-145 itself as unblocked; the hours-budget rule extends past the two literal Jira examples and may be worth a quick confirmation with product before SCRUM-162/173 build on top of it
