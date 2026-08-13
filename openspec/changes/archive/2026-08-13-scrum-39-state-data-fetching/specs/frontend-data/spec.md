## ADDED Requirements

### Requirement: Cached server-state queries
The frontend SHALL cache backend query results by query key, so multiple components requesting the same
data within the cache window share one network call rather than each fetching independently.

#### Scenario: Two consumers request the same data
- **WHEN** two components mount and both request data under the same query key within the cache window
- **THEN** only one network request is made and both components receive the result

### Requirement: Session state accessible outside React
The frontend SHALL store auth/session state in a way that's readable both from React components and
from non-component code (the API client), so the client can attach the session token to requests
without React context being threaded into it.

#### Scenario: API client sends an authenticated request
- **WHEN** the API client sends a request and a session token is present
- **THEN** the request includes the token without the caller having to pass it explicitly
