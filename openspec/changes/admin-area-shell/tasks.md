## 1. Routing

- [ ] 1.1 Add nested `/admin` routes in `routes.tsx`: index (overview),
      `users`, `clients`, `projects`, `tasks`, `assignments`
- [ ] 1.2 Move the `RequireAuth` + `RequireRole` wrapping to the parent
      `/admin` route so nested children inherit it via `<Outlet />`

## 2. Shell component

- [ ] 2.1 Create `AdminShell` component: renders admin sub-navigation +
      `<Outlet />`
- [ ] 2.2 Add navigation links for the five management areas plus the
      inert month-closing slot
- [ ] 2.3 Replace `Admin.tsx`'s current inline `CreateUserForm` usage —
      `AdminShell` becomes the `/admin` element; move `CreateUserForm`
      under the new `/admin/users` route as a placeholder screen

## 3. Guard behavior

- [ ] 3.1 Change `RequireRole` to redirect to `/` on role mismatch instead
      of rendering an inline "Forbidden" message
- [ ] 3.2 Update `RequireRole.test.tsx` for the new redirect behavior

## 4. Styling

- [ ] 4.1 RTL layout, mobile-usable navigation (placeholder styling —
      pixel-matching to Figma blocked on the file being shared, see design.md)

## 5. Verification

- [ ] 5.1 Manually confirm a non-admin session visiting `/admin/*` is
      redirected, not shown any admin content
- [ ] 5.2 Manually confirm navigating between the five/six admin nav items
      keeps the shell mounted and only swaps the outlet content
