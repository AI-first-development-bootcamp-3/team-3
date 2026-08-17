## Purpose

Defines the authenticated employee hours home screen: Figma chrome, month control, manual-report entry, and honest empty KPI/list states until later APIs exist.

## ADDED Requirements

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

The home SHALL show **הפעלת שעון** to match Figma density. It SHALL NOT start a timer, SHALL NOT open a stop modal, and SHALL NOT persist time. It MUST be disabled and indicate it is not available yet (**בקרוב**).

#### Scenario: User cannot start the clock

- **WHEN** the home is shown
- **THEN** activating **הפעלת שעון** does not start a timer or create a report

### Requirement: KPI row is an empty state, not fake data

The home SHALL show five labeled summary cards matching the mock: **שעות חודשיות**, **ימי חופשה**, **ימי מחלה**, **דיווחים חסרים**, **פרויקטים מדווחים**. Until the summary API exists, each card SHALL show **אין נתונים עדיין**. The UI MUST NOT display invented figures (for example 142.5, 180, 2 vacation days).

#### Scenario: Home with no summary API

- **WHEN** an employee opens `/` and no dashboard summary has been loaded
- **THEN** all five cards are visible by label and none shows a fabricated numeric summary

### Requirement: Daily list is an empty state, not fake days

The home SHALL include a **פירוט יומי** section. Until the monthly list API exists, it SHALL show **אין דיווחים להצגה** (no day rows, no status pills such as חסר / 9 שעות / סופ״ש with invented data).

#### Scenario: Home with no monthly list API

- **WHEN** an employee opens `/` and no monthly day list has been loaded
- **THEN** **פירוט יומי** is visible and no fabricated day rows are shown

### Requirement: Empty, not loading-as-success

The shell SHALL NOT present a loading spinner that then reveals fake content. There is no home-summary fetch in this change. A future fetch failure on later tickets MUST NOT be pre-solved here.

#### Scenario: First paint of home

- **WHEN** the authenticated home first renders
- **THEN** empty KPI and list states are shown immediately without a success-looking populated dashboard
