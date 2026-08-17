## Purpose

Defines the admin section's container: the sub-navigation between the
admin CRUD screens and the routing structure they hang off of, independent
of what any individual screen does.

## ADDED Requirements

### Requirement: Admin section exposes navigation to each management area
The frontend SHALL render navigation to users, clients, projects, tasks, and
assignments management from within the admin section, and SHALL include a
visible but non-functional slot for month-closing.

#### Scenario: Admin navigates the admin section
- **WHEN** an admin user is on any `/admin/*` route
- **THEN** navigation links to `/admin/users`, `/admin/clients`,
  `/admin/projects`, `/admin/tasks`, and `/admin/assignments` are visible

#### Scenario: Month-closing slot is present but inert
- **WHEN** an admin user views the admin navigation
- **THEN** a month-closing entry is visible but does not navigate anywhere
  when interacted with

### Requirement: Admin routes render within a shared layout
The frontend SHALL render every `/admin/*` route inside a shared admin
layout that provides the navigation and works on both desktop and mobile
viewports, right-to-left.

#### Scenario: Navigating between admin screens
- **WHEN** an admin user moves from one `/admin/*` route to another
- **THEN** the shared admin layout and navigation persist, and only the
  route-specific content changes

#### Scenario: Admin layout on a mobile viewport
- **WHEN** the admin section is viewed on a mobile-width viewport
- **THEN** the navigation remains usable (not clipped or overlapping content)
