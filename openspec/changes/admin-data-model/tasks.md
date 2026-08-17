## 1. Schema

- [x] 1.1 Add `TaskStatus` enum (`OPEN`, `CLOSED`) to `schema.prisma`
- [x] 1.2 Add `status TaskStatus @default(OPEN)` to the `Task` model
- [x] 1.3 Add `TaskAssignment` model: `userId`, `taskId`, `createdAt`,
      FKs to `User` and `Task`, `@@unique([userId, taskId])`
- [x] 1.4 Add the reverse relations (`taskAssignments`) on `User` and `Task`

## 2. Migration

- [x] 2.1 Generate the migration via the SCRUM-44 tooling
      (`prisma migrate dev`) and review the generated SQL for no unintended
      changes to existing tables
- [x] 2.2 Run the migration against the local dev database and confirm
      `TaskAssignment` and `Task.status` exist with the expected defaults

## 3. Verification

- [x] 3.1 Confirm existing seed data / tests that read `Task.isActive` are
      unaffected (no behavior change to that field)
- [x] 3.2 Manually insert a duplicate `(userId, taskId)` row and confirm the
      unique constraint rejects it, matching the spec's no-op scenario
