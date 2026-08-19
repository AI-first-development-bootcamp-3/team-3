# absences-reporting delta (SCRUM-236)

## ADDED Requirements
### Requirement: Employee can save a half vacation day
The service SHALL accept `halfDay: true` on create and update when `type` is `VACATION` and start equals end. It SHALL store `halfDay` true and `workingDayCount` 0.5. Other types or a date range with `halfDay` SHALL be `400`.

#### Scenario: Half vacation on one Sunday
- **WHEN** an authenticated employee POSTs `{ type: VACATION, startDate: a Sunday, halfDay: true }`
- **THEN** the response is `201` with `halfDay` true and `workingDayCount` 0.5

#### Scenario: Absence type menu lists half and full vacation
- **WHEN** an employee opens דיווח היעדרות for a single day
- **THEN** סוג היעדרות includes `חופשה - חצי יום` and `חופשה - יום מלא`
- **AND** choosing half-day saves `type: VACATION` with `halfDay: true`

#### Scenario: Half-day with 4.5 hours already reported
- **WHEN** the same date already has 4.5 reported hours
- **THEN** the half vacation is accepted

#### Scenario: Half-day with more than 4.5 hours reported
- **WHEN** the same date already has more than 4.5 reported hours
- **THEN** the service responds `409` `WORK_HOURS_CONFLICT`
