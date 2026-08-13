## Purpose

The app's form-handling pattern — how a form's validation rules are defined, checked and surfaced to the
user — so every Story's form (reporting, absences, admin CRUD) follows one consistent shape instead of
each hand-rolling its own validation.

## ADDED Requirements

### Requirement: Schema-driven form validation
The frontend SHALL validate form input against a declared schema rather than ad-hoc per-field checks,
so validation logic is defined once, is independently testable, and is consistent across every form.

#### Scenario: Required field left empty
- **WHEN** a form is submitted with a required field left empty
- **THEN** submission is blocked and an inline error is shown against that field

#### Scenario: Cross-field rule violated
- **WHEN** a form is submitted with values that individually pass but together violate a cross-field
  rule (e.g. an end time before its start time)
- **THEN** submission is blocked and an inline error identifies the violated rule
