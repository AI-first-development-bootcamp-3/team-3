## Purpose

Lets an employee record a full-day absence (type and dates) from the daily drawer, with working-day counts and conflict rejection before anything is stored.

## ADDED Requirements

### Requirement: Create an absence

The service SHALL let an authenticated caller create one full-day absence by submitting `type` (`VACATION` / `SICK` / `RESERVE_DUTY` / `OTHER`), `startDate` (`YYYY-MM-DD`), and optional `endDate` (`YYYY-MM-DD`). When `endDate` is omitted, it SHALL equal `startDate`. The stored `userId` SHALL be the JWT subject. `halfDay` SHALL be stored as `false`. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Valid single-day absence is created

- **WHEN** an authenticated user submits `POST /absences` with `type` `VACATION` and `startDate` a Sunday–Thursday
- **THEN** the service responds `201` with the persisted absence including `id`, `userId`, `type`, `startDate`, `endDate` equal to `startDate`, `halfDay` false, and `workingDayCount` of `1`

#### Scenario: Valid range uses inclusive end date

- **WHEN** an authenticated user submits `startDate` `2026-08-09` (Sunday) and `endDate` `2026-08-13` (Thursday)
- **THEN** the service persists that range and `workingDayCount` is `5`

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /absences` carries no valid session
- **THEN** the service responds `401` and creates no row

#### Scenario: Unknown type or inverted dates are rejected

- **WHEN** `type` is not one of the four values, or `endDate` is before `startDate`, or a date is not `YYYY-MM-DD`
- **THEN** the service responds `400` and creates no row

### Requirement: Working days exclude Friday and Saturday

The create path SHALL compute `workingDayCount` with the existing working-day expansion (Sunday–Thursday only). A range whose working-day count is `0` SHALL be rejected with `400`.

#### Scenario: Weekend days are not counted

- **WHEN** the range is Thursday through Sunday
- **THEN** `workingDayCount` is `2` (Thursday and Sunday)

#### Scenario: Friday-only range is rejected

- **WHEN** `startDate` and `endDate` are the same Friday
- **THEN** the service responds `400` and creates no row

### Requirement: Conflicts are rejected with dates

Before insert, the service SHALL run the existing absence conflict check (`halfDay` false). If any date conflicts, the service SHALL respond `409` with those dates and reasons (`OVERLAPPING_ABSENCE` or `WORK_HOURS_CONFLICT`) and SHALL store nothing.

#### Scenario: Overlap with an existing absence

- **WHEN** the caller already has an active absence overlapping the requested range
- **THEN** the response is `409` listing the overlapping dates and no new row is stored

#### Scenario: Work hours already reported on a requested day

- **WHEN** the caller has a time report on a date inside the requested range
- **THEN** the response is `409` with `WORK_HOURS_CONFLICT` for that date and no new row is stored

### Requirement: Hebrew absence form in the daily drawer

The home daily drawer SHALL enable **דיווח העדרות** next to **דיווח ידני**. That tab SHALL show a Hebrew RTL form: type (חופשה / מחלה / מילואים / אחר), start date, optional end date (empty end means the same day), the working-day count for the current selection, and שמירה.

#### Scenario: Employee reports vacation spanning a weekend

- **WHEN** a logged-in user opens **דיווח העדרות**, chooses חופשה, from Thursday to Sunday, and saves
- **THEN** the client sends `POST /absences` and the form shows `2` working days before save

#### Scenario: Conflict errors name the dates

- **WHEN** save returns `409` with conflicting dates
- **THEN** the form shows a Hebrew message that includes those dates and does not claim success

#### Scenario: Incomplete type or dates block save

- **WHEN** the user submits with no type or no start date
- **THEN** no request is sent and the missing fields are marked

### Requirement: Cancel an absence from the daily drawer

The service SHALL let an authenticated caller cancel one of their absences with `DELETE /absences/:id`. The row SHALL be soft-deleted (`isActive` false) so it remains in history. The whole stored range SHALL be cancelled. An unauthenticated caller SHALL be rejected with `401`. An id that belongs to another user SHALL be `403`. An unknown or already-cancelled id SHALL be `404`.

On the home daily drawer, **מחיקת דיווח** SHALL be enabled when that calendar date has saved hours or an overlapping absence. Confirming on an absence-only day SHALL call `DELETE /absences/:id` and refresh פירוט יומי.

#### Scenario: Owner cancels a range

- **WHEN** an authenticated user deletes an absence they own
- **THEN** the service responds `204` and later month lists omit that row

#### Scenario: Another user's absence is forbidden

- **WHEN** an authenticated user deletes an absence owned by someone else
- **THEN** the service responds `403` and the row stays active

#### Scenario: Drawer delete on an absence day

- **WHEN** the employee opens a day covered by a vacation range and confirms מחיקת דיווח
- **THEN** the client sends `DELETE /absences/:id` for that range and does not send `DELETE /reports`
