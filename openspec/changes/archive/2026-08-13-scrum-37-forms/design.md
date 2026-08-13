## Context

SCRUM-36 picked Ant Design, which ships its own form system (`Form` + `Form.Item` rules). This subtask's
ticket explicitly asks for React Hook Form + a validation schema library, which is a different, more
testable approach. The two need to be reconciled, not just installed side by side.

## Goals / Non-Goals

**Goals:**
- Validation logic defined as data (a schema), not scattered per-field JSX rules
- Schemas independently unit-testable without rendering a form
- Ant Design's inputs still used for actual rendering — not replaced

**Non-Goals:**
- Building real feature forms — that's each Story's own work, this just establishes the pattern
- Component/DOM testing of the sample form — React Testing Library isn't installed yet (SCRUM-43); the
  schema itself is tested directly instead, which needs no DOM

## Decisions

- **React Hook Form + Zod, Ant Design for rendering only.** Ant Design's native `Form.Item` `rules` are
  per-field, JSX-embedded and hard to unit test or reuse outside the component. Zod schemas are plain
  data: testable in isolation, and the same schema shape could later validate the same data server-side
  if the backend ever adopts Zod too. Ant Design's `Input`/`Select`/`DatePicker` are still used for
  rendering, wired to React Hook Form via `Controller` — the two are complementary, not competing.
- **`@hookform/resolvers/zod`** bridges a Zod schema into React Hook Form's `resolver`, rather than
  hand-writing a validate function.
- **Cross-field rule via Zod's `.refine()`** at the schema level (not a field-level rule), since
  cross-field checks by definition need more than one field's value at once.
- **Sample form kept as a permanent pattern reference**, not deleted after verification — forms recur
  constantly in this app, so a working example of "how we build a form here" earns its keep. Mounted at
  a `/dev/sample-form` route, deliberately outside the main nav `Menu` so it doesn't read as a real
  product screen.
- **Sample form scope**: a required text field (name) plus a start-time/end-time pair with the
  cross-field rule "end after start" — the same shape the daily hours report (SCRUM-6, not yet built)
  will need, so the pattern is proven against a realistic case, not a toy one.

## Risks / Trade-offs

- Two form-related libraries in the dependency tree (React Hook Form + Ant Design's own Form machinery,
  partially unused) — acceptable; Ant Design's Form.Item is still used as a layout/label wrapper even
  though its own validation rules aren't, so nothing is fully redundant.
