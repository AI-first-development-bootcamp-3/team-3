## Purpose

Resolve official Israeli paid public holidays to Gregorian dates and materialize system-owned חג absences for active users.

## ADDED Requirements

### Requirement: Resolve holidays for a Gregorian year
The system SHALL return the in-scope Israeli paid public holidays for a Gregorian year, each with a stable `code`, Hebrew `nameHe`, and civil `date` (`YYYY-MM-DD`). Dates SHALL follow the Hebrew calendar for that year, including Yom HaAtzmaut postponement used in Israel.

In-scope codes: `rosh_hashana_1`, `rosh_hashana_2`, `yom_kippur`, `sukkot`, `simchat_torah`, `pesach`, `pesach_7`, `shavuot`, `yom_haatzmaut`.

#### Scenario: List 2026 holidays with civil dates
- **WHEN** a caller requests holidays for year 2026
- **THEN** each in-scope code appears once with a `YYYY-MM-DD` in 2026 (or the civil date Israel observes that year) that matches the Hebrew calendar, not a hardcoded English-calendar guess

#### Scenario: Independence Day postponement
- **WHEN** Yom HaAtzmaut is postponed so it does not fall on Friday or Saturday
- **THEN** `yom_haatzmaut.date` is the observed weekday Israel uses that year

### Requirement: Persist resolved dates
The system SHALL upsert resolved holidays per year so later requests do not depend on a live network calendar.

#### Scenario: Idempotent year sync
- **WHEN** holidays for the same year are resolved twice
- **THEN** the stored set is unchanged in membership (same codes and dates)

### Requirement: Auto-create חג absences on working weekdays
The system SHALL ensure every **active** user has a one-day `HOLIDAY` absence (`startDate = endDate`) on each in-scope holiday whose civil date is Sunday–Thursday, when that month is not locked.

#### Scenario: Thursday holiday
- **WHEN** an in-scope holiday falls on a Thursday and the month is unlocked
- **THEN** each active user has exactly one `HOLIDAY` absence on that date

#### Scenario: Friday or Saturday holiday
- **WHEN** an in-scope holiday falls on Friday or Saturday
- **THEN** no `HOLIDAY` absence is created for that date

#### Scenario: Locked month
- **WHEN** the holiday date sits in a locked month
- **THEN** the system does not create, replace, or delete rows for that date

### Requirement: Replace existing occupancy on the holiday date
When materializing a `HOLIDAY` absence for a user on an unlocked Sunday–Thursday holiday, the system SHALL remove that user’s time reports on that date and SHALL split or shrink other absences so they no longer cover that date.

#### Scenario: Hours already reported
- **WHEN** the user has time-report rows on the holiday date
- **THEN** those reports are deleted and a `HOLIDAY` absence remains for that date

#### Scenario: Vacation overlapping the holiday
- **WHEN** the user has a `VACATION` range that includes the holiday date
- **THEN** that range no longer includes the holiday date (split into before/after as needed) and a `HOLIDAY` absence covers the holiday date

### Requirement: Authenticated holiday list API
`GET /holidays?year=` SHALL require authentication and SHALL return the resolved list `{ holidays: [{ code, nameHe, date }] }` for that Gregorian year (401 if unauthenticated).

#### Scenario: Employee fetches 2026
- **WHEN** an authenticated user `GET /holidays?year=2026`
- **THEN** the response is 200 and includes `nameHe` and `date` for each in-scope code

#### Scenario: Missing year
- **WHEN** `year` is missing or not a four-digit year
- **THEN** the response is 400
