## 1. Filter model

- [x] 1.0 Extract the fixed day-status labels to a shared `frontend/src/lib/dayStatusLabels.ts` and point `deriveHeader()` and `buildHomeDays()` at it. Done: `חסר`/`מלא`/`חלקי`/`סופ״ש` now have one source instead of inline literals in two files; pure substitution, `ManualReport`'s own suite unchanged and still passing
- [x] 1.1 Define the filter value type as `'all' | 'missing' | 'full' | 'partial' | 'weekend' | AbsenceType`, plus the ordered label map, **reusing `DAY_STATUS_LABELS` and `ABSENCE_TYPE_LABELS`** rather than restating either. Every choice must be a label the product already shows. Done: `frontend/src/pages/reportStatusFilter.ts`, sibling to `monthlyReportDays.ts`
- [x] 1.2 Add a pure helper that takes `DemoDay[]` and a filter value and returns the rows to show, returning the input unchanged for `'all'`. Keep it out of `buildHomeDays()` per design.md. Done: `filterDaysByStatus()`; `buildHomeDays()` logic untouched apart from stamping `absenceType` on absence rows
- [x] 1.3 Unit-test the helper: `'all'` passes everything through in order; each status returns only its own rows; absence types are matched individually; a value matching nothing returns an empty array. Done: `reportStatusFilter.test.ts`, 9 tests, including one asserting kept rows are the same object references, one asserting neither label set is restated, and one asserting the choices partition the month — no day listed twice, none unreachable

## 2. The control

- [x] 2.1 Add filter state to `Reports.tsx` as `useState`, defaulting to `'all'`. Do not reset it in the month effect — it must survive month navigation. Done: `statusFilter` state, absent from the month effect's deps and body
- [x] 2.2 Enable the pill at [Reports.tsx:330-335](../../../frontend/src/pages/Reports.tsx#L330-L335): drop `disabled`/`aria-disabled`, render the active choice's label instead of the hardcoded `כל הדיווחים`, and keep the existing chevron and pill classes. Done: same `home-shell__filter` classes and chevron asset
- [x] 2.3 Build the dropdown as `button[aria-haspopup="listbox"][aria-expanded]` opening a `role="listbox"` with a `role="option"` per choice and `aria-selected` on the active one. Done: `frontend/src/pages/ReportStatusFilterMenu.tsx`
- [x] 2.4 Wire dismissal and keyboard: selection closes and returns focus to the pill; `Escape` closes without changing the value; outside click closes; arrow keys move between options and `Enter` selects. Done: mirrors `UserMenu`'s pointerdown/Escape pattern; options are real buttons so `Enter`/`Space` select natively; `Home`/`End` also supported
- [x] 2.5 Style the panel in `Reports.css` — RTL alignment under the pill, matching the existing home-shell token set. The pill itself needs no new styling. Done: `inset-inline-start` for RTL, existing `--home-*` tokens, `cursor` corrected from `not-allowed` to `pointer`

## 3. Applying the filter

- [x] 3.1 Apply the helper where `savedDays` is rendered, leaving `savedDays`, `monthReports`, `monthAbsences`, and `monthKpis` unfiltered. Done: `visibleDays` computed at render; all four state values stay whole-month
- [x] 3.2 Verify the KPI cards still read `monthKpis` and are unaffected by the active filter. Done: KPI block untouched; covered by "keeps the KPI cards on the whole month while filtered"
- [x] 3.3 Verify `openManualReport()` still slices the unfiltered `monthReports`, so opening a day while filtered shows that day's full set of reports. Done: function untouched; covered by "opens a filtered day with that day's full set of reports"
- [x] 3.4 Add the filter-specific empty state, shown when a non-`'all'` filter yields no rows, distinct from `אין דיווחים להצגה`. Keep `אין דיווחים להצגה` for an empty month under `'all'`. Done: `לא נמצאו ימים התואמים לסינון`
- [x] 3.5 Confirm the demo path (`?demo=1`, `DEMO_DAYS`) still renders — decide and implement whether the filter applies to it or the pill is inert in demo mode. Done: **decided the filter applies in demo mode too** rather than special-casing it; the demo rows share the render path, and both existing demo tests still pass

## 4. Tests

- [x] 4.1 Replace the disabled-pill assertion at [Reports.test.tsx:116](../../../frontend/src/pages/Reports.test.tsx#L116) with one asserting the pill is enabled and reads `כל הדיווחים`. Change only that assertion. Done: `toBeDisabled()` → `toBeEnabled()`, one line, nothing else in that test touched
- [x] 4.2 Test selecting `חסר` in a month holding mixed statuses leaves only `חסר` rows and updates the pill label. Done: "narrows the list to one status and names it on the pill"
- [x] 4.3 Test that a surviving row's status pill, hours, and tags are identical filtered and unfiltered. Done: compares the row's full `textContent` across the two states
- [x] 4.4 Test that selecting `חסר` lists no weekend and no absence row, that `סופ״ש` lists only weekends, and that absence types do not answer for each other. Done: "keeps weekends and absences out of חסר", "separates absence days by type", "separates reported days by how complete they are" (and that a surviving row still shows its hours label, not `מלא`), plus "offers only statuses the day rows already render" asserting the exact 9-item menu
- [x] 4.5 Test that the filter persists across a month change and applies to the newly loaded month. Done: "carries the filter across a month change"
- [x] 4.6 Test the filter-specific empty state, and that the control can still be changed back from it. Done: filters to `מחלה 😷` in a month with no sick days, then back to `כל הדיווחים`
- [x] 4.7 Test that opening a day row while filtered seeds the panel with that day's full report set. Done: opens the surviving day and asserts project, hours, and description
- [x] 4.8 Assert no request fires on filter change (the fetch mock is called only for the month load). Done: compares `fetch.mock.calls.length` across two filter changes

## 5. Close out

- [x] 5.1 Run the frontend test suite, lint, and type-check — CI type-checks both apps and enforces React Compiler lint. Done: 186 tests across 30 files pass; `tsc --noEmit` clean; `eslint src` reports 0 errors (1 pre-existing warning in the untouched `SessionGuard.tsx`). Also mutation-checked the new tests: neutering `filterDaysByStatus` fails 7 of them
- [x] 5.2 Resolve the open item on the `מלא` / `חלקי` labels. Done: **no sign-off needed — they were already shipped copy.** `deriveHeader()` in `ManualReport.tsx` has labelled the `full` and `partial` tones `מלא` and `חלקי` in the day panel header all along; the filter adopts them verbatim. My earlier claim that no fixed label existed came from grepping only the row builder. Remaining risks — the window-vs-hours quirk, and the row saying `9 שעות` while the filter says `מלא` — are recorded in design.md
- [x] 5.3 Re-check that no other in-flight change is rewriting `frontend-employee-home`'s daily-list requirement before archiving. Done: this change is the only one with a `frontend-employee-home` delta; `scrum-147-report-absence` only mentions refreshing פירוט יומי from `absences-reporting`, no collision
