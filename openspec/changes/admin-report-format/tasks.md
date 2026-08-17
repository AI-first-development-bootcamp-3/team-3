## 1. Schema

- [ ] 1.1 Add `ReportFormat` enum (`SUM_HOURS`, `CLOCK_IN_OUT`) to
      `schema.prisma`
- [ ] 1.2 Add `reportFormat ReportFormat @default(CLOCK_IN_OUT)` to
      `Project` — confirm default with Dan before running the migration
      (see design.md)
- [ ] 1.3 Generate and run the migration

## 2. Backend

- [ ] 2.1 Extend `adminProject.schema.ts` edit body with `reportFormat`
- [ ] 2.2 Extend `adminProject.service.ts` update + list to include it

## 3. Frontend

- [ ] 3.1 Extend `AdminProjects.tsx` list column and edit form with report
      format (total hours / clock-in-out)
- [ ] 3.2 Apply Figma-matched styling matching the "הגדרת דיווחי שעות" mock
      (blocked until file is shared)

## 4. Verification

- [ ] 4.1 Backend tests: setting report format on create/edit, default
      applied when omitted
- [ ] 4.2 Frontend tests: report format field renders and updates
- [ ] 4.3 Manual: set a project to total-hours, confirm it persists after
      reload
- [ ] 4.4 File a follow-up (or note in SCRUM-114/115) that the employee
      report form still needs to branch on this setting
