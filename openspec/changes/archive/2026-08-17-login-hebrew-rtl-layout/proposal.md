## Why

The product is Hebrew-only and the app is RTL app-wide, but the login page — the first screen every
user sees — is still entirely English (`Login`, `Email`, `Password`, `Remember me`, `Sign in`, and all
of its error and validation messages). It is also an unstyled form with no width constraint, so on a
desktop viewport the inputs stretch the full content column and the page reads as unfinished.

Separately, `/login` has no guest guard: an already-authenticated user can navigate back to it and be
shown the login form again. That is tracked as SCRUM-214, and since it changes the same route and the
same test file, splitting it into its own PR would mean touching `/login` twice.

## What Changes

- Translate all login page copy to Hebrew, written inline in the component per the repo's existing
  convention — page heading, field labels, the remember-me checkbox, the submit button, the three
  API-failure messages, and the schema's validation messages.
- Constrain and centre the form so it is usable at both mobile and desktop widths, instead of
  stretching to the full content column on desktop.
- Verify the form, labels and error messages read correctly right-to-left, and set `dir="ltr"` on the
  email and password inputs so Latin-script credentials render and caret correctly inside an RTL page.
- Add a guest guard so an authenticated user who navigates to `/login` is redirected away rather than
  shown the form. **This closes SCRUM-214**, folded in here deliberately.
- Rewrite `Login.test.tsx`: all nine existing tests query English text (`/email/i`, `/sign in/i`,
  `/remember me/i`) and will fail once the copy is Hebrew. Add coverage for the guest guard.

Explicitly **not** in this change, each for a specific reason:

- **No visual design work** — no card, background, or exported illustrations. The Figma's login
  screens show Azure SSO, which is not this product's auth model, so they cannot be implemented as
  drawn. A login visual shell is genuinely unowned work (SCRUM-219 is the *home page* shell, not
  login) and should get its own SCRUM-219-style ticket.
- **`ChangePassword.tsx`** stays English — a separate page, authored by another team member, reached
  only after a successful login.
- **Dark mode** is left exactly as-is. No ticket in the project mentions it; the
  `prefers-color-scheme: dark` block in `index.css` is leftover scaffolding, not a requirement.
- **`CreateUserForm.tsx`** stays English — an admin surface outside this ticket.

## Capabilities

### New Capabilities

None. Both requirement groups extend an existing capability.

### Modified Capabilities

- `frontend-auth-routing`: adds a guest-guard requirement (authenticated users are redirected away
  from the login route), and requirements covering the login page's presentation — Hebrew copy, and a
  layout that stays usable across mobile and desktop widths. Login-page behaviour already lives in
  this capability by precedent: the throttled-attempt message added by `login-rate-limiting` is
  specified here.

## Impact

- `frontend/src/pages/Login.tsx` — copy, layout wrapper, guest-guard redirect.
- `frontend/src/pages/Login.schema.ts` — Hebrew validation messages.
- `frontend/src/pages/Login.test.tsx` — all nine tests re-queried in Hebrew, plus guest-guard tests.
- `frontend/src/routes.tsx` — only if the guard is applied at the route level rather than inside the
  component; see design.md.
- Possibly a new `frontend/src/pages/Login.css`, following the `Reports.css` / `ReportEntryForm.css`
  precedent, if the layout needs more than inline styles.
- No backend, API, dependency or migration impact. No change to the login request or response.

**Jira:** closes SCRUM-213 and SCRUM-214.
