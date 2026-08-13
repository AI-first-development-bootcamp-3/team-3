# frontend-data Specification

## Purpose
The app's data contracts — shared entity types and, once SCRUM-20 lands in this same capability, the API
client and env config that use them — so every feature Story reads and writes the same shape for a given
entity instead of each inventing its own.
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

