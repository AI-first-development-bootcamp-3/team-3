# frontend-foundation Specification

## Purpose
The structural conventions the frontend is built on — where source code lives and how the app routes
between its main areas — so every later capability (styling, auth, forms, feature Stories) has a
predictable place to attach to instead of each inventing its own layout.
## Requirements
### Requirement: Consistent source folder layout
The frontend SHALL organize source code under a fixed set of top-level folders: `components/`, `pages/`,
`hooks/`, `services/`, `types/`. Code introduced by later capabilities MUST be placed under the folder
matching its role rather than a newly invented top-level folder.

#### Scenario: New capability adds code
- **WHEN** a later change adds a reusable UI element, a routed page, a data-fetching hook, an API call,
  or a shared type
- **THEN** it is placed under `components/`, `pages/`, `hooks/`, `services/`, or `types/` respectively,
  not in a new ad-hoc top-level folder

### Requirement: Routing shell with a base layout
The app SHALL provide client-side routing with a shared base layout wrapping every route, and a
placeholder route for each main app area (admin, tasks, absences, reports).

#### Scenario: Navigating to a main app area
- **WHEN** a user navigates to one of the main app area routes
- **THEN** the base layout renders and the area's placeholder content is shown inside it

#### Scenario: Navigating to an undefined route
- **WHEN** a user navigates to a URL that matches no defined route
- **THEN** a not-found page renders instead of a blank screen

