## Purpose

Defines the shared pure function that turns a date range into working days for the Israeli work week (Sunday–Thursday), so every Absences feature computes duration the same way instead of reimplementing weekend logic.

## ADDED Requirements

### Requirement: Expand a date range into working days
The system SHALL expand an inclusive start/end date range into the list of working days it contains, excluding Friday and Saturday.

#### Scenario: Range spanning one or more weekends
- **WHEN** a range spans one or more Friday/Saturday weekends
- **THEN** the returned list excludes every Friday and every Saturday in the range and includes every Sunday–Thursday date

#### Scenario: Range consisting only of Friday and Saturday
- **WHEN** the range contains only Friday and/or Saturday dates (e.g. starts on a Friday and ends the following Saturday)
- **THEN** the returned list of working days is empty

#### Scenario: Single-day range on a working day
- **WHEN** start and end are the same date and that date falls Sunday–Thursday
- **THEN** the returned list contains exactly that one date

#### Scenario: Single-day range on a weekend day
- **WHEN** start and end are the same date and that date is a Friday or Saturday
- **THEN** the returned list is empty

#### Scenario: Range crossing a month boundary
- **WHEN** the range spans two different calendar months
- **THEN** working days are computed correctly across the boundary, with no date dropped or duplicated

#### Scenario: Range crossing a year boundary
- **WHEN** the range spans December 31 into January 1 of the next year
- **THEN** working days are computed correctly across the boundary, with no date dropped or duplicated

### Requirement: Return a working-day count
The system SHALL return a count of working days alongside the expanded list, equal to the list's length, so callers can display a duration without recomputing it.

#### Scenario: Count matches the expanded list
- **WHEN** a date range is expanded
- **THEN** the returned count equals the number of dates in the returned working-day list

### Requirement: Reject inverted ranges
The system SHALL reject a range whose end date precedes its start date rather than returning an empty or negative result.

#### Scenario: End date before start date
- **WHEN** the supplied end date is earlier than the supplied start date
- **THEN** the function rejects the input (throws or returns an error result) instead of silently returning zero working days

### Requirement: Extension point for a future holiday calendar
The system SHALL be structured so an optional holiday calendar can be supplied later to exclude additional dates, without requiring existing callers to change how they invoke it. Israeli public holidays SHALL NOT be excluded by this change.

#### Scenario: No holiday calendar supplied
- **WHEN** the function is called without a holiday calendar
- **THEN** only Friday and Saturday are excluded; no other dates are treated as non-working

### Requirement: Single source of truth for weekend exclusion
The system SHALL provide the only implementation of Friday/Saturday weekend-exclusion logic in the backend. Other code that needs working-day duration SHALL call this function rather than reimplementing the rule.

#### Scenario: A later feature needs working-day duration
- **WHEN** a future Absences endpoint needs to compute a working-day duration
- **THEN** it imports and calls this shared function instead of writing its own weekend-exclusion logic
