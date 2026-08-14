## 1. Guards

- [x] 1.1 `src/components/RequireAuth.tsx` — redirects to `/login` (preserving `from`) if no session
- [x] 1.2 `src/components/RequireRole.tsx` — renders children only if session user's role matches; otherwise shows "forbidden"

## 2. Login placeholder

- [x] 2.1 `src/pages/Login.tsx` — two buttons calling `sessionStore().setSession()` with mock employee/admin data, then navigates to `from` or `/`

## 3. Wire routes

- [x] 3.1 Wrap Reports and Absences routes in `RequireAuth`
- [x] 3.2 Wrap Admin route in `RequireAuth` + `RequireRole role="admin"`
- [x] 3.3 Add `/login` route

## 4. Verify

- [x] 4.1 In-browser: visiting `/admin` with no session redirects to `/login`
- [x] 4.2 In-browser: signing in as employee then visiting `/admin` shows forbidden, not the admin page
- [x] 4.3 In-browser: signing in as admin then visiting `/admin` renders normally
- [x] 4.4 `npm run build` / `npm run lint` pass
