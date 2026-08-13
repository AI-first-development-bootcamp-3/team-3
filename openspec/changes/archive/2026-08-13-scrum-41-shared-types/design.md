## Context

No backend exists yet — these types are the frontend's own working contract, written ahead of the API
rather than generated from it. Field shapes below are inferred from the Admin and Absences epics already
decomposed in Jira (SCRUM-5, SCRUM-7); Report's shape is provisional since the hours-reporting epic
(SCRUM-6) hasn't been decomposed yet.

## Goals / Non-Goals

**Goals:**
- One canonical, importable type per entity
- A shape close enough to the eventual API that little needs to change when the backend lands

**Non-Goals:**
- Codegen from a Swagger spec — no backend/spec exists yet to generate from
- Finalizing Report's exact shape — provisional pending SCRUM-6

## Decisions

- **Hand-written now, generated later.** Revisit with `openapi-typescript` (or similar) once SCRUM-50
  (Swagger tooling) produces a real spec to generate from. Hand-written types are cheap to replace with
  generated ones later since consuming code only cares about the shape, not its origin.
- **One file per entity under `src/types/`**, plus a `common.ts` for shared primitives (`Id`,
  `ISODateString`) so every entity doesn't redeclare `id: string`.
- **Dates as `ISODateString` (a `string` alias), not `Date` objects** — these types describe API
  transport shapes; components convert to `Date` locally using the SCRUM-38 date library when needed.
- **Report's shape is explicitly marked provisional** in a comment — SCRUM-6 hasn't been decomposed, so
  this is a best-effort guess (userId, taskId, date, hours, notes) to unblock SCRUM-20, not a commitment.

## Risks / Trade-offs

- Report's shape will likely change once SCRUM-6 is decomposed — accepted, flagged in-code so nobody
  treats it as final.
