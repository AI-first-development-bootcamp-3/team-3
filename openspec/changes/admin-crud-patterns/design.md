## Context

See proposal.md - Why. `frontend-forms` (SCRUM-37, archived) already
establishes schema-driven validation via react-hook-form + zod + antd
`Form`/`Controller` — see `CreateUserForm.tsx` as the reference
implementation. `frontend-styling` (SCRUM-36, archived) provides the UI
library (antd) this change builds on rather than introduces.

**Figma reference:** per the epic's UI-fidelity requirement, the table and
form pattern's visual details (spacing, column styling, toggle/confirm
appearance) must match Dan's Figma file. Not yet shared — same open item as
`admin-area-shell/design.md`. Structural/behavioral work in this change
(sorting, toggle wiring, confirm flow) is not blocked on it.

## Goals / Non-Goals

**Goals:**
- One table component and one form-wrapper pattern, reusable across all
  five/six admin entity screens without per-screen reimplementation
- Toggle + confirm as composable additions to the existing form pattern,
  not a parallel form system

**Non-Goals:**
- Building any specific screen — SCRUM-65's own acceptance criteria defer
  "used by at least two admin screens" proof to when those screens
  (SCRUM-67+) actually exist
- Server-side sorting/pagination — client-side sort over an already-fetched
  list is sufficient at this data scale; revisit if a future story needs it

## Decisions

**`AdminEntityTable` is a thin wrapper over antd's `Table`, not a
from-scratch component.** `frontend-styling` already brings in antd; a
generic-typed wrapper (column defs + row data in, sortable/mobile-friendly
table out) avoids reinventing sorting/RTL/responsive behavior antd already
provides.

*Alternative considered:* a fully custom table. Rejected — no requirement
needs behavior antd's `Table` doesn't already support; custom would be more
code for the same result.

**Toggle + confirm ship as props/composition on top of the existing
schema-driven form pattern, not a new form library.** Every admin form still
uses react-hook-form + zod like `CreateUserForm`; `AdminEntityForm` adds a
conventional `isActive` field slot and a confirm-on-deactivate handler
around the existing submit flow, rather than replacing it.

*Alternative considered:* a separate, admin-specific form abstraction
decoupled from `frontend-forms`. Rejected — would fork the validation
pattern SCRUM-37 already established for no benefit.

## Risks / Trade-offs

- [Building a shared pattern before any consumer exists risks guessing wrong
  about what screens actually need] → Mitigated by SCRUM-65's own acceptance
  criteria requiring the pattern proven against two real screens before
  it's considered done; adjust the pattern during SCRUM-67/68 if it doesn't
  fit cleanly.
