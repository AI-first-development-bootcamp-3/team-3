## ADDED Requirements

### Requirement: Update an absence

The service SHALL let an authenticated caller update one of their own absences by submitting `type`, `startDate`, and optional `endDate` to `PATCH /absences/:id` (when `endDate` is omitted, it SHALL equal `startDate`). The service SHALL recompute `workingDayCount` and SHALL run the existing conflict check excluding the absence's own current dates, so a saved absence never conflicts with itself. An unauthenticated caller SHALL be rejected with `401`. An id that belongs to another user SHALL be rejected with `403`. An unknown or already-cancelled id SHALL be rejected with `404`.

#### Scenario: Owner updates the dates of their absence

- **WHEN** an authenticated user submits `PATCH /absences/:id` for an absence they own with new `startDate`/`endDate`
- **THEN** the service responds `200` with the updated absence, including a `workingDayCount` recomputed for the new range

#### Scenario: Update does not conflict with its own prior dates

- **WHEN** the submitted dates overlap the absence's own current stored dates and nothing else
- **THEN** the service does not report a conflict for those dates

#### Scenario: Update still conflicts with a different absence or reported hours

- **WHEN** the submitted dates overlap another active absence or a reported time entry
- **THEN** the service responds `409` listing those dates and reasons, and does not modify the row

#### Scenario: Unknown type or inverted dates are rejected

- **WHEN** `type` is not one of the four values, or `endDate` is before `startDate`, or a date is not `YYYY-MM-DD`
- **THEN** the service responds `400` and does not modify the row

#### Scenario: Another user's absence cannot be updated

- **WHEN** an authenticated user submits `PATCH /absences/:id` for an absence owned by someone else
- **THEN** the service responds `403` and does not modify the row

#### Scenario: Unknown or cancelled absence returns 404

- **WHEN** the id does not exist, or belongs to an absence that was already cancelled
- **THEN** the service responds `404`

## MODIFIED Requirements

### Requirement: Hebrew absence form in the daily drawer

The home daily drawer SHALL enable **דיווח העדרות** next to **דיווח ידני**. That tab SHALL show a Hebrew RTL form: type (חופשה / מחלה / מילואים / אחר), a single date field shown by default, the working-day count for the current selection, and שמירה. Below the date field, a link ("דיווח על היעדרות ליותר מיום אחד") SHALL reveal an end-date field so the employee can enter a range. Once revealed, the end-date field SHALL remain visible for the rest of that open form session (no control collapses it back). Submitting while the end-date field is hidden SHALL send `endDate` equal to `startDate`.

When the drawer is opened for a specific day that already has a saved absence, the form SHALL open pre-filled with that absence's type, date(s), and attached documents instead of a blank form. If the saved absence's `startDate` and `endDate` differ, the form SHALL open with the end-date field already revealed (multi-day mode), and the "more days" link SHALL NOT be shown. Saving from this pre-filled state SHALL update the existing absence (same id) rather than create a new one. This pre-fill SHALL happen only when the drawer was opened for that specific day (e.g. by clicking that day's own row); the general **דיווח ידני** entry point, which is not scoped to any one day, SHALL always open **דיווח העדרות** blank, even when the date it defaults to already has a saved absence elsewhere.

#### Scenario: Default form shows one day only

- **WHEN** a logged-in user opens **דיווח העדרות** for a day with no saved absence
- **THEN** the form shows type, a single date field, and the "דיווח על היעדרות ליותר מיום אחד" link, with no end-date field visible

#### Scenario: Employee reveals the range and reports vacation spanning a weekend

- **WHEN** the user clicks "דיווח על היעדרות ליותר מיום אחד", chooses חופשה, sets the range Thursday to Sunday, and saves
- **THEN** the client sends `POST /absences` with that `startDate` and `endDate`, and the form shows `2` working days before save

#### Scenario: One-day save omits an end date

- **WHEN** the user picks a type, sets one date without clicking the "more days" link, and saves
- **THEN** the client sends `POST /absences` with `endDate` equal to `startDate`

#### Scenario: The range reveal is one-way for the open form

- **WHEN** the user has clicked "דיווח על היעדרות ליותר מיום אחד" and the end-date field is visible
- **THEN** no control in that open form collapses the end-date field back to one-day mode

#### Scenario: Opening a day with a saved single-day absence pre-fills it

- **WHEN** the user opens **דיווח העדרות** for a day that already has a saved one-day absence
- **THEN** the form shows that absence's type and date already filled in, with no end-date field, and no "more days" link required to see them

#### Scenario: Opening a day with a saved multi-day absence pre-fills the range

- **WHEN** the user opens **דיווח העדרות** for a day inside a saved absence range
- **THEN** the form shows the end-date field already revealed with both saved dates filled in, and the "more days" link is not shown

#### Scenario: Editing a pre-filled absence updates it in place

- **WHEN** the user changes the type or dates of a pre-filled absence and saves
- **THEN** the client sends `PATCH /absences/:id` for that absence's id, not `POST /absences`, and no new absence is created

#### Scenario: The general דיווח ידני entry point never pre-fills, even on a day with a saved absence

- **WHEN** the user opens the drawer via the general **דיווח ידני** button (not a specific day's row) and switches to **דיווח העדרות**, and the date it defaults to already has a saved absence
- **THEN** the form shows blank (no type, no pre-filled date, no attached documents, and the "more days" link visible), and saving sends `POST /absences`, not `PATCH`

#### Scenario: Conflict errors name the dates

- **WHEN** save returns `409` with conflicting dates
- **THEN** the form shows a Hebrew message that includes those dates and does not claim success

#### Scenario: Incomplete type or start date blocks save

- **WHEN** the user submits with no type or no start date
- **THEN** no request is sent and the missing fields are marked
