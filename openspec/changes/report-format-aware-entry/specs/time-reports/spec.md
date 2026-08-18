## ADDED Requirements

### Requirement: A project row's shape follows its project's report format

Each project row of a day SHALL be validated against the `reportFormat` of
the project it names, resolved by the service from stored project data —
never from a field the client supplies. A row whose project is `SUM_HOURS`
SHALL carry `hours` and SHALL NOT carry `rowStartTime` / `rowEndTime`. A row
whose project is `CLOCK_IN_OUT` SHALL carry `rowStartTime` and `rowEndTime`
(both `HH:mm`) and SHALL NOT carry `hours`. A row carrying the fields of the
other format SHALL be rejected with `400`, naming the offending row and
field, and nothing from that request SHALL be stored.

#### Scenario: Clock-in/out project row supplies its own times

- **WHEN** a row names a project whose `reportFormat` is `CLOCK_IN_OUT` and
  carries `rowStartTime` `09:00` and `rowEndTime` `13:00`
- **THEN** the row is accepted and persisted with those row times

#### Scenario: Sum-hours project row supplies hours

- **WHEN** a row names a project whose `reportFormat` is `SUM_HOURS` and
  carries `hours` `4`
- **THEN** the row is accepted and persisted with `hours` `4` and no row
  times

#### Scenario: Hours sent for a clock-in/out project is rejected

- **WHEN** a row names a `CLOCK_IN_OUT` project but carries `hours` instead
  of `rowStartTime` / `rowEndTime`
- **THEN** the service responds `400` identifying that row, and stores
  nothing

#### Scenario: Row times sent for a sum-hours project is rejected

- **WHEN** a row names a `SUM_HOURS` project but carries `rowStartTime` /
  `rowEndTime`
- **THEN** the service responds `400` identifying that row, and stores
  nothing

#### Scenario: One day may mix both formats

- **WHEN** a `POST /reports/batch` for one date carries a `SUM_HOURS` row
  with `hours` and a `CLOCK_IN_OUT` row with row times, both otherwise valid
- **THEN** the service responds `201` and persists both rows

### Requirement: A saved row keeps the format it was reported under

Changing a project's `reportFormat` SHALL NOT change any row already saved
against that project — not the stored values, and not the format the row is
shown and re-saved under. When a day is submitted again, each row that
matches a row already stored for that user, date, project, and task SHALL be
validated under the **stored** row's format rather than the project's current
one. A row with no such match SHALL follow its project's current format. A
row's stored format is determined by whether it carries a clock pair.

#### Scenario: Old hours row survives a switch to clock-in/out

- **WHEN** a project holding a saved `SUM_HOURS` row is switched to
  `CLOCK_IN_OUT`, and that day is submitted again with the same row carrying
  `hours`
- **THEN** the service responds `201` and the row keeps its hours, rather
  than being rejected for missing row times

#### Scenario: Old clock row survives a switch to sum-hours

- **WHEN** a project holding a saved `CLOCK_IN_OUT` row is switched to
  `SUM_HOURS`, and that day is submitted again with the same row carrying its
  clock pair
- **THEN** the service responds `201` and the row keeps its clock pair and
  derived hours

#### Scenario: A newly added row follows the project's current format

- **WHEN** a day is submitted with one row matching a stored row and one row
  on a project with no stored row for that day
- **THEN** the matched row is validated under its stored format and the new
  row under its project's current format

#### Scenario: The entry form shows a saved row in its own format

- **WHEN** an employee opens a day holding a row saved as `כניסה/יציאה` whose
  project has since been switched to `סיכום שעות`
- **THEN** that card still shows its `כניסה` / `יציאה` pair with the saved
  times, and saving the day again leaves the row unchanged

#### Scenario: Changing a card's project drops the saved format

- **WHEN** an employee picks a different project on a card that was loaded
  from a saved row
- **THEN** the card follows the newly chosen project's current format, since
  it is no longer that saved row

### Requirement: Clock-in/out row times fit inside the day attendance window

