## Purpose

The Hebrew RTL, mobile-first form an employee uses to report an absence: choosing a type, a single date or a date range, seeing the resulting working-day count, and seeing conflict or validation errors against the specific date(s) involved.

## ADDED Requirements

### Requirement: Absence type selection from the fixed list

The form SHALL present a dropdown of exactly the four defined absence types with their Hebrew labels (חופשה / מחלה / מילואים / אחר), and SHALL block submission until one is selected.

#### Scenario: No type selected

- **WHEN** the form is submitted without a type chosen
- **THEN** submission is blocked and an inline error is shown against the type field

### Requirement: Single date or date-range input

The form SHALL let the employee choose either a single date or a from–to range for the absence.

#### Scenario: Single date submitted

- **WHEN** the employee selects one date and submits
- **THEN** the request sent represents a single-day absence

#### Scenario: Range submitted

- **WHEN** the employee selects a from and to date and submits
- **THEN** the request sent represents that date range

### Requirement: Working-day count is visible before submission

The form SHALL display the number of working days the current type/date selection amounts to, so the Friday/Saturday exclusion is visible rather than silent, updating as the date selection changes.

#### Scenario: Selection spanning a weekend

- **WHEN** the employee selects a range that includes a Friday or Saturday
- **THEN** the displayed working-day count excludes those days

### Requirement: Conflict and validation errors are shown against the specific date(s)

When the server rejects the request (malformed input or a date conflict), the form SHALL surface each returned error against the date(s) it names, not as a single generic message.

#### Scenario: Server reports a conflicting date

- **WHEN** the server responds with a conflict naming one or more clashing dates
- **THEN** the form displays an error attached to each named date

### Requirement: RTL, mobile-first layout

The form SHALL render right-to-left with Hebrew labels and remain usable on a mobile viewport, consistent with the app's existing Hebrew RTL forms.

#### Scenario: Narrow viewport

- **WHEN** the form is viewed on a mobile-width screen
- **THEN** all fields and the working-day count remain visible and usable without horizontal scrolling
