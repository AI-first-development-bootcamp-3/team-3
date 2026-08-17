## ADDED Requirements

### Requirement: Forced password change blocks other protected routes

The frontend SHALL redirect a session whose `mustChangePassword` is true to `/change-password` when it requests any other session-protected route, so the requirement cannot be bypassed by navigating directly to a different URL.

#### Scenario: Session must change password, requests another protected route

- **WHEN** a user whose session has `mustChangePassword: true` navigates to a session-protected route other than `/change-password`
- **THEN** they are redirected to `/change-password` instead of the requested route

#### Scenario: Session must change password, requests the change-password route itself

- **WHEN** a user whose session has `mustChangePassword: true` navigates to `/change-password`
- **THEN** the route renders normally

#### Scenario: Session does not need a password change

- **WHEN** a user whose session has `mustChangePassword: false` (or unset) navigates to a session-protected route
- **THEN** the route renders normally, unaffected by this requirement
