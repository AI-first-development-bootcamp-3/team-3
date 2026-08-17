## Purpose

Defines the shared list/table and entity-form-with-toggle-and-confirm
behavior every admin CRUD screen (users, clients, projects, tasks,
assignments) must provide consistently, independent of which entity is
being managed.

## ADDED Requirements

### Requirement: Admin entity lists are sortable and mobile-readable
The frontend SHALL render admin entity lists as a sortable table that
remains readable on mobile viewports, in RTL layout.

#### Scenario: Sorting a column
- **WHEN** an admin clicks a sortable column header in an admin entity list
- **THEN** the list re-orders by that column

#### Scenario: Viewing an admin entity list on mobile
- **WHEN** an admin entity list is viewed on a mobile-width viewport
- **THEN** the table content remains readable without horizontal overflow
  breaking the layout

### Requirement: Admin entity forms include an active/inactive toggle
Every admin entity form SHALL expose an active/inactive toggle reflecting
and controlling the entity's soft-delete state.

#### Scenario: Deactivating an entity via the toggle
- **WHEN** an admin switches an entity's toggle from active to inactive and
  saves
- **THEN** the entity's active flag is set to false and it is soft-deleted,
  not hard-deleted

### Requirement: Deactivating an entity requires confirmation
The frontend SHALL require an explicit confirmation step before an admin
entity form's deactivation takes effect.

#### Scenario: Confirming deactivation
- **WHEN** an admin triggers deactivation on an entity form
- **THEN** a confirmation prompt appears, and the entity is only deactivated
  if the admin confirms

#### Scenario: Cancelling the confirmation
- **WHEN** an admin triggers deactivation and then cancels the confirmation
  prompt
- **THEN** the entity's active state is unchanged
