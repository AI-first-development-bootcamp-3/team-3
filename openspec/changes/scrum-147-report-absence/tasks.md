## 1. Backend create (SCRUM-162)

- [x] 1.1 Zod body: `type` enum, `startDate`, optional `endDate`; default end to start. Done: invalid type / inverted dates → 400 in a schema unit or route test
- [x] 1.2 Service: `checkAbsenceConflicts` then `prisma.absence.create` with `userId` from JWT, `halfDay: false`; `workingDayCount` from `expandWorkingDays`. Done: conflict → no insert
- [x] 1.3 `POST /absences` behind `authenticate` + write rate limit; OpenAPI; mount on `app`. Done: 201 / 401 / 400 / 409 as spec
- [x] 1.4 Route tests: single Sunday 201 count 1; Thu–Sun 201 count 2; Friday-only 400; overlap 409; work-hours 409; no token 401
- [x] 1.5 README Time reports / Absences paragraph for `POST /absences`

## 2. Frontend form (SCRUM-163)

- [x] 2.1 `countWorkingDays` helper + tests (same dates as backend working-day tests)
- [x] 2.2 `createAbsence` in services; types aligned with API (`VACATION` etc.)
- [x] 2.3 Enable **דיווח העדרות** tab; Hebrew fields type / from / to / working-day count / שמירה
- [x] 2.4 Map 409 conflicts to Hebrew copy that lists dates; 400/401/429 banners like hours save

## 3. Tests (SCRUM-164)

- [x] 3.1 Form test: vacation Thu–Sun shows 2 working days and POSTs that body
- [x] 3.2 Form test: missing type does not fetch; 409 body shows dates in the alert

## 4. Cancel from drawer (SCRUM-150 slice)

- [x] 4.1 `DELETE /absences/:id` owner-only, soft-delete; 204 / 401 / 403 / 404
- [x] 4.2 Drawer מחיקת דיווח enabled on absence days; confirm deletes the range and refreshes home
