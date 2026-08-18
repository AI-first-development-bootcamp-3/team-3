## Context

See proposal.md — Why. The state this design has to work with:

- `Project.reportFormat` (`SUM_HOURS` / `CLOCK_IN_OUT`) already exists and is
  already editable from `AdminHourSettings`. Nothing on the admin side needs
  building.
- `TimeReport.startTime` / `endTime` currently mean **the day window**, copied
  onto every row of that day — `manual-report-inline-hours` redefined them
  that way. `ManualReport.tsx` reads the day window back off the first row of
  the day (`first?.startTime`), so that meaning cannot quietly change.
- `hours` is `Decimal(4,1)` and non-nullable. Every row has one.
- Row validation today is pure Zod (`timeReport.schema.ts`) — it needs no
  database read, because every row has the same shape.
- `attendanceWindow.ts` already owns the overnight-aware window math the form
  and the service share.

The constraint that shapes most of what follows: which shape a row must take
depends on a *stored* value (the project's format), so shape validation can no
longer be a pure schema check.

## Goals / Non-Goals

**Goals:**

- One place decides a row's required shape — the server — with the client
  rendering to match rather than being trusted.
- Existing rows and existing days keep loading and editing correctly, with no
  data rewrite.
- Containment and overlap reuse the one overnight-aware axis that already
  exists, rather than growing a second time model.

**Non-Goals:**

- Reworking how the day window itself is entered or stored.
- A per-row work-location or task-level format. The format is a project
  property and stays one.
- Editing history when a project's format changes later (see Decision 6).

## Decisions

### D1: A clock-in/out row gets new columns, not the existing `startTime`/`endTime`

`TimeReport` gains nullable `rowStartTime` / `rowEndTime`. `startTime` /
`endTime` keep meaning the day window on every row of every format.

*Alternative considered:* reuse `startTime`/`endTime` as row-level for
`CLOCK_IN_OUT` rows. Rejected — the day window would then be unrecoverable
from a clock-in/out row, and `ManualReport.tsx:98` reads exactly that to
rehydrate a day. On a mixed day it would read whichever row happened to be
first and get a different answer depending on ordering.

*Alternative considered:* rename the pair to `dayStartTime`/`dayEndTime` and
free `startTime`/`endTime` for row use. Cleaner naming, but it rewrites every
read site and every existing row for no behavioral gain. The nullable pair is
additive: existing rows stay valid with both columns `NULL`, which reads
correctly as "this row has no clock pair of its own".

### D2: Shape validation moves from Zod into the service

Zod cannot decide a row's shape without knowing the project's format, and the
format is in the database. So:

- The Zod body schema accepts a **permissive union** per row: `hours` optional,
  `rowStartTime`/`rowEndTime` optional, both `HH:mm` when present. It keeps
  owning format-independent checks (UUIDs, `HH:mm`, `workLocation`, row count,
  description length, one-decimal `hours`).
- The service loads the formats of the projects named in the request — the same
  query that already resolves the hierarchy for the active-entity check, with
  `reportFormat` added to its `select` — then rejects rows whose fields
  contradict their format, with `rows.<index>.<field>` details in the existing
  `ErrorDetail` shape.

*Alternative considered:* have the client send the format and branch the Zod
schema on it. Rejected — it lets a client choose which validation applies to
it, and the format is exactly the thing a manager controls and an employee
must not.

### D3: Derived hours round half-up to one decimal, exempt from the 0.5 floor

`hours` is `Decimal(4,1)`, so a derived interval must land on one decimal
whatever we do — `09:00`–`09:20` is 0.333…h and gets stored as `0.3`. The
existing `>= 0.5` floor is a guard against someone typing a meaningless
allocation; a clock pair is evidence, not an estimate, so a genuine
20-minute stint should not be refused. The floor therefore applies to typed
hours only, and derived rows are rejected only for a zero-length interval.

*Trade-off:* a day of many short clock pairs accumulates rounding drift
against the window sum (up to ~0.05h per row). Accepted — the alternative is
widening the column to `Decimal(4,2)`, which changes the stored precision of
every existing row and every typed value for a rounding error smaller than
the form's own input granularity.

### D4: Containment and overlap run on the day's minute axis, not the clock

Both checks normalise every clock to *minutes elapsed since the day's
`startTime`*, the same transform `attendanceWindowHours` already performs.
On a `22:00`–`06:00` day a row at `02:00` is minute 240, comfortably inside a
480-minute window — no special casing for "after midnight" anywhere. Two new
helpers in `attendanceWindow.ts` (`minutesIntoWindow`, `intervalsOverlap`)
keep this in the module both the form and the service import, so the client
and the server cannot disagree about what fits.

### D5: Touching intervals do not overlap

`09:00`–`13:00` followed by `13:00`–`17:00` is the normal way to describe
switching projects at 13:00. Overlap means a **shared minute**, so half-open
comparison (`aStart < bEnd && bStart < aEnd`) is the rule. Reporting both a
start and an end at the same minute would otherwise be impossible without a
one-minute gap, which is a rule nobody would guess.

### D6: A row keeps the format it was reported under, for good

Rows keep the shape they were saved with — a project switched to
`כניסה/יציאה` leaves last month's hours-only rows exactly as they are.

That is not only about the stored bytes. The format a **saved** row is shown
and re-saved under is the format it was reported under, never the project's
current setting. The entry form is both the viewer and the editor of a day,
so anything less would mean opening an old day and pressing `שמירה` silently
converted its history — an hours row losing its number behind an empty clock
pair, or a clock pair vanishing behind a typed number.

A row's own shape records this without a new column: `rowStartTime` is
non-null on exactly the `CLOCK_IN_OUT` rows and null on exactly the
`SUM_HOURS` ones. So:

- The server, before validating a day's batch, reads the rows already stored
  for that user and date and keys them by project and task. A submitted row
  matching one of them is validated under **that row's** format; a row with
  no match is validated under its project's current format.
- The form marks each rehydrated row with the format it was loaded as, and
  renders and validates it that way. Picking a different project on a card
  drops the mark — it is a new row at that point, and follows the newly
  chosen project's current format.

*Alternative considered:* pin the format in a `TimeReport.reportFormat`
column. Rejected as redundant — the clock pair's presence already answers the
question exactly, and a second source of the same truth can only drift from
it.

*Alternative considered:* let the project's current format win everywhere,
and treat an old day as needing re-entry. Rejected: it makes an admin's
setting change quietly destructive to data employees already submitted.

### D7: The form derives each card's format from reporting options

`GET /me/reporting-options` gains `reportFormat` on each project, so the card
knows its shape the moment a project is picked — no extra request, no
loading state mid-form. `ManualReport.schema.ts` cannot look the format up on
its own (Zod has no access to the options tree), so the schema takes the
options as a factory argument: `buildManualReportSchema(options)` returns the
schema with a `superRefine` that resolves each row's format from the tree.
This keeps validation in one place rather than splitting "which fields are
required" between the schema and the component.

Switching a card's project clears the time fields that no longer apply,
because a stale `hours` on a card that now shows a clock pair would be
submitted invisibly.

### D8: The default flips to `SUM_HOURS`

See proposal.md — What Changes. `admin-report-format` chose `CLOCK_IN_OUT` on
the reasoning that `TimeReport` had only `startTime`/`endTime` and no hours
field; `manual-report-inline-hours` has since made that false. Leaving the
default would mean every project created from here on demands clock pairs
nobody asked for.

The migration changes the column default and **does not** rewrite existing
rows. An earlier draft backfilled every project to `SUM_HOURS`; that was
wrong. The formats already stored were set on purpose — `seed.ts` assigns a
deliberate mix and the admin screen has been live — and no query can
distinguish a chosen `CLOCK_IN_OUT` from an inherited one, so a blanket
update would silently discard real configuration to protect against a
hypothetical. A project still carrying the old default is one edit away in
`AdminHourSettings`.

## Risks / Trade-offs

- **The batch contract breaks for any deployed client.** → Frontend and
  backend ship together; there is no third-party consumer of `POST
  /reports/batch`. The default flip (D8) means no *project* changes behavior
  on deploy, so the window where a stale tab could send the old shape and be
  rejected is the deploy itself.
- **Format-aware validation adds a project lookup to the write path.** → The
  hierarchy check already queries the tasks and their projects for exactly
  these rows; `reportFormat` is one more column in that existing `select`, not
  a second round-trip.
- **Overlap detection is O(n²) across a day's rows.** → `MAX_ROWS_PER_DAY` is
  20, so worst case is 190 comparisons on integers. Not worth an interval tree.
- **Rounding drift on derived hours** (D3) → bounded at 0.05h per row and only
  visible against the window-sum check; the sum rule has ~0.1h slack in the
  existing "shorter than 0.1 hours is not incomplete" rule.
- **A day re-opened after its project's format changed loses its old times**
  (D6) → the row keeps its stored `hours`; only the card's input shape
  changes. Flag in review if the copy needs to explain it.
- **Two pending changes touch `time-reports`.** `manual-report-inline-hours`
  is complete but unarchived, and this change's MODIFIED blocks build on its
  wording, not on the current `openspec/specs/time-reports/spec.md`. →
  Archive or sync `manual-report-inline-hours` before archiving this one, or
  its rewording will be lost.

## Migration Plan

1. Migration adds nullable `rowStartTime` / `rowEndTime` to `time_reports`.
   Existing rows keep `NULL` — correct by construction, since every one of
   them is an hours row.
2. Same migration changes the `projects.reportFormat` column default to
   `SUM_HOURS`, leaving stored values as they are (D8).
3. Backend and frontend deploy together (D8 risk above).
4. Rollback: the columns are nullable and unread by the previous build, so
   reverting the app is safe without reverting the migration. Reverting the
   *default* would matter only for projects created in between.
