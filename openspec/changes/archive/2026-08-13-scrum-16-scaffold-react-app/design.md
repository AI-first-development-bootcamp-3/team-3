## Context

First commit into an otherwise-empty repo. No existing frontend code, no conventions to follow yet —
this change sets the ones that follow it.

## Goals / Non-Goals

**Goals:**
- A running dev server and a place for every later frontend subtask to attach to

**Non-Goals:**
- Folder structure beyond Vite's default (SCRUM-15 owns that)
- Any application code, routing, or styling

## Decisions

- **Location: `frontend/` at repo root**, sibling to any future `backend/`. Alternative considered:
  root-level monorepo with workspaces — rejected as premature; nothing yet needs a shared workspace tool.
- **Package manager: npm**, matching what's already installed and used for the OpenSpec CLI itself.
  No reason to introduce pnpm/yarn for a solo-frontend start.
- **Vite's official `react-ts` template** via `npm create vite@latest`, not a hand-rolled config —
  it's the maintained default and every later subtask (ESLint, Vitest, RTL) layers on top of it cleanly.

## Risks / Trade-offs

None material at this scale — a scaffold is cheap to redo if wrong.
