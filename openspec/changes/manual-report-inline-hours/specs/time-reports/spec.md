## ADDED Requirements

### Requirement: Day attendance window length

The service SHALL compute the day's attendance length from `startTime` and `endTime` (`HH:mm`) as follows: when `endTime` is later than `startTime`, the length is that same-day difference; when `endTime` is earlier than or equal to `startTime`, `endTime` is on the **next calendar day** and the length is `(24:00 − startTime) + endTime` (equal times therefore mean a 24-hour window). The length SHALL be expressed in hours with at most one decimal place (minute precision of `HH:mm` yields multiples of `1/60`; stored project allocations are also at most one decimal place).

#### Scenario: Same-day 09:00–18:00 is nine hours

- **WHEN** the body has `startTime` `09:00` and `endTime` `18:00`
- **THEN** the attendance window is 9 hours

#### Scenario: Overnight 22:00–06:00 is eight hours

- **WHEN** the body has `startTime` `22:00` and `endTime` `06:00`
- **THEN** the attendance window is 8 hours and the request is not rejected for “end before start”

#### Scenario: 09:00–09:00 is twenty-four hours

- **WHEN** `startTime` and `endTime` are the same `HH:mm`
- **THEN** the attendance window is 24 hours

### Requirement: Project hours have at most one decimal place

Each persisted project row SHALL store `hours` as a number in `{0.5, 0.6, …, 24}` (at most one digit after the decimal). The sum of `hours` across all rows of one `POST /reports/batch` (or the single row of `POST /reports`) MUST NOT exceed the attendance window for that request. The sum MAY be smaller than the window. A value of `0`, a value with more than one decimal place (for example `3.34`), or a value below `0.5` SHALL be rejected with `400`. A leftover window shorter than `0.1` hours SHALL NOT be treated as incomplete.

#### Scenario: Allocations under the window are accepted

- **WHEN** the window is 9 hours and two rows submit `hours` 4 and 3
- **THEN** the service persists both rows and responds `201`

#### Scenario: Allocations over the window are rejected

- **WHEN** the window is 9 hours and the rows' `hours` sum to more than 9
- **THEN** the service responds `400` with details that name the overflow and stores nothing

#### Scenario: Zero or two-decimal hours are rejected

- **WHEN** a row has `hours` `0` or `3.34`
- **THEN** the service responds `400` and stores nothing

#### Scenario: One decimal place is accepted

- **WHEN** a row has `hours` `3.3`
- **THEN** the service persists the row

## MODIFIED Requirements

### Requirement: Create a time report

The service SHALL let an authenticated caller create a time report by submitting date, day `startTime` and `endTime` (attendance window), `hours` (project allocation), work location, client, project, task, and description. The stored `userId` SHALL be the JWT subject, never a body field. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Valid report is created

