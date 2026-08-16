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

