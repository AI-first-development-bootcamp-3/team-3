## MODIFIED Requirements

### Requirement: Admin can edit a project
The backend SHALL let an admin update a project's name, active status, and
report format (total hours or clock-in/clock-out).

#### Scenario: Editing project details
- **WHEN** an admin updates an existing project's name
- **THEN** the project record reflects the new name

#### Scenario: Setting a project's report format
- **WHEN** an admin sets a project's report format to total hours or to
  clock-in/clock-out
- **THEN** the project record reflects that report format

#### Scenario: New project defaults to clock-in/clock-out
- **WHEN** a project is created without specifying a report format
- **THEN** its report format is clock-in/clock-out
