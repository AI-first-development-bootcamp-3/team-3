Shipped as three PRs into `development` (SCRUM-121, 122, 123). Tests live in each PR (SCRUM-124 is not a separate PR).

## 1. Backend — SCRUM-121

- [x] 1.1 Prisma `WorkLocation` enum + `TimeReport` model, migration, relations on User/Client/Project/Task
- [x] 1.2 Zod schemas for `POST /reports` body and reporting-options response types
- [x] 1.3 `timeReport.service.ts` — `createTimeReport` (hierarchy check, end < start → 400, `userId` from caller) and `listReportingOptions` (active tree, sorted by name). Comment that SCRUM-71 will filter assignments
- [x] 1.4 Routes/controllers: `POST /reports` and `GET /me/reporting-options`, `authenticate` + `validate`, `@openapi`, mount in `app.ts`
- [x] 1.5 `createTimeReport` factory; route tests: 201 persist, 401, 400 malformed, 400 end before start, 400 hierarchy mismatch / inactive, options 200 nested + 401

## 2. Frontend form — SCRUM-122

- [x] 2.1 Replace provisional `types/report.ts`; add reporting-options types
- [x] 2.2 `services/reports.ts` — `getReportingOptions()`
- [x] 2.3 `ReportEntryForm` + Zod schema: Hebrew labels, defaults (today, now), cascade + auto-select, empty state disables submit
- [x] 2.4 Render the form from `pages/Reports.tsx`; schema unit tests

## 3. Save + reset — SCRUM-123

- [x] 3.1 `createReport()` in `services/reports.ts`; form submit → POST, success message, reset
- [x] 3.2 Map 400 `details` to inline field errors
- [x] 3.3 Frontend test: successful save calls POST and resets; 400 shows an error

## 4. Verify

- [x] 4.1 Backend `npm test` + `npm run lint` green
- [x] 4.2 Frontend `npm test` + `npm run lint` green
