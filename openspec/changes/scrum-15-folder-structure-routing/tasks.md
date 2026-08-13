## 1. Folder structure

- [ ] 1.1 Create `src/components/`, `src/pages/`, `src/hooks/`, `src/services/`, `src/types/` (each with `.gitkeep` if empty)

## 2. Routing

- [ ] 2.1 Install `react-router-dom`
- [ ] 2.2 Create `src/pages/Layout.tsx` — shared layout with nav, renders `<Outlet />`
- [ ] 2.3 Create placeholder pages: `src/pages/Reports.tsx`, `src/pages/Absences.tsx`, `src/pages/Admin.tsx`, `src/pages/NotFound.tsx`
- [ ] 2.4 Create `src/routes.tsx` with `createBrowserRouter`, wiring the layout and the three placeholder routes plus a catch-all
- [ ] 2.5 Wire `RouterProvider` into `src/main.tsx` (or `App.tsx`), replacing the SCRUM-16 placeholder content

## 3. Verify

- [ ] 3.1 `npm run dev` — nav renders, clicking each link shows the right placeholder inside the layout
- [ ] 3.2 Navigating to an undefined path renders the not-found page, not a blank screen
- [ ] 3.3 `npm run build` completes without TypeScript errors
