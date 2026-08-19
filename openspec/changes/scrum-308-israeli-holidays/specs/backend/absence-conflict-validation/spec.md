## ADDED Requirements

### Requirement: Holiday materialization may replace occupancy
Conflict rules that forbid overlapping absences or hours SHALL still apply to employee-submitted absences. The system holiday materializer SHALL be allowed to clear that occupancy on an unlocked holiday date in order to write the `HOLIDAY` row.

#### Scenario: Employee cannot stack vacation on an existing חג
- **WHEN** a user already has a `HOLIDAY` absence on a date and they `POST /absences` a `VACATION` that includes that date
- **THEN** the response is 409 (or the existing conflict status) and the `HOLIDAY` row remains
