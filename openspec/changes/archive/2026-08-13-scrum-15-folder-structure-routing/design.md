## Context

Builds directly on SCRUM-16's bare scaffold. No routing, no folder convention exists yet. See
proposal.md for why this needs to land before anything else.

## Goals / Non-Goals

**Goals:**
- A folder layout every later subtask can place code into without inventing its own structure
- A router with a shared layout and one placeholder route per main app area

**Non-Goals:**
- Auth guards / protected routes — that's SCRUM-40, built on top of this
- Real page content — placeholders only
- Global state or data fetching — SCRUM-39

## Decisions

- **React Router v7** (current major, data-router API) over v6 — v7 is what `react-router-dom` now
  ships as by default; no reason to pin to an older API on a fresh project.
- **Route tree defined in `src/routes.tsx`**, composed via `createBrowserRouter`, not scattered
  `<Route>` JSX in `App.tsx`. Keeps the route list in one place as it grows across later Stories.
- **Base layout as a `pages/Layout.tsx` rendering an `<Outlet />`** with the nav, rather than repeating
  nav markup per page.
- **Three placeholder areas + not-found**: `/` (hours reporting home), `/absences`, `/admin`, plus a
  catch-all. These map directly to the three product epics (SCRUM-6, SCRUM-7, SCRUM-5) — later Stories
  fill these in, they don't add new top-level routes.
- **Folders**: `components/` (reusable UI), `pages/` (route-level components), `hooks/`, `services/`
  (API calls — populated in SCRUM-20), `types/` (populated in SCRUM-41). Empty folders get a `.gitkeep`
  where nothing exists yet.

## Risks / Trade-offs

- Picking 3 fixed placeholder routes now is a light commitment to the nav shape. If it's wrong, it's a
  cheap rename later — no behavior depends on the exact paths yet.
