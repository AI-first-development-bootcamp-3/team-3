## ADDED Requirements

### Requirement: Daily list can be filtered by day status

The **פירוט יומי** section SHALL offer a single-select filter control, labelled
**כל הדיווחים** when no filter is applied, over the day rows of the visible
month.

Every choice SHALL be a status label the product already shows for that kind of
day; the control SHALL NOT introduce new status wording. It SHALL offer exactly:
**כל הדיווחים** (the default), **חסר**, **מלא**, **חלקי**, **סופ״ש**, and one
choice per absence type — **חופשה 🏖️**, **מחלה 😷**, **מילואים 🚨**, **אחר**.
Each choice SHALL carry the same label as the status it filters — the day pills
for **חסר** and **סופ״ש**, the day panel header for **מלא** and **חלקי**, and the
absence pills for the four types — so the two cannot drift apart.

A row whose pill shows a computed hours label (for example **9 שעות**) is filtered
by **מלא** or **חלקי**, which is how that day's status reads in the day panel.
Selecting either SHALL NOT change what the surviving row's pill displays.

Selecting a choice other than **כל הדיווחים** SHALL hide every day row whose
status is not the selected one. The control's own label SHALL show the active
choice so the filter is visible without opening it.

Filtering SHALL be applied to data already loaded for the visible month. It
SHALL NOT issue a request, and SHALL NOT change which month is loaded.

A day row that survives the filter SHALL render exactly as it does unfiltered —
same status pill, same hours, same location and project-count tags. The filter
SHALL NOT recompute any row from a subset of that day's reports.

#### Scenario: Employee narrows the list to missing days

- **WHEN** an employee viewing a month that holds reported days, missing days, and weekends selects **חסר**
- **THEN** only the days whose status is **חסר** remain listed, the control reads **חסר**, and no request is sent

#### Scenario: Default shows everything

- **WHEN** the home first renders, or the employee re-selects **כל הדיווחים**
- **THEN** every day row of the visible month is listed, in the same order as before

#### Scenario: Only labels the product already shows are offered

- **WHEN** the employee opens the control
- **THEN** the choices are exactly **כל הדיווחים**, **חסר**, **מלא**, **חלקי**, **סופ״ש**, **חופשה 🏖️**, **מחלה 😷**, **מילואים 🚨**, **אחר**, and none of them is a computed hours label

#### Scenario: Reported days split by completeness

- **WHEN** the employee selects **מלא** in a month holding both a full day and a partly reported day
- **THEN** only the full day is listed, and its pill still shows its hours label rather than **מלא**

#### Scenario: Every choice selects a distinct set of days

- **WHEN** each choice other than **כל הדיווחים** is applied in turn to one month
- **THEN** no day is listed by two different choices, and between them they account for every day **כל הדיווחים** shows

#### Scenario: A surviving row is unchanged

- **WHEN** a day holding several projects survives the active filter
- **THEN** its status pill, hours, work-location tags, and project-count tag are identical to how that row renders with no filter applied

#### Scenario: Opening a day still works while filtered

- **WHEN** the employee activates a day row while a filter is active
- **THEN** the manual-report panel opens for that date with that day's full set of reports, not a filtered subset

### Requirement: Status filter governs absence and weekend rows

Absence and **סופ״ש** rows SHALL be reachable only through the status filter
itself. Selecting **סופ״ש** SHALL list weekend days and nothing else. Selecting
an absence type SHALL list only the days carrying **that** type: absence days
SHALL be matched by their type, not lumped together, so a **מחלה 😷** day SHALL
NOT answer to **חופשה 🏖️**. No other choice SHALL list an absence or weekend row.

#### Scenario: Absence days are separated by type

- **WHEN** the employee selects **מחלה 😷** in a month holding both sick days and vacation days
- **THEN** only the sick days are listed, and the vacation days are not

#### Scenario: Weekends are excluded from the other choices

- **WHEN** the employee selects **חסר**, **מלא**, **חלקי**, or any absence type
- **THEN** no **סופ״ש** row appears in the list

### Requirement: Filter survives month navigation and resets on reload

An active filter SHALL remain applied when the employee moves to the previous or
next month, and SHALL apply to the newly loaded month. The filter SHALL NOT be
persisted across a page reload: a freshly loaded home SHALL start at
**כל הדיווחים**.

#### Scenario: Filter carries across a month change

- **WHEN** the employee selects **חסר** and then moves to the previous month
- **THEN** the previous month loads and lists only its **חסר** days, and the control still reads **חסר**

#### Scenario: Reload starts unfiltered

- **WHEN** the employee reloads the page with a filter active
- **THEN** the home renders with **כל הדיווחים** selected and every day row listed

### Requirement: A filter matching nothing says so

When an active filter leaves no day row in the visible month, the list SHALL
show an empty state that distinguishes "nothing matches this filter" from the
existing **אין דיווחים להצגה** shown when the month itself holds no days. The
filter control SHALL remain usable so the employee can clear or change it.

#### Scenario: No day matches the chosen status

- **WHEN** the employee selects **מחלה 😷** in a month holding no sick days
- **THEN** the list shows a filter-specific empty state, not **אין דיווחים להצגה**, and the control can still be changed back

#### Scenario: Empty month is unchanged

- **WHEN** the visible month holds no day rows at all and no filter is applied
- **THEN** **אין דיווחים להצגה** is shown, exactly as before this change

### Requirement: Daily list shows the visible month's days

The home SHALL include a **פירוט יומי** section listing one row per calendar day
of the visible month, built from the reports and absences loaded for that month.
Each row SHALL carry a status derived from that day's own data — **חסר**, an
hours label, **סופ״ש**, or the absence type — and SHALL NOT display invented
figures. When the visible month yields no day rows, the section SHALL show
**אין דיווחים להצגה**.

#### Scenario: Month with saved reports

- **WHEN** an employee opens `/` for a month holding saved reports
- **THEN** **פירוט יומי** lists those days with statuses derived from the loaded data

#### Scenario: Month with nothing to show

- **WHEN** an employee opens `/` for a month yielding no day rows
- **THEN** **פירוט יומי** is visible and shows **אין דיווחים להצגה**

## REMOVED Requirements

### Requirement: Daily list is an empty state, not fake days

**Reason**: Describes a state the product left behind. The requirement held the
list to **אין דיווחים להצגה** "until the monthly list API exists" — that API
(`GET /reports?month&year`) shipped and the list has been populated since, so the
requirement has been contradicted by shipped behavior rather than by this change.
Left standing it would also contradict the filter requirements above.

**Migration**: None — no consumer behavior changes. The requirement is replaced
by **Daily list shows the visible month's days** above, which keeps the same
**אין דיווחים להצגה** empty state for a month that yields no rows and keeps the
same prohibition on invented figures.
