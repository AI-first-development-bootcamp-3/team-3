## Why

Every remaining Story is form- and table-heavy (Admin's 5 CRUD screens, absence reporting, hours
reporting) in a Hebrew-only, RTL, mobile-first app. Building each screen's inputs, tables and date
pickers from scratch is the wrong place to spend solo-dev time — a library needs picking now, before
SCRUM-37 (forms) and any real Story starts consuming it.

## What Changes

- Evaluate MUI, Chakra UI and Ant Design for RTL quality and fit against this app's actual shape
- Install and configure the chosen library with RTL enabled globally
- Render one placeholder component to confirm RTL actually works, not just that the library is installed

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `frontend-styling`: adds the UI component library as part of the app's styling foundation, alongside
  SCRUM-17's RTL/mobile-first base.

## Impact

New dependency (the chosen library + its RTL plugin/config). Existing `Layout.tsx` and placeholder pages
get one component swapped in to prove RTL, not a full redesign.
