## Purpose

Defines the `/admin/tasks` screen's observable behavior, and the
create-task shortcut from the projects screen.

## ADDED Requirements

### Requirement: Admin can view and manage tasks from one screen
The frontend SHALL render a `/admin/tasks` screen listing all tasks (name,
project, status), with the ability to create a task and edit an existing
one, including its open/closed status.

#### Scenario: Viewing the task list
- **WHEN** an admin navigates to `/admin/tasks`
- **THEN** all tasks are listed with name, project, and status

#### Scenario: Closing a task from the screen
- **WHEN** an admin closes a task through the form and confirms
- **THEN** the task's status in the list updates to closed

### Requirement: Admin can create a task directly from a project
The frontend SHALL let an admin create a task from the `/admin/projects`
screen, pre-filled with that project.

#### Scenario: Creating a task from the project screen
- **WHEN** an admin uses the "create task" action on a project row
- **THEN** the task creation form opens with that project already selected
