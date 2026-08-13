## Context

`apiClient.ts` (SCRUM-20) explicitly deferred auth headers, noting no session state existed yet. This
change creates that state — the API client's token attachment is a small, natural addition here, not
deferred further to SCRUM-40, since SCRUM-40's actual scope is route guards, not session storage.

## Goals / Non-Goals

**Goals:**
- Server-state caching via TanStack Query, built on the existing `apiClient.request()`
- A session store readable from both React and plain modules
- Proof that caching actually dedupes, not just that the library is installed

**Non-Goals:**
- The login flow itself (no UI, no backend auth endpoint exists yet) — this only creates the state
  container and wires it into the API client
- Route guards — that's SCRUM-40, consuming this same store, not duplicating it

## Decisions

- **Zustand over React Context for session state.** The API client (`apiClient.ts`) is a plain module,
  not a component — it can't call `useContext`. Zustand's store can be read via `getState()` from
  anywhere, including outside React, which Context fundamentally cannot do without prop-drilling the
  value into non-component code. This is the deciding factor, not general preference.
- **`apiClient.ts` reads the token via `sessionStore.getState().token`** at request time and attaches
  `Authorization: Bearer <token>` when present — not via a parameter every caller has to pass.
- **TanStack Query's `QueryClient`** wraps the app once in `main.tsx`, alongside the existing
  `ConfigProvider`.
- **Sample query proves dedup concretely**, not just "the library is installed": the query function
  increments a module-level counter before calling `apiClient.request('/health')`, and the sample page
  mounts the same query twice via two component instances. If TanStack Query is working, the counter
  reads 1, not 2, after both mount. `/health` is a placeholder endpoint — no backend is running during
  frontend dev/verification, so the request itself is expected to error; the *dedup count* is what's
  being proven, not a successful response.

## Risks / Trade-offs

- The sample query's network call will fail in isolation (no backend running) — accepted, TanStack Query
  caches error states too, so the dedup proof still holds regardless of response success.
