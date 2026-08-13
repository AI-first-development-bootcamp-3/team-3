## Context

Two distinct usage profiles exist per the PRD: employees reporting hours/absences (mobile-first, simple
forms) and admins managing 5 CRUD entities (tables, filters, more likely used on desktop). No component
library exists yet; SCRUM-37 (forms) is next and needs one to build on.

## Goals / Non-Goals

**Goals:**
- Pick one library, install it, enable RTL globally
- Prove RTL actually works with a real rendered component, not just config

**Non-Goals:**
- Building out real forms/tables — SCRUM-37 and the actual feature Stories do that
- A custom design system — using the library's defaults/theme, not restyling it

## Decisions

**Evaluated: MUI, Chakra UI, Ant Design.**

| | RTL setup | Table/Form fit for Admin CRUD | Mobile fit for employee screens |
|---|---|---|---|
| MUI | `stylis-plugin-rtl` + emotion cache + theme `direction` — most wiring of the three | Free `DataGrid` is basic; full-featured one is paid | Good, mobile-first is a core MUI use case |
| Chakra UI | `direction="rtl"` on the provider — simplest setup | No built-in table component; forms are fine but unopinionated | Good, simple responsive primitives |
| Ant Design | `ConfigProvider direction="rtl"` — simple setup, widely used for exactly this (Arabic/Hebrew business apps) | `Table`, `Form`, `DatePicker` are rich and built for dense CRUD out of the box | Usable, but the components default to a denser, desktop-oriented feel — not touch-first by default |

**Chosen: Ant Design.** The deciding factor is the Admin epic — 5 CRUD screens each needing sortable
tables, filtered selects and forms with validation. Ant Design's `Table`/`Form`/`DatePicker` cover that
directly; MUI's equivalent free tooling is thinner, and Chakra has no table primitive at all. RTL setup
is also the simplest of the three (`ConfigProvider`), and it's a proven choice for Hebrew/Arabic
line-of-business apps specifically — not just theoretically RTL-capable.

**Mobile trade-off, accepted explicitly:** Ant Design's default density leans desktop. Mitigation:
employee-facing components (reporting, absences — the mobile-first surfaces) use `size="large"` for
adequate touch targets, verified per Story as it's built, not solved globally here. Admin screens, used
more on desktop in practice, keep the library's default density.

**RTL wiring:** wrap the app in `<ConfigProvider direction="rtl" locale={heIL}>` in `main.tsx`, using
Ant Design's built-in `he_IL` locale for date/number formatting to match.

## Risks / Trade-offs

- Ant Design's visual style is more "admin dashboard" than "consumer app" — acceptable, this is an
  internal business tool, not a public-facing product.
- Bundle size is larger than Chakra's — confirmed at implementation time: the production bundle crossed
  Vite's 500kB chunk-size warning threshold after adding antd with only two components in use. Accepted
  for now; revisit with route-based code-splitting if it becomes a real load-time problem once more
  Stories are built.