- **WHEN** an authenticated user submits `POST /reports` with a valid body whose client, project, and task form one active hierarchy, whose `hours` has at most one decimal place and is at least `0.5`, and whose `hours` do not exceed the attendance window
- **THEN** the service responds `201` with the persisted report including `id`, `userId`, the window times, and `hours`

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /reports` carries no valid token
- **THEN** the service responds `401` and creates no row

#### Scenario: Overnight window is not treated as invalid interval

- **WHEN** the body has `endTime` earlier than `startTime` and `hours` fit the overnight window
- **THEN** the service responds `201` (it SHALL NOT reject solely because end is before start)

#### Scenario: Hierarchy mismatch or inactive entity is rejected

- **WHEN** `taskId` does not belong to `projectId`, or `projectId` does not belong to `clientId`, or any of the three is missing or inactive
- **THEN** the service responds `400` and creates no row

#### Scenario: Malformed body is rejected

- **WHEN** a required field is missing, `workLocation` is not `OFFICE`/`CLIENT`/`HOME`, times are not `HH:mm`, `hours` is not a number with at most one decimal place, or ids are not UUIDs
- **THEN** the service responds `400` with per-field details and creates no row

### Requirement: Hebrew single-report entry form

The home page (`/`) SHALL show a Hebrew RTL **דיווח ידני** drawer: a segmented control (`דיווח עבודה` selected, `דיווח היעדרות` inert until absences), the day label with the `תקן יומי 9 שע׳` tag, one day-level clock pair (`כניסה` / `יציאה`), a **דיווח פרויקטים** list of project cards, an `הוספת פרויקט` action, and a sticky footer showing allocated hours versus the attendance window (and versus the 9h standard as display only) and `שמירה`.

Each project card SHALL start empty (no stepper). It SHALL expose inline dropdowns for **פרויקט** (options from `GET /me/reporting-options`, client implied — no separate client field), **משימה** (tasks of the chosen project that are in that tree), and **מיקום** (`משרד` / `לקוח` / `בית`), a free-form **שעות** field that starts at `0` and accepts a number with at most one decimal place, and optional free-text. When the chosen project has exactly one assigned task, that task SHALL be selected automatically. Cards SHALL be removable with the existing delete confirmation.

Saving SHALL send one `POST /reports/batch` with the day window plus every card's `hours` and hierarchy. `שמירה` SHALL remain enabled. Incomplete cards, `hours` still `0`, or a sum of hours greater than the window SHALL not send the request and SHALL show an informative Hebrew error (banner and/or field). An empty options tree SHALL also block saving with an explanation.

#### Scenario: Employee reports two projects in one day

- **WHEN** a logged-in user sets `כניסה` and `יציאה`, adds two project cards, fills project/task/location and hours on both, and submits
- **THEN** the client sends one `POST /reports/batch` with the shared window and both rows' `hours`, and on `201` shows success

#### Scenario: Adding a project opens an empty card

- **WHEN** the user presses `הוספת פרויקט`
- **THEN** a new card appears under **דיווח פרויקטים** with empty project, task, and location, and hours at `0` (not a popup stepper)

#### Scenario: Single assigned task is auto-selected

- **WHEN** the user picks a project that has exactly one task in their reporting options
- **THEN** that task is selected without a further picker

#### Scenario: Removing a project asks first

- **WHEN** the user presses `מחיקת פרויקט` on a card
- **THEN** a confirmation asks `למחוק את פרויקט זה מהדיווחים?`, `מעדיף שלא למחוק` keeps the card, and `מחק את הפרויקט` removes only that card

#### Scenario: Incomplete card or zero hours blocks the save with copy

- **WHEN** the user submits with a required dropdown empty or hours still `0` on any card
- **THEN** no request is sent, the problem is marked, and the screen explains what is missing — the save button stays enabled

#### Scenario: Card hours must fit inside the day window

- **WHEN** the sum of card hours is greater than the כניסה–יציאה window (overnight-aware)
- **THEN** the screen shows the error and the day is not saved

### Requirement: Batch create a day's time reports

The service SHALL let an authenticated caller create every row of one calendar day in a single `POST /reports/batch` request whose body carries one `date`, one day `startTime` and `endTime`, and `rows` each with work location, client, project, task, `hours`, and optional description. All rows SHALL be persisted in one transaction: if any row is invalid, none are stored. Each stored row SHALL copy the request's day window onto `startTime`/`endTime` and store that row's `hours`. The stored `userId` SHALL be the JWT subject. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Several rows for one day are created

- **WHEN** an authenticated user submits `POST /reports/batch` with a date, a window, and two or more rows whose hierarchies are active and whose `hours` have at most one decimal place and sum to at most the window
- **THEN** the service responds `201` with the persisted rows in submitted order, each carrying `id`, `userId`, the shared date and window, and `hours`

#### Scenario: One bad row rejects the whole day

- **WHEN** any row has a hierarchy mismatch, an inactive entity, invalid `hours`, or the rows' hours exceed the window
- **THEN** the service responds `400` and no row from that request is stored

#### Scenario: Errors name the failing row

- **WHEN** a row is rejected
- **THEN** the `400` details identify it by position, as `rows.<index>.<field>` (window overflow MAY be reported on `hours` or a top-level `hours` detail)

#### Scenario: Empty or oversized submissions are rejected

- **WHEN** `rows` is empty or holds more than 20 entries
- **THEN** the service responds `400` and stores nothing

#### Scenario: Row description is optional

- **WHEN** a row omits `description`
- **THEN** the row is stored with an empty description and the request still responds `201`
