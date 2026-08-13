## Why

SCRUM-10 (Frontend) has 13 dependent subtasks and nothing exists in the repo yet. Every other frontend
subtask — routing, styling, forms, auth — needs a running app to build on top of. This is the first
brick.

## What Changes

- Scaffold a new frontend app with Vite + React + TypeScript
- Confirm `npm run dev` starts the app and a placeholder page renders
- No application behavior exists yet — this is pure tooling setup

## Capabilities

### New Capabilities
_None — this change creates no user-facing behavior to specify._

### Modified Capabilities
_None._

## Impact

New `frontend/` (or equivalent) directory and its `package.json`, `vite.config.ts`, `tsconfig.json`.
No existing code affected — this is the first commit into the frontend surface.
