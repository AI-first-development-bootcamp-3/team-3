## Purpose

Defines how the backend persists data: the four core entities every feature epic builds on, how schema changes are applied and shared between developers, and the project-wide rule that records are deactivated rather than destroyed.

## ADDED Requirements

### Requirement: Environment-driven database configuration

Database connection details SHALL be supplied entirely through environment variables, with no credentials committed to the repository. The same build artifact SHALL be usable against development, test, and production databases by changing configuration alone.

#### Scenario: Connection uses environment configuration

- **WHEN** the service starts with a database connection string in its environment
- **THEN** it connects to that database without requiring a code or build change

#### Scenario: Credentials are absent from version control

- **WHEN** the repository is inspected
- **THEN** no real database credentials are present in tracked files
- **AND** an example environment file documents every required variable by name

### Requirement: Core entity schema

The database SHALL define the four entities the feature epics depend on — Users, Clients, Projects, and Tasks — with referential integrity enforced between them. A Project SHALL belong to a Client, and a Task SHALL belong to a Project, so that a Client → Project → Task hierarchy can be traversed.

#### Scenario: Hierarchy can be traversed

- **WHEN** a Client, a Project belonging to it, and a Task belonging to that Project exist
- **THEN** the tasks available for a given client can be resolved through the hierarchy

#### Scenario: Referential integrity is enforced

- **WHEN** a write attempts to create a Project referencing a Client that does not exist
- **THEN** the database rejects the write

#### Scenario: Users carry a role

- **WHEN** a User record is created
- **THEN** it carries a role distinguishing administrators from regular employees

### Requirement: Reproducible schema migrations

Schema changes SHALL be expressed as ordered, version-controlled migration files. Applying all migrations to an empty database SHALL produce the current schema, so every developer and every environment converges on an identical structure.

#### Scenario: Empty database is brought current

- **WHEN** migrations are applied against an empty database
- **THEN** all core tables and their relationships are created
- **AND** the resulting schema matches that of an already-migrated environment

#### Scenario: Migrations are idempotent once applied

- **WHEN** migrations are applied against a database already at the latest version
- **THEN** no changes are made and the command succeeds

### Requirement: Development seed data

A seed routine SHALL populate a development database with representative data covering the full Client → Project → Task hierarchy and both user roles, so that features can be exercised locally without manual data entry.

#### Scenario: Seeding produces a usable dataset

- **WHEN** the seed routine is run against a migrated, empty database
- **THEN** at least one administrator and one regular employee exist
- **AND** clients, their projects, and those projects' tasks exist and are linked

#### Scenario: Seeding is repeatable

- **WHEN** the seed routine is run twice against the same database
- **THEN** it completes successfully without producing duplicate or orphaned records

### Requirement: Soft-delete convention

Deleting a record SHALL deactivate it rather than remove the row, preserving historical time reports that reference it. Queries SHALL exclude deactivated records by default, and SHALL include them only when a caller explicitly asks.

#### Scenario: Deletion deactivates

- **WHEN** a delete operation is performed on a record
- **THEN** the row remains present in the database
- **AND** the record is marked inactive

#### Scenario: Default queries hide deactivated records

- **WHEN** records of a type are listed without any explicit inactive-inclusion flag
- **THEN** deactivated records are absent from the result

#### Scenario: Historical references survive deactivation

- **WHEN** a Task that existing time reports reference is deactivated
- **THEN** those reports still resolve the task's details
- **AND** the task is no longer offered for new reports

#### Scenario: Deactivated records are retrievable on request

- **WHEN** a caller explicitly requests inactive records be included
- **THEN** both active and deactivated records are returned
