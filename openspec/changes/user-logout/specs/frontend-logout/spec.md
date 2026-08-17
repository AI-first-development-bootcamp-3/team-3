## Purpose

How a signed-in user deliberately ends their session from the interface — where the control lives, what the
application guarantees is torn down even when the server cannot be reached, where the user lands afterwards,
and how one tab logging out reaches the others.

## ADDED Requirements

### Requirement: A logout control is reachable from every authenticated page

The application SHALL present a logout control in the shared navigation available on every
session-protected page, so a user never has to hunt for a way out. Its label SHALL be in Hebrew and SHALL
follow the same right-to-left layout as the rest of the navigation.

The control SHALL NOT appear to users with no active session.

#### Scenario: Logged-in user sees the control

- **WHEN** a user with an active session views any session-protected page
- **THEN** a logout control is visible in the navigation

#### Scenario: Logged-out user does not see the control

- **WHEN** a user with no active session views the login page
- **THEN** no logout control is shown

#### Scenario: Control is keyboard reachable

- **WHEN** a user navigates the header with the keyboard
- **THEN** the logout control can be focused and activated without a pointer

### Requirement: Logging out clears all client-side session state

Activating logout SHALL remove every trace of the session held by the client: the token and user held in
memory, every persisted copy in browser storage regardless of which storage the login chose, and any cached
data fetched on that session's behalf. No subsequent page load or cache read SHALL be able to restore the
session or surface another user's data.

#### Scenario: Session state is gone after logout

- **WHEN** a user logs out
- **THEN** no token or user remains in application memory
- **AND** no persisted copy of the session remains in any browser storage

#### Scenario: Cached data does not outlive the session

- **WHEN** a user logs out and a different user logs in on the same browser
- **THEN** no data fetched for the first user is displayed to the second

#### Scenario: Reload after logout does not restore the session

- **WHEN** a user logs out and then reloads the application
- **THEN** they are treated as logged out and the login page is presented

### Requirement: Logout completes even when the server call fails

The application SHALL notify the server that the session is ending, but SHALL NOT make the client-side
teardown conditional on that call succeeding. If the request fails, times out, or the network is
unavailable, the client SHALL still clear its session state and redirect. A user who asks to log out SHALL
always end up logged out locally.

The application SHALL NOT surface a blocking error when only the server notification failed.

#### Scenario: Server is unreachable

- **WHEN** a user logs out while the network is unavailable
- **THEN** the client session is cleared and the user is taken to the login page
- **AND** no blocking error is presented

#### Scenario: Server rejects the logout call

- **WHEN** the logout request returns a server error
- **THEN** the client session is still cleared and the user is still taken to the login page

#### Scenario: Session already invalid server-side

- **WHEN** a user logs out with a token the server has already revoked
- **THEN** the client session is cleared and the user is taken to the login page without an additional expiry notice

### Requirement: Logout lands the user on the login page

After logout the application SHALL take the user to the login page. The path they were on SHALL NOT be
preserved for return after the next login, because leaving a shared machine pointed back at the previous
user's page is the situation logout exists to prevent.

#### Scenario: User is redirected after logout

- **WHEN** a user on a session-protected page logs out
- **THEN** the login page is presented

#### Scenario: Previous location is not restored on the next login

- **WHEN** a user logs out from a protected page and a user then logs in on the same browser
- **THEN** they are taken to the default landing page, not the page the previous session was on

#### Scenario: Back navigation does not reveal authenticated content

- **WHEN** a user logs out and then presses the browser's back button
- **THEN** no authenticated content is rendered and the login page is presented

### Requirement: The session ends on its own when the token expires

The application SHALL end the session as soon as the current token's expiry passes, without waiting for a
server request to be refused. The user SHALL be told their session expired and taken to the login page. A
tab left open past its token's lifetime SHALL NOT continue to display authenticated content.

Rejection of a request by the server SHALL remain a backstop for this, so that a client whose clock is
wrong still ends the session correctly.

#### Scenario: Token expires in an open tab

- **WHEN** a user leaves the application open and idle until the session token's expiry passes
- **THEN** the session is ended, they are notified it expired, and the login page is presented
- **AND** this happens without requiring the user to interact with the page first

#### Scenario: Restored session expires later in the same tab

- **WHEN** a user reloads the page and remains open until the restored session's expiry passes
- **THEN** the session is ended in the same way

#### Scenario: Client clock is behind the server

- **WHEN** the client believes the token is still valid but the server refuses a request as expired
- **THEN** the session is ended by that refusal as it is today

#### Scenario: Logging out cancels the pending expiry

- **WHEN** a user logs out before their token would have expired
- **THEN** no later expiry notice is presented

#### Scenario: Idle users are not logged out early

- **WHEN** a user does not interact with the application for a long period but their token has not expired
- **THEN** the session remains active

### Requirement: Logout propagates to other open tabs

When a session ends in one tab, every other tab of the same browser showing that session SHALL end it too,
rather than continuing to display authenticated content backed by a token that no longer works. This SHALL
apply both when the user logs out deliberately and when the server refuses a request because the session was
ended elsewhere.

#### Scenario: Logout in one tab ends the session in another

- **WHEN** a user has the application open in two tabs and logs out in the first
- **THEN** the second tab also ends the session and presents the login page

#### Scenario: Server-side revocation reaches other tabs

- **WHEN** one tab's request is refused because the session was ended elsewhere
- **THEN** the other tabs also end the session

#### Scenario: Logging in does not disturb an unrelated tab's session

- **WHEN** a user logs in in a second tab while the first tab holds an active session for the same account
- **THEN** the first tab is not logged out

#### Scenario: Cross-tab signalling is not required for correctness

- **WHEN** browser storage is unavailable so tabs cannot signal one another
- **THEN** the tab where logout was requested still logs out correctly
