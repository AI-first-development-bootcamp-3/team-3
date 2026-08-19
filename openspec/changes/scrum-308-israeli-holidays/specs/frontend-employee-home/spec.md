## ADDED Requirements

### Requirement: חג appears on the month grid without using vacation
The employee home month view SHALL show a Hebrew **חג** badge (or equivalent absence chip) on days that have a `HOLIDAY` absence. The ימי חופשה KPI SHALL NOT count `HOLIDAY` days. Those days SHALL NOT count as missing reports.

#### Scenario: Holiday Thursday in the current month
- **WHEN** the signed-in user has a `HOLIDAY` absence on a Thursday in the visible month
- **THEN** that day shows חג and ימי חופשה is unchanged by that day

#### Scenario: Absence form does not offer חג
- **WHEN** the employee opens דיווח העדרות
- **THEN** the type dropdown does not include חג / `HOLIDAY`
