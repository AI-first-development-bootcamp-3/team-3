## Context

SampleForm (SCRUM-37) already imports `dayjs` directly for `TimePicker` value conversion, and Ant
Design's `DatePicker`/`TimePicker` are built on `dayjs` internally — it's already in the dependency tree,
just transitively. This change formalizes that as the app's actual date library rather than adding
`date-fns` alongside it.

## Goals / Non-Goals

**Goals:**
- `dayjs` as a direct dependency with Hebrew locale configured globally
- One rendered date picker proving Hebrew formatting works

**Non-Goals:**
- The Friday/Saturday working-day exclusion utility — that's SCRUM-144's dedicated scope under the
  Absences epic, not duplicated here (see proposal.md's scope note)
- Retrofitting SampleForm's existing `dayjs` import to anything different — it already does the right
  thing, this change just makes the choice official and adds the locale

## Decisions

- **`dayjs`, not `date-fns`.** The ticket allows either; `dayjs` is already required transitively by Ant
  Design and already used in SampleForm. Adding `date-fns` on top would mean two date libraries doing
  overlapping work for no benefit.
- **Locale set globally via `dayjs.locale('he')`** in a small `src/services/dayjs.ts`, imported once at
  app startup (`main.tsx`) — not per-component. Ant Design's own `he_IL` locale (already wired in
  SCRUM-36's `ConfigProvider`) handles its components' internal formatting; this covers any direct
  `dayjs` usage outside Ant Design components.
- **Sample: a bare `DatePicker` added to the existing `/dev/sample-form` route** (SCRUM-37's pattern
  reference page), not a new route — avoids proliferating dev-only routes for what's a small addition.

## Risks / Trade-offs

None material — `dayjs` was already an implicit dependency; this just makes it explicit and configures
locale.
