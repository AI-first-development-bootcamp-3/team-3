## 1. Back control on the change-password page

- [x] 1.1 In [ChangePassword.tsx](frontend/src/pages/ChangePassword.tsx), import `homePath` (already
      imported for the save path) and add a second button beside "שמירת סיסמה", labelled "חזרה", using
      antd's default (non-primary) `Button` so the save action stays the visual primary.
- [x] 1.2 Give the back button `htmlType="button"` so it cannot submit the antd `Form`, and an
      `onClick` that calls `navigate(homePath(user))` — a plain push, not `navigate(-1)`, so the
      destination does not depend on browser history.
- [x] 1.3 Render the two buttons in a shared flex row with a gap so they sit side by side under the
      fields and read correctly in the page's RTL direction.
- [x] 1.4 Leave the back button enabled while `isSubmitting` is true, so a slow or failed save cannot
      strand the user on the page.

## 2. Tests

- [x] 2.1 In [ChangePassword.test.tsx](frontend/src/pages/ChangePassword.test.tsx), add a test that a
      regular session clicking "חזרה" navigates to `/` — assert via a `MemoryRouter` route that renders
      a probe element, matching the pattern in
      [UserMenu.test.tsx](frontend/src/components/UserMenu.test.tsx).
- [x] 2.2 Add a test that an admin session clicking "חזרה" navigates to `/admin`.
- [x] 2.3 Add a test that clicking "חזרה" with both password fields filled sends no request — assert the
      stubbed `fetch` mock was not called and the session user is unchanged.
- [x] 2.4 Confirm the two existing tests (mismatch validation, successful save) still pass unchanged;
      do not adjust them to accommodate the new button.

## 3. Verification

- [x] 3.1 Run the frontend test suite and the lint/type-check the CI runs for `frontend`.
- [x] 3.2 Manually load `/change-password` in a fresh tab (no in-app history) as a regular user and as an
      admin, and confirm "חזרה" lands on `/` and `/admin` respectively with the password unchanged.
