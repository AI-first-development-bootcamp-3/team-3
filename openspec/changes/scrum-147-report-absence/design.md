## Context

See proposal.md. Already in the repo: `Absence` + `AbsenceType`, `expandWorkingDays`, `checkAbsenceConflicts`, attachment metadata (unused here), and a disabled **דיווח העדרות** tab in `ManualReport`. No `POST /absences` yet.

## Goals / Non-Goals

**Goals:**

- One create endpoint that is the only writer for this slice.
- Form in the existing drawer so hours and absences share chrome.
- Hebrew errors built from conflict `date` + `reason` (API stays English codes).

**Non-Goals:**

- Prisma changes, file upload, half-day UI, edit/delete, month lock, a separate `/absences` page.

## Decisions

1. **`POST /absences` body:** `{ type, startDate, endDate? }`. Why: matches SCRUM-162; omit `halfDay` so clients cannot smuggle half-day before SCRUM-149. Alternative: accept `halfDay` now — rejected to keep 149 distinct.

2. **`409` for conflicts, `400` for validation / zero working days.** Why: 409 is “the dates are well-formed but the day is already claimed”; 400 is malformed or a weekend-only range. Alternative: 400 for conflicts — weaker for the form to branch copy.

3. **Live working-day count on the client** with the same Sun–Thu rule, tested against the same fixtures as the backend helper. Why: no extra round-trip while picking dates. Alternative: `GET /absences/preview` — extra route for a pure function.

4. **Tab inside `ManualReport`, not a new route.** Why: the user-facing control is already that tab. Alternative: restore `Absences.tsx` as a full page — later if Figma’s monthly absences list needs it.

5. **`userId` from the session only.** Why: IDOR. Same pattern as time reports.

## Risks / Trade-offs

- **[Risk]** Client and server working-day counts drift. → Same fixture dates in both test files; count is also returned on `201` so a mismatch is visible.
- **[Risk]** Sick/reserve without a file (PRD wants an attachment). → SCRUM-148; this slice still allows those types with `missingDocument` implied by having no attachments.
- **[Risk]** Month lock not enforced. → SCRUM-146; unlocked months only in practice until that ticket.

## Migration Plan

No schema migration. Deploy API then frontend. Rollback: disable the tab again; leftover absence rows remain valid.
