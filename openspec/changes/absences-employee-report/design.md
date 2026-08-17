## Context

Repo state as of this branch (`Absences/Employee-reports/SCRUM-147`), checked directly rather than assumed, 2026-08-17 (updated after the branch sync below):

- **Branch synced onto `origin/development`** (`f823a05`, merging in `a0ef035`'s docs commit plus everything `development` had gained). Both prerequisite gaps originally identified here are now resolved:
  - The `Absence` model + `AbsenceType` enum and `Attachment.absenceId` (SCRUM-151/`absences-schema`) are present in `backend/prisma/schema.prisma`.
  - `backend/src/services/workingDays.service.ts` exporting `expandWorkingDays(start, end, options?): { workingDays: Date[]; count: number }` (SCRUM-155/156/`working-day-calculation`, Sun–Thu week, throws `AppError.badRequest` on an inverted range, holiday-calendar extension point unused) is present, unchanged from what was originally checked.
  - `backend/src/services/absenceConflict.service.ts` is present too — `absence-conflict-validation` (SCRUM-145/157/158) merged into `origin/development` at `a365561` ("feat(SCRUM-157/158): implement absence conflict validation and tests") ahead of this branch's sync, so it arrived in the same sync rather than needing a separate cherry-pick. Its `checkAbsenceConflicts({ userId, startDate, endDate, halfDay, excludeAbsenceId? }): Promise<{ hasConflict: boolean; conflicts: { date: string; reason: 'OVERLAPPING_ABSENCE' | 'WORK_HOURS_CONFLICT' }[] }>` signature is exactly as originally checked on the (now-merged) sibling branch; it checks both overlapping absences and reported work-hour budget (9h full day / 4.5h half day), normalizing inputs to UTC midnight internally.
- **Already present on this branch** independent of the sync: Hebrew `dayjs` locale (SCRUM-38), Ant Design + `ConfigProvider` (SCRUM-36), the react-hook-form + `zodResolver` form pattern (SCRUM-37), `apiClient.request`/`ApiError`, and the `authenticate`/`requireRole` middleware with `req.user = { sub, role }`.
- **Still absent, and still this change's actual work:** no `absence.service.ts`, `absence.controller.ts`, or `absence.routes.ts` exist anywhere yet — `POST /absences` is genuinely unbuilt. That's sections 1–2 of tasks.md, unaffected by the sync.
- The frontend has a provisional `Absence` type (`frontend/src/types/absence.ts`) predating the real schema: `missingDocument: boolean` has no backend equivalent, and `cancelled: boolean` doesn't match the backend's `isActive` soft-delete flag (true = active, inverted sense). `pages/Absences.tsx` is a one-line placeholder.
- `POST /reports` (`scrum-114-single-report`) is the closest shipped precedent for this shape: `userId` from JWT `sub` only, zod body validation, imperative submit (not `useMutation`), 400 `details` mapped to inline field errors on the frontend. This change reuses that shape rather than inventing a new one.
- **Discovered while implementing the frontend, invalidating the original "standalone `AbsenceReportForm.tsx`" plan**: the app's work-report entry point moved on from `ReportEntryForm` (the component this proposal was originally scoped against) to `ManualReport.tsx` — a custom-CSS mobile card (`ManualReport.css`: `manual-report`/`mr-card`/`mr-cell`/`mr-sheet` classes), reached from `Reports.tsx`'s "דיווח ידני" button. It already ships a two-tab segmented control — "דיווח עבודה" (enabled) and a **disabled** "דיווח היעדרות" — with a code comment citing the same Figma file ("⏰ Time report files ⏰") the user supplied for this change. That's a prepared integration point, not a coincidence. Confirmed with the user directly (see Decisions) rather than assumed.

## Figma reference

Screenshots supplied 2026-08-17 ("⏰ Time report files ⏰", "Time Report/mobile 1.1" frames): a "דיווח ידני" card, the two-tab segmented control described above, a type field opening a picker sheet (חופשה - חצי יום / חופשה - יום מלא / מחלה / מילואים, "אחר" not visible in the crop but required by the written AC), a date field defaulting to single-day that expands into a from/to range via a "לדווח על היעדרות ליותר מיום אחד" link, a "משך ימי דיווח: N ימים" duration line in range mode, a document-attach zone (out of scope, see below), and a full-width navy "שמירה" button.

## Goals / Non-Goals

**Goals:**
- Define `POST /absences` and the report form precisely enough to implement in one pass, now that both prerequisite dependencies (schema/working-days, conflict-validation) are on this branch.
- Reuse existing conventions (`AppError`, `validate` middleware, JWT-`sub`-as-owner, form/error patterns) rather than introducing new ones.

**Non-Goals:**
- Half-day for non-Vacation types — the Figma mock (see below) doesn't show it as an option for Sick/Reserve/Other, so this change doesn't add it there.
- The supporting-document attach zone shown in the Figma mock (dashed drop zone, filename row with delete) — that's SCRUM-148's scope (`attachment.service.ts` has no `absenceId` wiring yet); building a visual-only stub here would be a non-functional element with nothing behind it.

## Decisions

### `POST /absences`, root-mounted, no `/api` prefix
Matches existing routes (`/reports`, `/login`) — this codebase's routers all mount at server root.

### `userId` from JWT `sub` only, never a request-body field
Same rationale as `scrum-114`: an employee reporting their own absence must not be able to file one as someone else (IDOR). Admin-on-behalf reporting is out of scope for SCRUM-147.

### `endDate` optional in the request, defaults to `startDate` server-side
Matches the parent story's AC ("Either a single date or a date range"). A single date is represented as `startDate === endDate` on the stored row, per `absences-schema`'s own requirement ("Single-day absence has equal start and end date") — no separate "is this a range" flag needed.

### `type` wire format: uppercase enum values, matching the `Role` precedent
`AbsenceType` in Prisma is `VACATION | SICK | RESERVE_DUTY | OTHER`. The existing `Role` enum (`ADMIN`/`EMPLOYEE`) is validated with `z.enum(Role)` and sent/received uppercase over the wire (`adminUser.schema.ts`) — this change follows the same convention rather than inventing a lowercase wire format. The frontend's current lowercase `AbsenceType` union (`'vacation' | 'sick' | ...`) is updated to match; the four Hebrew display labels live in a `{ value, label }` map in the form component regardless, since Ant Design's `Select` needs that shape either way.

### Conflict rejection reuses the existing `ErrorDetail[]` shape, on `409`
`checkAbsenceConflicts` returns `{ date, reason }[]`. Rather than inventing a new response shape for this one endpoint, the service maps each conflict to `{ field: <ISO date>, message: <Hebrew reason text> }` and throws `AppError.conflict(...)` with those as `details` — the same shape `validate` already produces for `400`s. The frontend's existing "map `error.details` to inline errors" pattern (established in `ReportEntryForm`/`scrum-114`) then handles both `400` and `409` uniformly with no new client-side branch. Matches `admin-create-user-backend`'s precedent of using `409`/`AppError.conflict` for "well-formed request, conflicts with current state."

### Working-day count preview is computed client-side, not fetched
SCRUM-163's AC requires the count to be visible before submit, and this change adds no live-preview endpoint (see proposal.md Non-goals). The form re-implements the same trivial Sun–Thu exclusion `expandWorkingDays` already does (a five-line pure function) purely for instant UI feedback. The `POST /absences` response's own count remains authoritative and is what's shown after a successful save; the pre-submit number is a preview only. Trade-off: if a holiday calendar is ever added to the backend utility, this client copy would silently drift — accepted for now (no holiday calendar exists yet on either side), flagged in Risks.

### `halfDay` is exposed in the UI, but only as a Vacation sub-option
Resolves the half-day Open Question below: the Figma mock (`⏰ Time report files ⏰`, "Time Report/mobile 1.1" frames, supplied 2026-08-17) shows the type field's dropdown with five rows — "חופשה - חצי יום" (Vacation, half day), "חופשה - יום מלא" (Vacation, full day), "מחלה" (Sick), "מילואים" (Reserve duty), and (per the written AC, not visible in the cropped mock but required by it) "אחר" (Other). Selecting a row sets both `type` and `halfDay` together: only the two Vacation rows differ by `halfDay`; Sick/Reserve/Other always submit `halfDay: false` — there's no design for a half-day Sick/Reserve/Other, so this change doesn't invent one even though the backend field itself is type-agnostic (`checkAbsenceConflicts` applies its 4.5h/9h budget regardless of `type`). Written AC takes precedence over an incomplete crop for the "אחר" row, since the crop is a screenshot of a subset of frames, not necessarily the whole option list.

### Document-attachment zone from the mock is not built here
The same Figma frames show a supporting-document attach zone (dashed drop area, "לחץ כאן להעלאת הקובץ", filled state with a filename + delete icon) as part of the same screen. That's SCRUM-148's scope, already a non-goal in proposal.md, and the backend has no `absenceId` wiring for attachment upload yet. Rendering the zone without working upload behavior would be a dead click — this change omits it entirely rather than shipping a non-functional stub, consistent with the project's "no half-finished implementations" convention. Revisit this screen once SCRUM-148 lands.

### `ManualAbsence` is a sibling of `ManualReport`, reached two ways

Confirmed directly with the user (three options presented: nest it in `ManualReport`'s modal, nest it without touching `/absences`, or keep the originally-planned standalone page — the first was chosen). `ManualAbsence.tsx` mirrors `ManualReport.tsx`'s shape (same props pattern: `onClose`, plus an optional `onSwitchToWork`/`onSwitchToAbsence` callback that — when provided — enables the *other* tab's button; when absent, that tab renders `disabled`, reusing the exact convention `ManualReport` already established for "not wired here" rather than inventing a new affordance). Two mount points:
- `Reports.tsx` lifts a single `entryTab: 'work' | 'absence' | null` state (replacing the old boolean `showEntry`) and passes each component a real switch callback, so both tabs are fully interactive when reached via the "דיווח ידני" button.
- `Absences.tsx` (the `/absences` route) renders `ManualAbsence` directly with no `onSwitchToWork`, so its Work tab is disabled — visiting `/absences` directly has no sibling Work-tab state to switch into without a larger cross-page state/deep-link mechanism, which is out of scope here.

### Visual chrome is reused wholesale from `ManualReport.css`, not rebuilt

`ManualAbsence` imports `ManualReport.css` directly for the shell/header/segmented-control/card/cell/banner/sheet classes (`manual-report`, `mr-card`, `mr-cell`, `mr-sheet-overlay`, etc.) rather than duplicating them — this is the established shared vocabulary for the "דיווח ידני" screen family, not component-scoped CSS. Only genuinely new pieces (the working-day-count line, the conflict list, the range-toggle link) get a small `ManualAbsence.css`.

### Type selection reuses the `mr-sheet` bottom-sheet pattern already built for `ManualReportPicker`

A single-step sheet listing the five rows (see Figma reference above), each row setting `type` and `halfDay` together and closing on tap — same immediate-commit interaction `ManualReportPicker` already uses for project/task/location. Not generalized into a shared multi-step component since this is one step, not several; that abstraction wasn't earned yet.

### Date input uses antd's `DatePicker`/no custom calendar grid — a deliberate visual deviation from the mock

The Figma shows a bespoke calendar-grid popup (month nav, RTL weekday header, Save/Clear). This codebase has no reusable calendar-grid component (`ManualReport`'s own date field is read-only, always "today" — it has no picker at all to crib from), and building one from scratch is disproportionate to this task. Used antd's `DatePicker`/would-be `RangePicker` instead — already a project dependency, already Hebrew-locale + RTL configured globally (`ConfigProvider` in `main.tsx`), and already themed to the app's navy accent color. The trigger row is styled to match (`mr-cell`), but the calendar popup itself keeps antd's stock appearance rather than being pixel-matched to the mock. Flagged here explicitly, not silently shipped as if it were identical.

### `endDate` resets whenever `startDate` changes, in range mode

**Bug found via manual testing (2026-08-17):** pick a valid start/end pair, then move `startDate` past the already-chosen `endDate` — the stale, now-invalid `endDate` stayed on screen with no visible error until submit. Root cause: the `startDate` `DatePicker`'s `onChange` calls `setValue('startDate', ..., { shouldValidate: true })`, and react-hook-form's per-field `trigger` (what `shouldValidate` drives) re-runs the resolver but only surfaces the triggered field's own errors — the schema's cross-field refine is keyed to `['endDate']`, so it never got live-applied to the `endDate` field from a `startDate`-triggered validation pass, even though the full schema (and therefore a submit attempt) would still have caught it.

Fix: clear `endDate` whenever `startDate` changes while `isRange` is true, forcing an explicit re-pick rather than leaving a silently-stale combination on screen. Chosen over "only clear it when it becomes invalid" (which would need duplicating the comparison logic already in the schema) for simplicity and because it's unconditionally safe - clearing an `endDate` that was still valid just costs one extra tap, not a data-integrity risk. Regression test: `ManualAbsence.test.tsx` - "resets endDate when startDate moves past it."

### Working-day count is shown in both single-day and range mode, not range-only like the mock

The mock only shows "משך ימי דיווח: N ימים" once a range is picked. The written AC ("The form shows how many working days the selection actually amounts to") is not range-qualified, so this change shows the line in both modes — a deliberate, minor addition beyond the crop, chosen because the written AC is authoritative over an incomplete visual reference (same reasoning as adding the "אחר" row).

### Conflict list renders as a simple per-date list, not per-day markers on a calendar

Because the date UI here is field-based (a start/end pill pair), not the bespoke calendar grid, "errors shown against the specific date(s)" is implemented as a list of `<date>: <reason>` lines below the date section, sourced from the `409`'s `error.details`, rather than a marker on a specific calendar cell. Satisfies the spec's requirement without depending on the calendar-grid rebuild that was deliberately skipped above.

## Risks / Trade-offs

**`/absences` shows two headers stacked**: `Layout.tsx` renders its antd `Menu` nav bar on every route except `/`, so visiting `/absences` directly shows that Menu above `ManualAbsence`'s own "✕ דיווח ידני" header/tabs. Pre-existing behavior (every non-home route already gets the Menu — `/admin`, `/change-password` too), not introduced by this change, and out of this task's authorized scope to fix (would mean touching shared `Layout.tsx` for other pages too). Noted, not silently left for someone to discover later.

**Client-side working-day preview can drift from the backend's count** if the backend utility's behavior changes (e.g. a future holiday calendar) without a matching frontend update. → Mitigation: documented here explicitly; the authoritative count always comes from the `POST` response, the client number is labeled/treated as a preview only.

*(The branch-staleness and unmerged-conflict-validation risks originally flagged here are resolved — see Context: both landed with the `f823a05` sync.)*

## Migration Plan

No new schema in this change — `Absence`/`AbsenceType` and their migration already exist via `absences-schema` (SCRUM-151) and are now present on this branch (tasks.md 0.1, done).

## Open Questions

*(The half-day question originally here is resolved — see Decisions: the Figma mock settles it as a Vacation-only sub-option.)*

- **Document attachment on this screen**: the Figma mock shows the attach zone directly on the absence-report card, implying product may want it shipped alongside SCRUM-147 rather than as a separate flow. Confirm with product/PM whether SCRUM-148 should land before or independent of this change; doesn't block this change either way since the zone is simply omitted here.
