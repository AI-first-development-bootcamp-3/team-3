## Purpose

Defines how backend code is verified: a runner that executes tests against TypeScript sources, coverage measurement against the project's mandated threshold, and a disposable database so logic that touches SQL can be tested for real rather than mocked.

## ADDED Requirements

### Requirement: Automated test execution

The backend SHALL provide a single command that executes its test suite and exits non-zero on any failure, so that both developers and the CI pipeline use the same entry point.

#### Scenario: Suite runs from one command

- **WHEN** the test command is run
- **THEN** all backend tests execute
- **AND** results are reported per test

#### Scenario: Failures fail the command

- **WHEN** any test in the suite fails
- **THEN** the command exits with a non-zero status code

#### Scenario: TypeScript needs no separate build

- **WHEN** tests are executed against TypeScript sources
- **THEN** they run without requiring a prior compilation step

### Requirement: Coverage reporting

The test suite SHALL report line coverage and SHALL be able to fail when coverage falls below the project's mandated 60% minimum.

#### Scenario: Coverage is reported

- **WHEN** the suite is run with coverage enabled
- **THEN** a coverage summary is produced for the backend sources

#### Scenario: Threshold is enforceable

- **WHEN** coverage falls below the configured 60% minimum
- **THEN** the command exits non-zero

#### Scenario: Generated and config files are excluded

- **WHEN** coverage is calculated
- **THEN** generated database clients, migration files, and configuration files are excluded from the denominator

### Requirement: Isolated test database

Tests that exercise persistence SHALL run against a real database instance separate from any development database, so a test run can never destroy development data.

#### Scenario: Test database is separate

- **WHEN** the test suite runs
- **THEN** it connects to a database distinct from the development database
- **AND** development data is untouched by the run

#### Scenario: Schema matches production shape

- **WHEN** the test database is prepared
- **THEN** the same migrations that build every other environment are applied to it

#### Scenario: Tests do not leak state between them

- **WHEN** one test writes records and a later test queries the same table
- **THEN** the later test does not observe the earlier test's records

#### Scenario: Suite is repeatable

- **WHEN** the full suite is run twice in succession without manual cleanup
- **THEN** both runs produce identical results

#### Scenario: Pipeline can run the same suite

- **WHEN** the suite is executed in the CI environment
- **THEN** a test database is available to it and the suite runs unmodified
