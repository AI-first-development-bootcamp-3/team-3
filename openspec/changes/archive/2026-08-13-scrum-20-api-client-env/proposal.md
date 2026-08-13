## Why

Every feature Story that talks to the backend needs a single place that knows the API base URL and
handles requests consistently, rather than each Story calling `fetch` directly with its own
assumptions.

## What Changes

- Add `VITE_API_URL` env support
- Add a shared API client wrapper (thin fetch wrapper, not a full data-fetching library — that's SCRUM-39)
- Skip the ticket's optional "shared UI primitives" (Button, Input) — SCRUM-36 (UI component library
  decision) is the very next subtask; hand-building primitives now would conflict with whatever gets
  chosen there

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `frontend-data`: adds the API client and env config requirements alongside the shared types added by
  SCRUM-41.

## Impact

New `src/services/apiClient.ts`, `.env.example`. No existing code changes — nothing calls the backend
yet.
