## 1. Env config

- [ ] 1.1 Add `.env.example` with `VITE_API_URL=http://localhost:3000`
- [ ] 1.2 Add `.env` to `.gitignore`
- [ ] 1.3 Add a small `src/services/env.ts` reading `import.meta.env.VITE_API_URL` with a dev fallback

## 2. API client

- [ ] 2.1 Create `src/services/apiClient.ts` — generic `request<T>()` over `fetch`, JSON in/out, throws on non-2xx
- [ ] 2.2 Add TypeScript types for the request options and thrown error shape

## 3. Verify

- [ ] 3.1 `npm run build` passes
- [ ] 3.2 `npm run lint` passes
- [ ] 3.3 `npm test` — add a unit test for the client against a mocked fetch (success + non-2xx throw)
