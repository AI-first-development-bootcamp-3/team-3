## ADDED Requirements

### Requirement: HOLIDAY absence type is system-owned
The absences data model SHALL include `AbsenceType.HOLIDAY`. Public create/update/delete endpoints SHALL reject `HOLIDAY` for ordinary callers (400). Employees SHALL NOT delete a `HOLIDAY` row (403 or 400). Only the holiday materialization service may insert or reshape `HOLIDAY` rows.

#### Scenario: Employee posts HOLIDAY
- **WHEN** an employee `POST /absences` with `type: HOLIDAY`
- **THEN** the response is 400 and no row is created

#### Scenario: Employee deletes a חג row
- **WHEN** an employee `DELETE /absences/:id` for a `HOLIDAY` absence they own
- **THEN** the response is 403 or 400 and the row remains
