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

