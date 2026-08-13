## 1. Formalize the library

- [ ] 1.1 Add `dayjs` as a direct dependency (currently transitive via Ant Design)
- [ ] 1.2 `src/services/dayjs.ts` — import Hebrew locale, call `dayjs.locale('he')`
- [ ] 1.3 Import it once at app startup (`main.tsx`)

## 2. Sample

- [ ] 2.1 Add a bare `DatePicker` to the existing `/dev/sample-form` page

## 3. Verify

- [ ] 3.1 Verify in-browser: the date picker renders with Hebrew month/day names
- [ ] 3.2 `npm run build` passes
- [ ] 3.3 `npm run lint` passes