A row's `rowStartTime` and `rowEndTime` SHALL be interpreted on the same
overnight-aware axis as the day window: minutes elapsed from the day's
`startTime`, where a clock at or before `startTime` on an overnight day
belongs to the next calendar day. Both SHALL fall within the day window, and
`rowEndTime` SHALL be strictly after `rowStartTime` on that axis. A row whose
interval is zero-length, runs backwards, or extends outside the window SHALL
be rejected with `400` and nothing from that request SHALL be stored.

#### Scenario: Row inside the window is accepted

- **WHEN** the day window is `09:00`–`18:00` and a row is `10:00`–`13:00`
- **THEN** the row is accepted

#### Scenario: Row starting before the window is rejected

- **WHEN** the day window is `09:00`–`18:00` and a row is `08:00`–`13:00`
- **THEN** the service responds `400` naming that row's start time, and
  stores nothing

#### Scenario: Row ending after the window is rejected

- **WHEN** the day window is `09:00`–`18:00` and a row is `16:00`–`19:00`
- **THEN** the service responds `400` naming that row's end time, and stores
  nothing

#### Scenario: Row inside an overnight window is accepted

- **WHEN** the day window is `22:00`–`06:00` and a row is `23:00`–`02:00`
- **THEN** the row is accepted, its interval read as 3 hours, and it is not
  rejected for "end before start"

#### Scenario: Row spanning the whole window is accepted

- **WHEN** the day window is `09:00`–`18:00` and a row is `09:00`–`18:00`
- **THEN** the row is accepted

#### Scenario: Zero-length row is rejected

- **WHEN** a row's `rowStartTime` and `rowEndTime` are the same `HH:mm`
- **THEN** the service responds `400` and stores nothing

### Requirement: Clock-in/out rows of one day must not overlap

No two `CLOCK_IN_OUT` rows of the same day SHALL share any minute of the day
axis — an employee cannot be clocked into two projects at once. Intervals
that merely touch at an endpoint (one ends at the minute the next begins) SHALL
NOT be treated as overlapping. A day carrying overlapping rows SHALL be
rejected with `400` whose details name every clashing row, and nothing from
that request SHALL be stored. `SUM_HOURS` rows have no interval and SHALL
never take part in this check.

#### Scenario: Overlapping rows are rejected

- **WHEN** a day carries clock-in/out rows `09:00`–`13:00` and `12:00`–`17:00`
- **THEN** the service responds `400` naming both rows, and stores nothing

#### Scenario: Touching rows are accepted

- **WHEN** a day carries clock-in/out rows `09:00`–`13:00` and `13:00`–`17:00`
- **THEN** both rows are persisted

#### Scenario: A row fully containing another is rejected

- **WHEN** a day carries clock-in/out rows `09:00`–`17:00` and `10:00`–`12:00`
- **THEN** the service responds `400` naming both rows, and stores nothing

#### Scenario: Sum-hours rows never clash

- **WHEN** a day carries one clock-in/out row `09:00`–`13:00` and two
  `SUM_HOURS` rows
- **THEN** no overlap error is raised for the sum-hours rows

### Requirement: Hours of a clock-in/out row are derived, not submitted

The service SHALL compute a `CLOCK_IN_OUT` row's `hours` from its own
interval on the day axis, rounded half-up to one decimal place, and store
that value in the same `hours` field a `SUM_HOURS` row uses. A derived value
SHALL NOT be subject to the `0.5` minimum that typed hours carry — a short
genuine stint is valid — but SHALL still be greater than `0` once rounded.
Derived hours SHALL count toward the day's total the same way typed hours do.

#### Scenario: Four-hour row derives four hours

- **WHEN** a clock-in/out row is `09:00`–`13:00`
- **THEN** the persisted row has `hours` `4`

#### Scenario: Twenty-minute row derives a value under the typed minimum

- **WHEN** a clock-in/out row is `09:00`–`09:20`
- **THEN** the persisted row has `hours` `0.3` and is not rejected for being
  below `0.5`

#### Scenario: Derived hours count toward the window total

