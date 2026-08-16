## Purpose

Defines the storage shape for employee absences and their supporting documents: how a date range is represented, which types and flags an absence carries, and how cancellation interacts with the shared soft-delete convention.

## ADDED Requirements

### Requirement: Absence spans a contiguous date range as a single record

An absence SHALL be represented as one record covering a start date and an end date, not as one record per calendar day within the range.

#### Scenario: Multi-day absence is a single record

- **WHEN** an employee reports an absence from a start date to a later end date
- **THEN** exactly one absence record is created covering that whole range

#### Scenario: Single-day absence has equal start and end date

- **WHEN** an employee reports an absence for one day only
- **THEN** the absence record's start date and end date are the same date

### Requirement: Absence type constrained to a fixed list

An absence SHALL be one of exactly four types: vacation, sick, reserve duty, or other. No other value SHALL be accepted.

#### Scenario: Permitted type is accepted

- **WHEN** an absence is created with one of the four defined types
- **THEN** the absence record is stored with that type

#### Scenario: Undefined type is rejected

- **WHEN** an absence is created with a type outside the defined list
- **THEN** the record is rejected and not stored

### Requirement: Half-day absences are representable

An absence SHALL carry a half-day flag, independent of its type, indicating the employee was absent for only part of the working day.

#### Scenario: Half-day absence is flagged

- **WHEN** an employee reports an absence covering only half of a working day
- **THEN** the absence record's half-day flag is set
- **AND** its start date and end date still identify the affected day

#### Scenario: Full-day absence is not flagged

- **WHEN** an employee reports an absence covering a full working day
- **THEN** the absence record's half-day flag is not set

### Requirement: Cancelling an absence soft-deletes it

Cancelling an absence SHALL follow the shared soft-delete convention: the record is marked inactive and excluded from default reads, never removed from storage.

#### Scenario: Cancelled absence is excluded from default reads

- **WHEN** an absence is cancelled
- **THEN** it no longer appears in a default listing of the employee's absences
- **AND** the underlying record still exists in storage

#### Scenario: Cancelled absence remains visible to historical/explicit queries

- **WHEN** a query explicitly includes inactive records
- **THEN** a cancelled absence is still returned with its original data intact

### Requirement: Absence supporting documents link to exactly one absence

A supporting document SHALL be linked to the single absence it supports, and an absence SHALL be able to have more than one linked document.

#### Scenario: Multiple documents on one absence

- **WHEN** more than one supporting document is uploaded for the same absence
- **THEN** all of them are retrievable as documents linked to that absence

#### Scenario: Document is not orphaned

- **WHEN** a supporting document is stored
- **THEN** it identifies exactly one absence it belongs to

### Requirement: Absence date range is valid at the storage level

An absence's end date SHALL NOT precede its start date. This SHALL be guaranteed by storage itself, not only by application code that happens to validate it on the way in.

#### Scenario: Valid range is stored

- **WHEN** an absence is stored with an end date on or after its start date
- **THEN** the write succeeds

#### Scenario: Inverted range is refused

- **WHEN** any write path attempts to store an absence with an end date before its start date
- **THEN** storage refuses the write, regardless of which application code produced it

### Requirement: Absence document retrieval extends to the absence's owner

A supporting document linked to an absence SHALL be retrievable by the employee who owns that absence, in addition to whoever uploaded it and any administrator — since an absence document may be uploaded by someone other than the employee it belongs to.

#### Scenario: Absence owner retrieves a document they didn't upload

- **WHEN** a supporting document linked to an employee's absence was uploaded by someone else
- **AND** that employee requests the document
- **THEN** the document is returned to them

#### Scenario: Unrelated caller is still refused

- **WHEN** a caller who neither uploaded the document nor owns the absence it's linked to requests it
- **AND** that caller is not an administrator
- **THEN** the request is refused

### Requirement: Cancelled absences are excluded from aggregate views by default

Aggregate or grouped queries over absences (totals, counts, and similar) SHALL exclude cancelled absences by default, consistent with how they are already excluded from list and detail queries.

#### Scenario: Cancelled absence does not contribute to a total

- **WHEN** an aggregate query totals a user's absence days
- **AND** one of that user's absences has been cancelled
- **THEN** the cancelled absence does not contribute to the total
