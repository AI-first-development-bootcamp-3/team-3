# frontend-auth-routing Specification

## Purpose
Which routes require a logged-in session, which require a specific role, and what happens when either
check fails — so every future route (feature Stories add more admin and regular-user pages) follows the
same guard pattern instead of each checking auth ad hoc.
## Requirements
### Requirement: Unauthenticated access redirects to login
The frontend SHALL redirect a request for any session-protected route to `/login` when no session
exists, preserving the originally requested path so the user returns there after logging in.

#### Scenario: No session, protected route requested
- **WHEN** a user with no active session navigates to a session-protected route
- **THEN** they are redirected to `/login` and the originally requested path is preserved

#### Scenario: Session exists
- **WHEN** a user with an active session navigates to a session-protected route
- **THEN** the route renders normally

### Requirement: Admin-only routes restricted by role
The frontend SHALL restrict admin-only routes to users whose session role is `admin`, regardless of
whether they are otherwise logged in.

#### Scenario: Non-admin session requests an admin route
- **WHEN** a user with an active non-admin session navigates to an admin-only route
- **THEN** access is denied and they are not shown the admin content

#### Scenario: Admin session requests an admin route
- **WHEN** a user with an active admin session navigates to an admin-only route
- **THEN** the route renders normally

