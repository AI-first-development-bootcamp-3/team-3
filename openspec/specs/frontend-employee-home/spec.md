# frontend-employee-home Specification

## Purpose
Defines the authenticated employee hours home screen: Figma chrome, month control, manual-report entry, the daily list and its day-status filter, and honest empty states wherever an API is still missing.
## Requirements
### Requirement: Home shows Figma chrome for authenticated employees

The authenticated `/` route SHALL present a Hebrew RTL home with the title **דיווח שעות**, the abra wordmark, a month control showing the displayed month name, and an orange **דיווח ידני** control. Unauthenticated callers SHALL continue to be sent to login by the existing auth gate.

#### Scenario: Signed-in employee opens hours home

- **WHEN** an authenticated employee opens `/`
- **THEN** they see **דיווח שעות**, the abra wordmark, the current month name, and **דיווח ידני**

#### Scenario: Unauthenticated visitor

- **WHEN** an unauthenticated visitor opens `/`
- **THEN** they are redirected to login and do not see the home shell

### Requirement: Month control is visual only

The home SHALL show previous/next month controls. Changing the month SHALL update the displayed month label and SHALL NOT load reports, KPIs, or any new API. Empty KPI and list states SHALL remain empty. Changing the month SHALL NOT change the date default of the manual entry form (that form SHALL still default to today).

#### Scenario: User taps next month

- **WHEN** the user activates the next-month control
- **THEN** the month label advances one calendar month and the KPI and daily-list empty states are unchanged

#### Scenario: User taps previous month

- **WHEN** the user activates the previous-month control
- **THEN** the month label goes back one calendar month and the KPI and daily-list empty states are unchanged

### Requirement: Manual report opens the existing entry form

Activating **דיווח ידני** SHALL show the existing daily time-report entry form (date, location, times, client/project/task, description, save). Save, validation, and reset behavior SHALL remain as in SCRUM-114. The home chrome (title, month, CTAs) SHALL remain visible.

#### Scenario: User starts a manual report

- **WHEN** the user activates **דיווח ידני**
- **THEN** the daily entry form is visible and can be submitted as today

#### Scenario: User returns to the empty home

- **WHEN** the user dismisses the entry form
- **THEN** the KPI and daily-list empty states are visible again

### Requirement: Clock is not a working timer

The home SHALL show **הפעלת שעון** to match Figma density. It SHALL NOT start a timer, SHALL NOT open a stop modal, and SHALL NOT persist time. It MUST be disabled, MUST be visually dimmed, and MUST carry **בקרוב** as accessible text and tooltip. Figma has no **בקרוב** badge, so the hint SHALL NOT be printed as visible chrome.

#### Scenario: User cannot start the clock

- **WHEN** the home is shown
- **THEN** activating **הפעלת שעון** does not start a timer or create a report

### Requirement: KPI row is an empty state, not fake data

The home SHALL show five labeled summary cards matching the mock: **שעות חודשיות**, **ימי חופשה**, **ימי מחלה**, **דיווחים חסרים**, **פרויקטים מדווחים**, each with its Figma-exported icon. Until the summary API exists, each card SHALL show **אין נתונים עדיין**. The UI MUST NOT display invented figures (for example 142.5, 180, 2 vacation days).

#### Scenario: Home with no summary API

- **WHEN** an employee opens `/` and no dashboard summary has been loaded
- **THEN** all five cards are visible by label and none shows a fabricated numeric summary

### Requirement: Figma preview data is dev-only and opt-in

A development build MAY render the populated Figma frame (KPI figures, day rows, status tags) from local fixtures so the design can be reviewed before the APIs exist. It SHALL require an explicit `?demo=1` opt-in, SHALL be unreachable from a production build, and SHALL NOT be wired to any API or user data.

#### Scenario: Reviewer opens the preview

- **WHEN** a developer opens `/?demo=1` in a dev build
- **THEN** the Figma day rows and status tags are shown from fixtures

#### Scenario: Employee opens the home normally

- **WHEN** an employee opens `/` without the flag, in any build
- **THEN** the empty KPI and daily-list states are shown and no fixture figure appears

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

### Requirement: Empty, not loading-as-success

The shell SHALL NOT present a loading spinner that then reveals fake content. There is no home-summary fetch in this change. A future fetch failure on later tickets MUST NOT be pre-solved here.

#### Scenario: First paint of home

- **WHEN** the authenticated home first renders
- **THEN** empty KPI and list states are shown immediately without a success-looking populated dashboard

