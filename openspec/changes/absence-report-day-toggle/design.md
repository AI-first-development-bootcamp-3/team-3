## Context

The one-day/multi-day toggle (`isMultiDay` state in `AbsenceReportForm`, the "דיווח על היעדרות ליותר מיום אחד" link) described above is already implemented and shipped — tasks 1-4 in `tasks.md` are done. What follows covers the still-unbuilt edit-an-existing-absence half of this change.

`checkAbsenceConflicts` (`backend/src/services/absenceConflict.service.ts`) already accepts an `excludeAbsenceId` and its own doc comment says it's "shared by the absence create and edit paths (SCRUM-157)" — the edit path was anticipated but never built. `Absence` is a soft-delete model (`isActive`, via the Prisma extension in `backend/src/config/prisma.ts`), so `findFirst`/`findMany` on it already exclude cancelled rows by default; no extra filtering is needed to make a cancelled absence 404.

Today `AbsenceDto` (`backend/src/services/absence.service.ts`) has no `attachments` field, and `listAbsencesForMonth` doesn't join `Attachment`. The frontend's `dayAbsences` (from `initialAbsences`, populated by `listAbsences`) is what `ManualReport.tsx` already has in hand for the open day — that's the natural source for what to pass into `AbsenceReportForm` for pre-fill, but it currently carries no attachment info.

## Goals / Non-Goals

**Goals:**
- One update endpoint, reusing the existing create-path validation and conflict logic rather than duplicating it.
- The edit form is the same `AbsenceReportForm` component in a pre-filled mode, reusing the already-shipped `isMultiDay` toggle rather than a separate screen.
- Attachments become visible and editable on the existing absence, not just at creation time.

**Non-Goals:**
- No attachment storage/upload changes — `POST /attachments` and its storage backend are untouched; this only changes which attachments are *linked* to which absence and what the API reports back.
- No change to the cancel (`DELETE /absences/:id`) path.
- No handling for a day with more than one overlapping saved absence beyond opening the first one for edit (see Risks).

## Decisions

**Endpoint shape: `PATCH /absences/:id`, full-record body.** Mirrors `DELETE /absences/:id` for addressing the resource, and keeps the same body shape as `POST /absences` (`type`, `startDate`, optional `endDate`, `attachmentIds`) so the frontend can reuse one payload builder. Considered `PUT` — rejected only as a naming preference; the semantics here (submit the record's current full state) are the same either way, and `PATCH` for a single-resource-by-id route is the convention already established by `DELETE /absences/:id`.

**Conflict exclusion: pass `excludeAbsenceId: id` into the existing `checkAbsenceConflicts`.** No new conflict logic — this is exactly the parameter the service already exposed for this. `updateAbsence` computes the new `workingDayCount` with `expandWorkingDays` the same way `createAbsence` does.

**Ownership/existence check: a single `findFirst({ where: { id } })`.** The soft-delete extension already restricts this to active rows, so an unknown or cancelled id naturally returns nothing → `404`. A row that exists but has a different `userId` → `403`. No separate "is this cancelled" check is needed.

**Attachments become part of `AbsenceDto`.** Add `attachments: { id, filename, mimeType, sizeBytes, uploadedAt }[]` to the DTO returned by create, list, and update, sourced from `Attachment` rows where `absenceId` matches. This is what lets the frontend show existing files when it opens the form for edit — the list view (`listAbsencesForMonth`) is what actually needs to change, since that's what feeds `initialAbsences` → `AbsenceReportForm`.

**Attachment reconciliation on update:** when `attachmentIds` is present it is the full desired set (unlink missing ids, link new ones with `uploaderId = userId`). Omit the field to leave current links; send `[]` to unlink every file. The form always submits the current `uploadedFiles` ids on edit.

**Frontend: `AbsenceReportForm` takes an optional `existingAbsence` prop.** `ManualReport.tsx` passes the day's first saved absence (from `dayAbsences`, already computed there) if one exists. When present: form defaults come from it (`type`, `startDate`, `endDate`), the existing `isMultiDay` state initializes to `startDate !== endDate` instead of its current hardcoded `false`, and `uploadedFiles` initializes from `existingAbsence.attachments`. Submit calls `updateAbsence(existingAbsence.id, …)` instead of `createAbsence(…)` when the prop is present; everything else (validation, conflict banner handling, working-day count) is unchanged.

## Risks / Trade-offs

- **A day could theoretically show more than one saved absence** (e.g. legacy rows predating conflict validation). → Edit mode opens the first entry in `dayAbsences`; this matches the existing delete-all-for-day behavior being the only other multi-absence-aware code path, and conflict validation now prevents new overlaps from being created, so this shrinks over time rather than growing.
- **Widening `AbsenceDto` with `attachments`** touches the list endpoint every caller of `GET /absences` already uses. → Additive field only, existing consumers ignore unknown fields; no breaking change.

## Migration Plan

No schema migration — `Attachment.absenceId` already exists. Ship backend (new route + DTO field) and frontend (prefill + update call) together; the new field is additive so an old frontend build against the new backend keeps working unchanged.
