## 1. Routing

- [x] 1.1 Add nested `/admin` routes in `routes.tsx`: index (overview),
      `users`, `clients`, `projects`, `tasks`, `assignments`
- [x] 1.2 Move the `RequireAuth` + `RequireRole` wrapping to the parent
      `/admin` route so nested children inherit it via `<Outlet />`

## 2. Shell component

- [x] 2.1 Create `AdminShell` component: renders admin sub-navigation +
      `<Outlet />`
- [x] 2.2 Add navigation links for the five management areas plus the
      inert month-closing slot
- [x] 2.3 Replace `Admin.tsx`'s current inline `CreateUserForm` usage —
      `AdminShell` becomes the `/admin` element; move `CreateUserForm`
      under the new `/admin/users` route as a placeholder screen

## 3. Guard behavior

- [x] 3.1 Change `RequireRole` to redirect to `/` on role mismatch instead
      of rendering an inline "Forbidden" message
- [x] 3.2 Update `RequireRole.test.tsx` for the new redirect behavior

## 4. Styling

- [x] 4.1 RTL layout, mobile-usable navigation (placeholder styling —
      pixel-matching to Figma blocked on the file being shared, see design.md)

## 5. Verification

- [x] 5.1 Manually confirm a non-admin session visiting `/admin/*` is
      redirected, not shown any admin content
- [x] 5.2 Manually confirm navigating between the five/six admin nav items
      keeps the shell mounted and only swaps the outlet content
