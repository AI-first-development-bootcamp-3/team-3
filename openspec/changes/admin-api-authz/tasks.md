## 1. Guard marker

- [ ] 1.1 Add a marker property to the handler `requireRole` returns
- [ ] 1.2 Confirm the marker survives Express's route registration
      (inspect a test route's `layer.handle.__isAdminRoleGuard`)

## 2. Coverage test

- [ ] 2.1 Write a test that walks `app`'s registered route stack
- [ ] 2.2 Filter to routes whose path starts with `/admin`
- [ ] 2.3 Assert each has a middleware layer carrying the guard marker
- [ ] 2.4 Confirm the test fails when a stub `/admin/*` route without the
      guard is temporarily added, then remove the stub

## 3. Verification

- [ ] 3.1 Run the full backend test suite — confirm the three existing
      `/admin/users/*` routes pass the new coverage test unchanged
- [ ] 3.2 Manual: unauthenticated request to `/admin/users` returns 401;
      non-admin token returns 403
