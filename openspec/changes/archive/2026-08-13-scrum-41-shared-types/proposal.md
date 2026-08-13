## Why

No backend exists yet to generate types from, but the frontend needs a single, agreed shape for its core
domain entities before the API client (SCRUM-20) and any feature Story can be built — otherwise each
Story invents its own ad-hoc shape for "a user" or "an absence."

## What Changes

- Define TypeScript types for User, Client, Project, Task, Report, Absence
- Place them under `src/types/`, one file per entity
- Record the hand-written-vs-generated decision for when a backend/Swagger spec exists

## Capabilities

### New Capabilities
- `frontend-data`: the app's data contracts and access layer — shared entity types now, the API client
  and env config land in the same capability next (SCRUM-20).

### Modified Capabilities
_None._

## Impact

New files under `frontend/src/types/`. No runtime code — types only, erased at build time.
