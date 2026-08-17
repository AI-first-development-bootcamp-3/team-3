## Purpose

Extends single-report entry (SCRUM-114) so one day can carry several project rows, saved together, from the Figma **דיווח ידני** screen.

## ADDED Requirements

### Requirement: Batch create a day's time reports

The service SHALL let an authenticated caller create every row of one calendar day in a single `POST /reports/batch` request. All rows SHALL be persisted in one transaction: if any row is invalid, none are stored. The stored `userId` SHALL be the JWT subject. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Several rows for one day are created

- **WHEN** an authenticated user submits `POST /reports/batch` with a date and two or more rows whose hierarchies are active and whose end times are not before start times
- **THEN** the service responds `201` with the persisted rows in submitted order, each carrying `id`, `userId`, and the shared date

#### Scenario: One bad row rejects the whole day

- **WHEN** any row has a hierarchy mismatch, an inactive entity, or an end time before its start time
- **THEN** the service responds `400` and no row from that request is stored

#### Scenario: Errors name the failing row

- **WHEN** a row is rejected
- **THEN** the `400` details identify it by position, as `rows.<index>.<field>`

#### Scenario: Empty or oversized submissions are rejected

- **WHEN** `rows` is empty or holds more than 20 entries
- **THEN** the service responds `400` and stores nothing

#### Scenario: Row description is optional

- **WHEN** a row omits `description`
- **THEN** the row is stored with an empty description and the request still responds `201`

### Requirement: Throttle report writes per caller

The service SHALL cap how many requests one authenticated caller may make to the report write routes (`POST /reports`, `POST /reports/batch`) within the configured window, counting every request rather than only the failed ones. A caller over the cap SHALL be rejected with `429` and a `Retry-After` header, and SHALL store nothing. The cap SHALL be keyed by the caller's identity, not by client address.

#### Scenario: A caller past the quota is throttled

- **WHEN** an authenticated caller exceeds the configured number of report writes within the window
- **THEN** the service responds `429` with `Retry-After` and persists no row from that request

#### Scenario: One caller's quota does not spend another's

- **WHEN** one caller is throttled
- **THEN** another authenticated caller's report write still succeeds, even from the same client address

## MODIFIED Requirements

### Requirement: Hebrew single-report entry form

The home page (`/`) SHALL show a Hebrew RTL screen matching the Figma **דיווח ידני** frames: a segmented control (`דיווח עבודה` selected, `דיווח היעדרות` inert until SCRUM-136), the day label with the `תקן יומי 9 שע׳` tag, a clock-in/out card (`כניסה` / `יציאה`), a **דיווח פרויקטים** list of project cards, an `הוספת פרויקט` action, and a sticky footer showing the day's reported-versus-standard progress and `שמירה`.

Each project card SHALL carry its own project, task, location, start time, end time, and optional detail, and SHALL be removable. Selecting project, task, and location SHALL use stepped sheets (`בחר פרויקט` → `בחר משימה` → `בחר מיקום`) driven by `GET /me/reporting-options`, where a client's projects are grouped under the client's name and each step's CTA stays disabled until a choice is made.

Saving SHALL send every card in one `POST /reports/batch`, show success, and reset the screen. An empty options tree SHALL block saving. Validation errors SHALL be shown on the card and field they belong to.

#### Scenario: Employee reports two projects in one day

- **WHEN** a logged-in user sets `כניסה` and `יציאה`, adds two project cards, completes both, and submits
- **THEN** the client sends one `POST /reports/batch` with both rows and on `201` shows success and returns to an empty day

#### Scenario: Adding a project opens an empty card

- **WHEN** the user presses `הוספת פרויקט`
- **THEN** a new card appears under **דיווח פרויקטים** with the day's hours prefilled and its own empty project, task, and location

#### Scenario: Removing a project asks first

- **WHEN** the user presses `מחיקת פרויקט` on a card
- **THEN** a confirmation asks `למחוק את פרויקט זה מהדיווחים?`, `מעדיף שלא למחוק` keeps the card, and `מחק את הפרויקט` removes only that card

#### Scenario: Stepped picker walks the cascade

- **WHEN** the user opens `פרויקט` on a card
- **THEN** `בחר פרויקט` lists projects grouped by client, choosing one enables `המשך ובחר משימה`, that step lists only the chosen project's tasks, and the last step offers `משרד` / `בית` / `בית לקוח`

#### Scenario: Incomplete card blocks the save

- **WHEN** the user submits with a required field empty on any card
- **THEN** no request is sent, the missing field is marked, and the screen explains that details are missing

#### Scenario: Card hours must sit inside the day

- **WHEN** a card's hours fall outside `כניסה`–`יציאה`
- **THEN** the card shows the error and the day is not saved
