## Purpose

Lets an authenticated employee create an absence covering a single date or a date range, with a server-computed working-day count and a pre-persistence conflict check.

## ADDED Requirements

### Requirement: Create an absence for the authenticated employee

The service SHALL let an authenticated caller create an absence by submitting `type`, `startDate`, and an optional `endDate`. The stored `userId` SHALL be the JWT subject, never a body field. An unauthenticated caller SHALL be rejected with `401`.

#### Scenario: Single-date absence is created

- **WHEN** an authenticated user submits `POST /absences` with `type` and `startDate` only
- **THEN** the service responds `201` with a persisted absence whose `startDate` and `endDate` are equal

#### Scenario: Date-range absence is created

- **WHEN** an authenticated user submits `POST /absences` with `type`, `startDate`, and a later `endDate`
- **THEN** the service responds `201` with a persisted absence covering that whole range as one record

#### Scenario: Unauthenticated caller is refused

- **WHEN** a request to `POST /absences` carries no valid token
- **THEN** the service responds `401` and creates no row

#### Scenario: Malformed body is rejected

- **WHEN** `type` is outside the fixed list, `startDate` is missing or not a valid date, or `endDate` is present but invalid
- **THEN** the service responds `400` with per-field details and creates no row

### Requirement: Absence type constrained to the fixed list

The endpoint SHALL accept exactly one of `VACATION`, `SICK`, `RESERVE_DUTY`, or `OTHER`, rejecting any other value before persistence.

#### Scenario: Each defined type can be reported

- **WHEN** an absence is submitted with any one of the four defined types
- **THEN** the service responds `201` with that type stored on the record

### Requirement: Working days computed via the shared utility

The service SHALL compute the working-day count for the submitted range using the shared `expandWorkingDays` function (Israeli work week, Friday and Saturday excluded) and include it in the response, rather than reimplementing weekend exclusion.

#### Scenario: Range spanning a weekend yields the correct count

- **WHEN** a submitted date range spans one or more Fridays/Saturdays
- **THEN** the response's working-day count excludes those days

#### Scenario: Inverted range is rejected

- **WHEN** `endDate` is before `startDate`
- **THEN** the service responds `400` and creates no row

### Requirement: Conflicting dates are rejected before persistence

The service SHALL check the submitted range for conflicts (overlapping absences and work-hour budget conflicts) before writing any row, and SHALL reject with `409` naming every clashing date when a conflict is found.

#### Scenario: Overlapping absence is rejected

- **WHEN** the submitted range overlaps an existing active absence for the same user
- **THEN** the service responds `409` with the clashing date(s) identified, and creates no row

#### Scenario: No conflict, request succeeds

- **WHEN** the submitted range has no overlapping absence and no work-hour budget conflict
- **THEN** the service proceeds to create the row and responds `201`
