## Context

Builds on SCRUM-15's layout/nav/routes. No UI component library exists yet (SCRUM-36 comes after this
change) — this is plain CSS only. The scaffold's existing `index.css` uses a `max-width` media query
(shrink font on small screens from a large default) — the opposite of mobile-first.

## Goals / Non-Goals

**Goals:**
- RTL and Hebrew set at the document root, no per-page opt-in
- Base styles authored mobile-first (`min-width` queries scaling up), not desktop-first scaled down
- Existing placeholder pages/nav confirmed usable at both mobile and desktop widths

**Non-Goals:**
- A UI component library — SCRUM-36, separate
- i18n / language switching — the PRD is Hebrew-only, no toggle needed
- Real page content or design polish — still placeholders

## Decisions

- **`dir="rtl"` and `lang="he"` set directly on `<html>` in `index.html`**, not via JS/React — it's a
  static, permanent property of the whole app, not conditional state.
- **Replace the scaffold's max-width breakpoint with min-width breakpoints** (640px / 1024px), so base
  styles target mobile by default and larger screens are the override, matching the PRD's mobile-first
  requirement literally rather than just visually happening to work on phones.
- **Nav becomes a horizontal flex row with wrapping and larger touch targets** on mobile, no changes
  needed for RTL specifically — `dir="rtl"` on the document handles mirroring of block/inline flow
  automatically; explicit `flex-direction` isn't set, so it doesn't need manual reversal.

## Risks / Trade-offs

None material — this is base CSS with no new dependency and nothing else in the codebase depends on the
old max-width breakpoint's exact values.