- **WHEN** the day window is `09:00`–`18:00`, a clock-in/out row is
  `09:00`–`17:00` (8 hours derived) and a sum-hours row submits `hours` `2`
- **THEN** the service responds `400` because the day's hours total `10`,
  which exceeds the 9-hour window, and stores nothing

## MODIFIED Requirements

### Requirement: Reporting options for the entry form

The service SHALL expose the active client → project → task tree to any
authenticated caller, sorted by name, so the entry form can cascade
dropdowns. Each project in the tree SHALL carry its `reportFormat`
(`SUM_HOURS` or `CLOCK_IN_OUT`) so the form can render the right inputs
before the user submits anything. Until SCRUM-71, the tree SHALL include all
active entities, not only assigned tasks.

#### Scenario: Authenticated caller loads options

- **WHEN** an authenticated user requests `GET /me/reporting-options`
- **THEN** the service responds `200` with nested `clients` (each with
  `projects`, each with `tasks`), only `isActive: true` rows, names sorted

#### Scenario: Each project reports its format

- **WHEN** an authenticated user requests `GET /me/reporting-options` and
  one project is set to `CLOCK_IN_OUT` while another is `SUM_HOURS`
- **THEN** each project object carries its own `reportFormat` value

#### Scenario: Unauthenticated caller is refused options

- **WHEN** `GET /me/reporting-options` carries no valid token
- **THEN** the service responds `401`

### Requirement: Project hours have at most one decimal place

Each persisted project row SHALL store `hours` as a number with at most one
digit after the decimal. A row of a `SUM_HOURS` project SHALL submit `hours`
in `{0.5, 0.6, …, 24}`; a value of `0`, a value with more than one decimal
place (for example `3.34`), or a value below `0.5` SHALL be rejected with
`400`. A row of a `CLOCK_IN_OUT` project SHALL NOT submit `hours` at all —
its value is derived from its interval and is exempt from the `0.5` minimum.
The sum of `hours` across all rows of one `POST /reports/batch` (or the
single row of `POST /reports`), submitted and derived alike, MUST NOT exceed
the attendance window for that request. The sum MAY be smaller than the
window. A leftover window shorter than `0.1` hours SHALL NOT be treated as
incomplete.

#### Scenario: Allocations under the window are accepted

- **WHEN** the window is 9 hours and two rows submit `hours` 4 and 3
- **THEN** the service persists both rows and responds `201`

#### Scenario: Allocations over the window are rejected

- **WHEN** the window is 9 hours and the rows' `hours` sum to more than 9
- **THEN** the service responds `400` with details that name the overflow
  and stores nothing

#### Scenario: Zero or two-decimal hours are rejected

- **WHEN** a `SUM_HOURS` row has `hours` `0` or `3.34`
- **THEN** the service responds `400` and stores nothing

#### Scenario: One decimal place is accepted

- **WHEN** a `SUM_HOURS` row has `hours` `3.3`
- **THEN** the service persists the row

### Requirement: Create a time report

The service SHALL let an authenticated caller create a time report by
submitting date, day `startTime` and `endTime` (attendance window), work
location, client, project, task, description, and — according to the
project's `reportFormat` — either `hours` (`SUM_HOURS`) or `rowStartTime` /
`rowEndTime` (`CLOCK_IN_OUT`). The stored `userId` SHALL be the JWT subject,
never a body field. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Valid report is created

- **WHEN** an authenticated user submits `POST /reports` for a `SUM_HOURS`
  project with a valid body whose client, project, and task form one active
  hierarchy, whose `hours` has at most one decimal place and is at least
  `0.5`, and whose `hours` do not exceed the attendance window
- **THEN** the service responds `201` with the persisted report including
  `id`, `userId`, the window times, and `hours`

#### Scenario: Valid clock-in/out report is created

- **WHEN** an authenticated user submits `POST /reports` for a
  `CLOCK_IN_OUT` project with `rowStartTime` and `rowEndTime` inside the day
  window
