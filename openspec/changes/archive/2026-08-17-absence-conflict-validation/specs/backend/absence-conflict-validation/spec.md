## Purpose

Defines the shared, server-side rule that a proposed absence (create or edit) is checked against before it is persisted, so the same day can never end up recorded as both "off" and "worked" in a contradictory way.

## ADDED Requirements

### Requirement: Detect overlap with an existing absence
The system SHALL reject a proposed absence whose date range overlaps, to any degree, an existing active absence for the same user.

#### Scenario: Identical range
- **WHEN** a proposed absence has the same start and end date as an existing active absence for the same user
- **THEN** the proposal is rejected as conflicting

#### Scenario: Partial range overlap
- **WHEN** a proposed absence's range overlaps only part of an existing active absence's range for the same user (e.g. the new range starts before the existing one ends)
- **THEN** the proposal is rejected as conflicting on the overlapping dates

#### Scenario: Adjacent, non-overlapping ranges
- **WHEN** a proposed absence starts the day immediately after an existing active absence for the same user ends
- **THEN** the proposal is not rejected on overlap grounds

#### Scenario: Different user, same dates
- **WHEN** a proposed absence overlaps an existing active absence's dates but the existing absence belongs to a different user
- **THEN** the proposal is not rejected on overlap grounds

### Requirement: Detect a full-day absence against reported work hours
The system SHALL reject a full-day absence proposed for any date on which the user already has reported work hours, since a full-day absence claims the entire standard day (9 of 9 hours, per the daily total defined for time reporting) and leaves no remaining hours available.

#### Scenario: Date already fully reported as work
- **WHEN** a full-day absence is proposed for a date where the user's reported work hours for that date already sum to the full 9-hour standard
- **THEN** the proposal is rejected as conflicting on that date

#### Scenario: Date with any reported work hours
- **WHEN** a full-day absence is proposed for a date where the user has reported work hours for that date, whether or not they sum to a full day
- **THEN** the proposal is rejected as conflicting on that date

#### Scenario: Date with no reported work hours
- **WHEN** a full-day absence is proposed for a date where the user has no reported work hours
- **THEN** the proposal is not rejected on this ground

### Requirement: Permit a half-day absence alongside a half-day of reported work
The system SHALL treat a half-day absence (4.5 of the 9-hour standard) as compatible with reported work hours on the same date, up to the remaining 4.5 hours, and SHALL reject it only once reported hours for that date exceed that remainder.

#### Scenario: Half-day absence with exactly half a day reported
- **WHEN** a half-day absence is proposed for a date where the user's reported work hours for that date sum to exactly 4.5 hours
- **THEN** the proposal is not rejected — this is the intended combination

#### Scenario: Half-day absence with no work reported yet
- **WHEN** a half-day absence is proposed for a date where the user has no reported work hours for that date
- **THEN** the proposal is not rejected on this ground

#### Scenario: Half-day absence exceeding the remaining hours
- **WHEN** a half-day absence is proposed for a date where the user's reported work hours for that date exceed 4.5 hours
- **THEN** the proposal is rejected as conflicting on that date

### Requirement: Exclude cancelled absences from overlap checks
The system SHALL NOT count a cancelled (soft-deleted) absence when checking for overlap, so a new or edited absence may reuse dates a cancelled absence previously held.

#### Scenario: New absence on dates held by a cancelled absence
- **WHEN** a proposed absence's dates overlap only a cancelled absence for the same user, with no other active absence in conflict
- **THEN** the proposal is not rejected on overlap grounds

### Requirement: Exclude the absence being edited from its own conflict check
The system SHALL, when checking a proposed edit to an existing absence, exclude that absence's own current record from the overlap check, so an unmodified or partially modified absence does not conflict with itself.

#### Scenario: Editing an absence without changing its dates
- **WHEN** an existing absence is re-submitted for edit with its dates unchanged
- **THEN** the check does not report a conflict against the absence's own prior record

#### Scenario: Editing an absence into a new conflict
- **WHEN** an existing absence is edited such that its new date range overlaps a *different* active absence for the same user
- **THEN** the proposal is rejected as conflicting on the overlapping dates

### Requirement: Report the specific conflicting dates
The system SHALL return the specific date or dates that caused a rejection, and which rule each one violated, rather than a single generic failure — so the calling endpoint can compose a message naming them.

#### Scenario: Single-date conflict
- **WHEN** a proposed absence conflicts on exactly one date
- **THEN** the result identifies that date and the reason (overlapping absence, or reported work hours)

#### Scenario: Multi-date conflict
- **WHEN** a proposed absence conflicts on more than one date, whether from the same rule or different rules on different dates
- **THEN** the result identifies every conflicting date and, for each, the reason

#### Scenario: No conflict
- **WHEN** a proposed absence has no overlap and no work-hours conflict on any of its dates
- **THEN** the result reports no conflicts and the caller may proceed to persist the absence
