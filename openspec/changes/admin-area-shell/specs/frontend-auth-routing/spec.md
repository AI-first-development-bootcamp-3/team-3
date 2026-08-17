## MODIFIED Requirements

### Requirement: Admin-only routes restricted by role
The frontend SHALL restrict admin-only routes to users whose session role is `admin`, regardless of
whether they are otherwise logged in. A non-admin session is redirected away from the admin route
rather than shown any admin-route content in place.

#### Scenario: Non-admin session requests an admin route
- **WHEN** a user with an active non-admin session navigates to an admin-only route
- **THEN** they are redirected away from that route and no admin content is rendered

#### Scenario: Admin session requests an admin route
- **WHEN** a user with an active admin session navigates to an admin-only route
- **THEN** the route renders normally
