## Why

The scaffold from SCRUM-16 is a bare Vite app with no structure and no routing. Every subtask after this
one (styling, auth guards, forms, feature Stories) needs a place to put its code and a route to attach
to. Without an agreed folder layout now, later work will each invent its own convention.

## What Changes

- Establish the frontend folder structure: `components/`, `pages/`, `hooks/`, `services/`, `types/`
- Install and configure React Router
- Add a placeholder layout with nav covering the main routes (admin, tasks, absences, reports)

## Capabilities

### New Capabilities
- `frontend-foundation`: the app's structural conventions — folder layout and routing shell that every
  other frontend capability builds inside of. Requirements: a documented folder layout, a router with a
  base layout, and at least one placeholder route per main app area.

### Modified Capabilities
_None._

## Impact

New directories under `frontend/src/`. Adds `react-router` as a dependency. No existing code changes —
builds directly on the SCRUM-16 scaffold.
