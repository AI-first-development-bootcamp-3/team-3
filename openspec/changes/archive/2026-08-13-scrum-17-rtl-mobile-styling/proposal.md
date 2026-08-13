## Why

The app is Hebrew-only and mobile-first per the PRD, but nothing in the codebase enforces either yet.
Every page and component built from here on needs RTL and mobile-first to be the default, not an
afterthought retrofitted per-component later.

## What Changes

- Set the document direction to RTL and language to Hebrew at the root
- Establish mobile-first base styles (viewport, base font scaling, breakpoint convention)
- Confirm the existing placeholder pages (Reports, Absences, Admin, nav) render correctly in RTL on both
  mobile and desktop widths

## Capabilities

### New Capabilities
- `frontend-styling`: the app's RTL and mobile-first foundation — every later page and component
  inherits these defaults rather than each setting direction/breakpoints independently.

### Modified Capabilities
_None._

## Impact

`index.html` (`dir`, `lang` attributes), `src/index.css` (base mobile-first rules). No new dependencies —
this is plain CSS, not a UI component library (that's SCRUM-36, separate).
