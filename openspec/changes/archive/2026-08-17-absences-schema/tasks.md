## 1. Design validation

- [x] 1.1 Run `openspec validate absences-schema --strict` and fix any structural issues
- [x] 1.2 Confirm `design.md`'s ERD field names/types line up with `frontend/src/types/absence.ts` (no field the frontend expects is missing, nothing invented that it doesn't)
- [x] 1.3 Confirm nothing under `backend/prisma/` or `backend/src/` was touched by this change (docs-only)

## 2. Team review (SCRUM-151 acceptance criterion: "Reviewed by the team before migrations start")

- [x] 2.1 Circulate `design.md`'s "Absence documents" decision — extend `Attachment` with `absenceId` (recommended) vs. a new `AbsenceDocument` model (alternative) — for explicit team sign-off. **Decided: extend `Attachment`.**
- [x] 2.2 Resolve, alongside 2.1, whether `absenceId` is required or nullable on the chosen model. **Decided: nullable.**
- [x] 2.3 Record the team's decision back into `design.md`'s Decisions section (replacing "recommended/alternative" framing with the chosen direction) before SCRUM-143 starts

## 3. Handoff to SCRUM-143

- [x] 3.1 `AbsenceType` enum + `Absence` model added to `schema.prisma`; `Attachment` extended with nullable `absenceId`; `Absence` added to `SOFT_DELETE_MODELS` in `backend/src/config/prisma.ts`; migration `20260816150000_add_absences` generated via schema-to-schema diff (`prisma migrate diff --from-schema <prior> --to-schema schema.prisma --script`) since no local Postgres/Docker was available to run `migrate dev` directly. `prisma validate`/`format`/`generate`, `tsc --noEmit`, and `eslint` all pass. **Not yet applied to any database** — needs `prisma migrate deploy` (or `dev`) against a real Postgres to confirm it applies cleanly, since this SQL was schema-diffed but never executed

## 4. Code review follow-ups (PR #48)

Real bugs, fix before merge:

- [x] 4.1 Fixed the seed weekend-fixture comment (`seed.ts`) — now states the real range (Thu 2026-08-13 → Sun 2026-08-16) and the real expected working-day count (2, not 0), so it can't be misread as a "0 working days" fixture.
- [x] 4.2 Added a database `CHECK` constraint so `endDate >= startDate` on `absences`. Confirmed Prisma 7.9.1 has no `@@check` attribute (`prisma validate` rejects it) — enforced as raw SQL (`ALTER TABLE "absences" ADD CONSTRAINT "absences_date_range_valid" CHECK (...)`) appended to migration `20260816150000_add_absences`, with a `schema.prisma` doc-comment pointing there since Prisma can't represent it. Covers the "Absence date range is valid at the storage level" requirement in `spec.md`.
- [x] 4.3 Extended `retrieveAttachment` (`attachment.service.ts`) to also permit the caller when they own the absence the document is linked to (`attachment.absence.userId === caller.id`), alongside the existing uploader-or-admin check. Covers the "Absence document retrieval extends to the absence's owner" requirement in `spec.md`.

Design gaps flagged by review, not yet triggered:

- [x] 4.4 Extended `softDeleteExtension` (`prisma.ts`) to also intercept `aggregate` and `groupBy`, matching the existing `findMany`/`findFirst`/`findUnique`/`count` pattern. Covers the "Cancelled absences are excluded from aggregate views by default" requirement in `spec.md`. (Nested-`include` filtering remains explicitly out of scope — see `design.md` → Risks/Trade-offs.)
- [x] 4.5 Updated the `Absence` index to `@@index([userId, isActive, startDate, endDate])`. Diffed via `prisma migrate diff` against the last-committed schema to get Prisma's own SQL (`DROP INDEX` + `CREATE INDEX`), then amended migration `20260816150000_add_absences` in place with the corrected `CREATE INDEX` directly (never applied anywhere, so no separate drop/recreate migration needed).

Minor consistency gaps:

- [x] 4.6 Added `createAbsence()` to `factories.ts`, following the existing `createUser`/`createClient`/`createProject`/`createTask` pattern (derives `userId` via `createUser()` when not overridden, defaults to a single-day `VACATION`).
- [x] 4.7 Refactored the six near-identical absence upserts in `seed.ts` into a typed data array + loop for the uniform-shape fields (id/userId/type/startDate/endDate/halfDay); the sick-with-doc case's extra `Attachment` upsert stayed a separate step since its shape doesn't fit the loop.
- [x] 4.8 Re-ran `prisma format`/`validate`/`generate`, `tsc --noEmit`, and `eslint` — all clean. Re-diffed the schema against the last-committed version to confirm only the intended index change shows up (the `CHECK` constraint is correctly invisible to Prisma's diff, since it's raw SQL). **Still not applied to any database** — no Postgres/Docker available in this environment, so the amended migration and the seed script remain unexecuted against a real database.

