## 1. Install

- [x] 1.1 Install `react-hook-form`, `zod`, `@hookform/resolvers`

## 2. Sample form

- [x] 2.1 `src/components/SampleForm.schema.ts` — Zod schema: required `name`, `startTime`/`endTime` with a `.refine()` cross-field rule
- [x] 2.2 `src/components/SampleForm.tsx` — React Hook Form + `zodResolver`, Ant Design `Form.Item`/`Input`/`TimePicker` via `Controller`
- [x] 2.3 Add a `/dev/sample-form` route (outside the main nav) rendering it

## 3. Verify

- [x] 3.1 Unit test the schema directly: required field missing, end-before-start rejected, valid input accepted
- [x] 3.2 Verify in-browser: submitting empty shows the required error; submitting end-before-start shows the cross-field error; valid input submits cleanly
- [x] 3.3 `npm run build` passes
- [x] 3.4 `npm run lint` passes
