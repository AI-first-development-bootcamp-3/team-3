## Context

Builds on SCRUM-41's shared types. No auth/session state exists yet (SCRUM-39, SCRUM-40 come later), so
this client can't attach auth tokens yet — that's added when session state exists, not invented here.

## Goals / Non-Goals

**Goals:**
- `VITE_API_URL` read from env, with a build-time fallback for local dev
- One shared function every feature Story's `services/` code calls through

**Non-Goals:**
- Auth token attachment — no session state exists yet (SCRUM-39/40)
- Rich error handling (401 redirect, error toasts) — that's SCRUM-42's explicit scope, kept separate
- The ticket's optional shared UI primitives — deferred to after SCRUM-36 picks a UI library

## Decisions

- **Native `fetch`, not axios.** The ticket allows either; fetch is built into every target browser,
  needs no dependency, and a thin wrapper is all this subtask asks for. Axios only pays for itself once
  interceptors/retries are needed — that's SCRUM-42's problem, revisit there if fetch turns out
  insufficient.
- **One generic `request<T>()` function**, not per-verb helper functions — feature code passes method
  and path; keeps the wrapper's surface area minimal until real usage patterns emerge from actual
  Stories.
- **Throws on non-2xx**, with the parsed JSON error body attached if present — callers decide how to
  handle it; this wrapper doesn't swallow or redirect on any status code (that's SCRUM-42).
- **`.env` added to `.gitignore`** (missing from the Vite scaffold's default) — `.env.example` is
  committed as the template, real `.env` never is.

## Risks / Trade-offs

- No auth header support yet means this client can't hit protected endpoints until SCRUM-40 exists to
  supply a token — acceptable, nothing calls the backend yet either.