- **THEN** the service responds `201` with the persisted report including
  the row times and the `hours` derived from them

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /reports` carries no valid token
- **THEN** the service responds `401` and creates no row

#### Scenario: Overnight window is not treated as invalid interval

- **WHEN** the body has `endTime` earlier than `startTime` and the row fits
  the overnight window
- **THEN** the service responds `201` (it SHALL NOT reject solely because
  end is before start)

#### Scenario: Hierarchy mismatch or inactive entity is rejected

- **WHEN** `taskId` does not belong to `projectId`, or `projectId` does not
  belong to `clientId`, or any of the three is missing or inactive
- **THEN** the service responds `400` and creates no row

#### Scenario: Malformed body is rejected

- **WHEN** a required field is missing, `workLocation` is not
  `OFFICE`/`CLIENT`/`HOME`, times are not `HH:mm`, `hours` is not a number
  with at most one decimal place, the fields do not match the project's
  report format, or ids are not UUIDs
- **THEN** the service responds `400` with per-field details and creates no
  row

### Requirement: Batch create a day's time reports

The service SHALL let an authenticated caller create every row of one
calendar day in a single `POST /reports/batch` request whose body carries one
`date`, one day `startTime` and `endTime`, and `rows` each with work
location, client, project, task, optional description, and the field set its
project's `reportFormat` requires. Rows of both formats MAY appear in the
same request. All rows SHALL be persisted in one transaction: if any row is
invalid, none are stored. Each stored row SHALL copy the request's day window
onto `startTime`/`endTime`, store its own `rowStartTime`/`rowEndTime` when
its project is `CLOCK_IN_OUT`, and store `hours` — submitted or derived. The
stored `userId` SHALL be the JWT subject. An unauthenticated caller SHALL be
rejected with `401`.

#### Scenario: Several rows for one day are created

- **WHEN** an authenticated user submits `POST /reports/batch` with a date, a
  window, and two or more rows whose hierarchies are active, whose fields
  match their projects' formats, and whose hours sum to at most the window
- **THEN** the service responds `201` with the persisted rows in submitted
  order, each carrying `id`, `userId`, the shared date and window, `hours`,
  and row times where the format calls for them

#### Scenario: One bad row rejects the whole day

- **WHEN** any row has a hierarchy mismatch, an inactive entity, invalid
  `hours`, a field set that contradicts its project's format, row times
  outside the window, an overlap with another clock-in/out row, or the rows'
  hours exceed the window
- **THEN** the service responds `400` and no row from that request is stored

#### Scenario: Errors name the failing row

- **WHEN** a row is rejected
- **THEN** the `400` details identify it by position, as
  `rows.<index>.<field>` (window overflow MAY be reported on `hours` or a
  top-level `hours` detail; an overlap SHALL name every clashing row)

#### Scenario: Empty or oversized submissions are rejected

- **WHEN** `rows` is empty or holds more than 20 entries
- **THEN** the service responds `400` and stores nothing

#### Scenario: Row description is optional

- **WHEN** a row omits `description`
- **THEN** the row is stored with an empty description and the request still
  responds `201`

### Requirement: Hebrew single-report entry form

The home page (`/`) SHALL show a Hebrew RTL **דיווח ידני** drawer: a
segmented control (`דיווח עבודה` selected, `דיווח היעדרות` inert until
absences), the day label with the `תקן יומי 9 שע׳` tag, one day-level clock
pair (`כניסה` / `יציאה`), a **דיווח פרויקטים** list of project cards, an
`הוספת פרויקט` action, and a sticky footer showing allocated hours versus the
attendance window (and versus the 9h standard as display only) and `שמירה`.

Each project card SHALL start empty (no stepper). It SHALL expose inline
dropdowns for **פרויקט** (options from `GET /me/reporting-options`, client
implied — no separate client field), **משימה** (tasks of the chosen project
that are in that tree), and **מיקום** (`משרד` / `לקוח` / `בית`), plus
optional free-text. When the chosen project has exactly one assigned task,
that task SHALL be selected automatically. Cards SHALL be removable with the
existing delete confirmation.

The card's time input SHALL follow the chosen project's `reportFormat`. For a
`SUM_HOURS` project the card SHALL show the free-form **שעות** field that
starts at `0` and accepts a number with at most one decimal place. For a
`CLOCK_IN_OUT` project the card SHALL instead show its own `כניסה` / `יציאה`
pair and SHALL display the resulting hours as read-only derived text rather
than an editable number. Changing a card's project SHALL swap its inputs to
that project's format and clear the values that no longer apply. Cards of
both kinds MAY appear in the same day, and the footer total SHALL count
derived and typed hours alike.

Saving SHALL send one `POST /reports/batch` with the day window plus every
card's hierarchy and its format-appropriate time fields. `שמירה` SHALL remain
enabled. Incomplete cards, `hours` still `0` on a sum-hours card, a missing
or zero-length clock pair on a clock-in/out card, a clock pair outside the
day window, two clock-in/out cards that overlap, or a sum of hours greater
than the window SHALL not send the request and SHALL show an informative
Hebrew error (banner and/or field). An empty options tree SHALL also block
saving with an explanation.

#### Scenario: Employee reports two projects in one day

- **WHEN** a logged-in user sets `כניסה` and `יציאה`, adds two project
  cards, completes both, and submits
- **THEN** the client sends one `POST /reports/batch` with the shared window
  and both rows, and on `201` shows success

#### Scenario: Card shows a clock pair for a clock-in/out project

- **WHEN** the user picks a project whose report format is `כניסה/יציאה`
- **THEN** the card shows `כניסה` and `יציאה` inputs instead of the `שעות`
  number field, and shows the derived hours as read-only text

#### Scenario: Card shows an hours field for a sum-hours project

- **WHEN** the user picks a project whose report format is `סיכום שעות`
- **THEN** the card shows the editable `שעות` field and no row-level clock
  pair

#### Scenario: Switching a card's project swaps its inputs

- **WHEN** a card holding a filled `שעות` value is switched to a
  `כניסה/יציאה` project
- **THEN** the card's inputs become the clock pair and the stale hours value
  is cleared

#### Scenario: Mixed day is reported in one save

- **WHEN** the day holds one `סיכום שעות` card with hours and one
  `כניסה/יציאה` card with a clock pair, both complete
- **THEN** the footer total counts both, and one `POST /reports/batch`
  carries both rows

#### Scenario: Clock pair outside the day window blocks the save

- **WHEN** a clock-in/out card's `כניסה` is earlier than the day's `כניסה`,
  or its `יציאה` later than the day's `יציאה`
- **THEN** no request is sent and the card explains that the times must fall
  inside the day window

#### Scenario: Overlapping clock-in/out cards block the save

- **WHEN** two clock-in/out cards on the same day cover a shared stretch of
  time
- **THEN** no request is sent and both cards are marked with an error naming
  the clash

#### Scenario: Adding a project opens an empty card

- **WHEN** the user presses `הוספת פרויקט`
- **THEN** a new card appears under **דיווח פרויקטים** with empty project,
  task, and location, and no time values filled in (not a popup stepper)

#### Scenario: Single assigned task is auto-selected

- **WHEN** the user picks a project that has exactly one task in their
  reporting options
- **THEN** that task is selected without a further picker

#### Scenario: Removing a project asks first

- **WHEN** the user presses `מחיקת פרויקט` on a card
- **THEN** a confirmation asks `למחוק את פרויקט זה מהדיווחים?`, `מעדיף שלא
  למחוק` keeps the card, and `מחק את הפרויקט` removes only that card

#### Scenario: Incomplete card or zero hours blocks the save with copy

- **WHEN** the user submits with a required dropdown empty, hours still `0`
  on a sum-hours card, or a clock pair missing on a clock-in/out card
- **THEN** no request is sent, the problem is marked, and the screen explains
  what is missing — the save button stays enabled

#### Scenario: Card hours must fit inside the day window

- **WHEN** the sum of card hours, derived and typed alike, is greater than
  the כניסה–יציאה window (overnight-aware)
- **THEN** the screen shows the error and the day is not saved
