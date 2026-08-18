## 1. Scope the options tree

- [x] 1.1 Give `listReportingOptions` the caller's id and filter tasks
      through the assignment relation in the query, not in memory (design D4)
- [x] 1.2 Keep pruning projects with no tasks and clients with no projects,
      and keep the existing active-only filter and name sorting
- [x] 1.3 Pass `req.user`'s id from `getMyReportingOptions` in
      `timeReport.controller.ts`

## 2. Gate the write path

- [x] 2.1 Add a distinct assignment-refused message constant, separate from
      the hierarchy mismatch message
- [x] 2.2 Reject an unassigned task in `createTimeReport` with a `400` on
      `taskId` (design D2)
- [x] 2.3 Reject an unassigned task in `createTimeReportBatch` with a `400`
      on `rows.<index>.taskId`
- [x] 2.4 Apply the gate to every role, with no `ADMIN` bypass (design D1)
- [x] 2.5 Let a row that already exists for that caller, date, project, and
      task through the gate, reusing the stored-row map the batch already
      loads (design D3)

## 3. Housekeeping

- [x] 3.1 Remove the stale `SCRUM-71` comments in `timeReport.service.ts`
      that describe the gap this change closes — the team no longer uses
      that tracker, so do not replace them with another ticket reference

## 4. Verification

- [x] 4.1 Test: options hold only assigned tasks and prune empty projects
      and clients
- [x] 4.2 Test: a caller with no assignments gets an empty `clients` array
- [x] 4.3 Test: an admin is scoped by assignment exactly like an employee
- [x] 4.4 Test: `POST /reports` on an unassigned task → `400` on `taskId`,
      nothing stored
- [x] 4.5 Test: a batch mixing an assigned and an unassigned row → `400`
      naming the unassigned row, nothing stored
- [x] 4.6 Test: a day re-submitted after its assignment was removed → `201`
- [x] 4.7 Test: a new row on an unassigned task inside a day that already has
      stored rows → `400`
- [x] 4.8 Update the existing "returns the nested active tree sorted by name"
      case, which asserts the old unscoped behavior
- [ ] 4.9 Manual: log in as an employee and confirm the project dropdown
      offers only their assigned work
