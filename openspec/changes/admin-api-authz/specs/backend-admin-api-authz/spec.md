## Purpose

Guarantees that every backend route under `/admin` rejects non-admin
callers, and that this guarantee is enforced automatically rather than
relying on each route remembering to apply the guard.

## ADDED Requirements

### Requirement: Every admin route rejects non-admin callers
The backend SHALL reject any request to a route path starting with `/admin`
from a caller who is not authenticated as an admin, with `401` if
unauthenticated and `403` if authenticated as a non-admin.

#### Scenario: Unauthenticated request to an admin route
- **WHEN** a request with no valid session token is made to any `/admin/*`
  route
- **THEN** the response is `401`

#### Scenario: Non-admin request to an admin route
- **WHEN** a request with a valid non-admin session token is made to any
  `/admin/*` route
- **THEN** the response is `403`

#### Scenario: Admin request to an admin route
- **WHEN** a request with a valid admin session token is made to any
  `/admin/*` route
- **THEN** the request proceeds past the authorization check

### Requirement: A new unguarded admin route fails the test suite
The backend's test suite SHALL fail if any registered route path starting
with `/admin` does not carry the admin role guard.

#### Scenario: A route is added without the guard
- **WHEN** a new route under `/admin` is registered without the admin role
  guard applied
- **THEN** the coverage test for admin route guards fails
