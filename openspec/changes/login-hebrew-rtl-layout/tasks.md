## 1. Hebrew copy

- [x] 1.1 Translate the page heading, the email and password labels, the remember-me checkbox label
      and the submit button in `Login.tsx` to Hebrew, written inline per the repo convention
- [x] 1.2 Translate the three failure messages in `Login.tsx` — invalid credentials (401), throttled
      (429), and the generic fallback — keeping all three distinct from one another
- [x] 1.3 Translate the validation messages in `Login.schema.ts` (email required, invalid email
      format, password required)
- [x] 1.4 Re-read the 401 and 429 messages to confirm neither reveals whether the entered email
      belongs to a real account

## 2. Layout and direction

- [x] 2.1 Constrain the form to a readable max width and centre it, so it no longer spans the full
      content column on desktop
- [x] 2.2 Add `dir="ltr"` to the email and password inputs only, leaving labels and the rest of the
      page RTL
- [x] 2.3 Check the page at a mobile width for horizontal overflow and at a desktop width for the
      constrained measure (verified in Chrome via CDP with real viewport emulation: documentElement
      scrollWidth equals the viewport at both 393x852 and 1440x900, zero overflowing elements)
- [x] 2.4 If the layout needs more than a couple of inline styles, extract it to `Login.css`
      following the `Reports.css` / `ReportEntryForm.css` precedent

## 3. Guest guard (SCRUM-214)

- [x] 3.1 Add a `RequireGuest` component mirroring `RequireAuth`: read the session store, render
      children when there is no token
- [x] 3.2 Give `RequireGuest` the same destination logic as `Login.tsx` — honour `location.state.from`
      when present, and send a `mustChangePassword` user to `/change-password` — per design.md, so
      the guard and the post-login navigation cannot disagree
- [x] 3.3 Use `replace` on the redirect so Back does not return the user to the login route
- [x] 3.4 Wrap the `login` route in `routes.tsx` with `RequireGuest`

## 4. Tests

- [ ] 4.1 Re-query all nine existing tests in `Login.test.tsx` against the Hebrew copy, keeping each
      test's existing assertion intent unchanged
- [x] 4.2 Add a test: a session-holding user rendering the login route is redirected and the form is
      not shown
- [x] 4.3 Add a test: a session-holding user with `mustChangePassword` lands on `/change-password`,
      not `/`
- [x] 4.4 Add a test: a `from` path is still honoured when the guard performs the redirect
- [x] 4.5 Add a test: a user with no session still sees the login form
- [x] 4.6 Confirm the existing 401 / 429 / generic-failure tests still assert three distinct messages
      (the generic-failure case had never been tested — a test was added to close that gap)
- [x] 4.7 Run the frontend test suite and confirm no other suite depended on the English login copy

## 5. Wrap-up

- [x] 5.1 Run lint and the full frontend test suite clean
- [ ] 5.2 Open a PR into `development` per README, referencing SCRUM-213 and SCRUM-214
- [ ] 5.3 File the follow-up ticket for the login visual shell (Figma-based, SCRUM-219-style),
      noting that the Figma login screens show Azure SSO and cannot be implemented as drawn
- [ ] 5.4 Note in that follow-up ticket that `/login` still renders inside `Layout`, showing the app
      nav to logged-out users
