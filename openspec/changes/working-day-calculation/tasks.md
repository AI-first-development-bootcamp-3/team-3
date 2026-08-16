Both groups implemented together on the current branch `Absences/Working-day-calculation/SCRUM-144`. Covers SCRUM-155 and SCRUM-156, subtasks of SCRUM-144.

## 1. Implement the working-day expansion function (SCRUM-155)

- [x] 1.1 Add `backend/src/services/workingDays.service.ts` exporting a pure function that takes a start/end date range and returns `{ workingDays: Date[], count: number }`
- [x] 1.2 Implement Sunday–Thursday inclusion / Friday–Saturday exclusion over the inclusive range
- [x] 1.3 Validate the range: throw (or return an error result) when `end` is before `start`
- [x] 1.4 Shape the function signature to accept an optional holiday-calendar parameter (e.g. `Set<string>` of ISO dates) that is unused for now, so a later change can wire it in without changing call sites
- [x] 1.5 No database access, no Express types in this module — keep it a pure, framework-free function

## 2. Unit tests for edge cases (SCRUM-156)

- [x] 2.1 Add `backend/src/services/test/workingDays.service.test.ts`
- [x] 2.2 Test: range spanning one or more weekends returns only Sun–Thu dates
- [x] 2.3 Test: range consisting only of Friday and Saturday returns zero working days
- [x] 2.4 Test: single-day range on a working day returns that one date
- [x] 2.5 Test: single-day range on a weekend day returns zero working days
- [x] 2.6 Test: inverted range (end before start) is rejected
- [x] 2.7 Test: range crossing a month boundary computes correctly
- [x] 2.8 Test: range crossing a year boundary (Dec 31 → Jan 1) computes correctly
- [x] 2.9 Test: returned count equals the length of the returned working-day list

## 3. Verify and close out

- [ ] 3.1 `npm run lint`, `npm run typecheck`, and `npm test` pass in `backend/` — lint and typecheck pass clean; `npm test` could not be run (no Postgres reachable and no Docker in this environment — the suite's `globalSetup.ts` requires a live test database)
- [x] 3.2 Confirm no other module in the codebase reimplements Friday/Saturday exclusion logic — grepped `backend/src` and `frontend/src`; only `workingDays.service.ts` and its test reference weekend logic


