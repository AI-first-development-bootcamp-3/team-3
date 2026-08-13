# frontend-data Specification

## Purpose
The app's data contracts — shared entity types, the API client, env config and date/locale formatting —
so every feature Story reads, writes and displays data the same way instead of each inventing its own.

## Requirements

### Requirement: Canonical shared types for core entities
The frontend SHALL provide a single canonical TypeScript type for each of: User, Client, Project, Task,
Report, Absence, located under `src/types/`.

#### Scenario: Code needs to reference an entity
- **WHEN** any component, hook, or service needs to represent a User, Client, Project, Task, Report, or
  Absence
- **THEN** it imports the shared type from `src/types/` rather than declaring an inline or duplicate shape

### Requirement: Configurable API base URL
The frontend SHALL read the backend API base URL from an environment variable rather than hardcoding it,
so the same build can point at different backends (local, staging) without a code change.

#### Scenario: Client makes a request
- **WHEN** the API client sends a request
- **THEN** it targets the base URL from `VITE_API_URL`, not a hardcoded value

### Requirement: Shared API client wrapper
The frontend SHALL provide a single shared wrapper for backend HTTP requests, so every feature Story
issues requests the same way instead of each calling `fetch` directly with its own conventions.

#### Scenario: Feature code calls the backend
- **WHEN** any component, hook, or service needs to call the backend
- **THEN** it goes through the shared API client wrapper rather than calling `fetch` directly

### Requirement: Dates formatted in Hebrew locale
The frontend SHALL format and parse dates using a single configured date library set to Hebrew locale,
so every date picker, timestamp and monthly view displays consistently rather than each component
picking its own formatting.

#### Scenario: Date picker renders
- **WHEN** any date or time picker component is rendered
- **THEN** it displays in Hebrew locale formatting
