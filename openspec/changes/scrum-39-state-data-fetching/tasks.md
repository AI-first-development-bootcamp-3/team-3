## 1. Install

- [x] 1.1 Install `@tanstack/react-query`, `zustand`

## 2. Session store

- [x] 2.1 `src/services/sessionStore.ts` — Zustand store: `user`, `token`, `setSession`, `clearSession`
- [x] 2.2 Wire `apiClient.ts` to attach `Authorization: Bearer <token>` from `sessionStore.getState()` when a token is present

## 3. Query client

- [x] 3.1 `src/services/queryClient.ts` — `QueryClient` instance
- [x] 3.2 Wrap the app in `QueryClientProvider` in `main.tsx`

## 4. Sample query

- [x] 4.1 A query function wrapping `apiClient.request('/health')` that increments a module-level fetch counter
- [x] 4.2 Mount two instances of the same query (same query key) on `/dev/sample-form`, displaying the counter

## 5. Verify

- [x] 5.1 Verify in-browser: the fetch counter reads 1 after both instances mount, not 2
- [x] 5.2 `npm run build` passes
- [x] 5.3 `npm run lint` passes
