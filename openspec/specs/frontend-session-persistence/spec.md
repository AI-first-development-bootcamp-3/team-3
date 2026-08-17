# frontend-session-persistence Specification

## Purpose
Where an authenticated session is kept between page loads, how it is restored when the application boots,
and how the "remember me" choice changes that lifetime — so a reload never silently signs a user out and a
remembered session survives closing the browser.
## Requirements
### Requirement: Session survives a page reload

The frontend SHALL persist the authenticated session on login and restore it when the application boots,
so that reloading the page or navigating away and back does not end the session.

#### Scenario: Reload during an active session

- **WHEN** a logged-in user reloads the page
- **THEN** the session is restored and they remain on the requested route without being redirected to `/login`

#### Scenario: Reload with no session

- **WHEN** a user with no stored session loads the application
- **THEN** no session is restored and session-protected routes redirect to `/login` as usual

### Requirement: Remember me determines session lifetime

The login form SHALL offer a "Remember me" choice, unchecked by default. When it is not chosen, the
session SHALL persist only for the lifetime of the browser tab. When it is chosen, the session SHALL
persist across a full browser restart.

#### Scenario: Remember me not chosen, tab closed

- **WHEN** a user logs in without choosing "Remember me" and later closes the browser tab
- **THEN** opening the application in a new tab presents the login page

#### Scenario: Remember me not chosen, page reloaded

- **WHEN** a user logs in without choosing "Remember me" and reloads the page in the same tab
- **THEN** the session is restored and they remain logged in

#### Scenario: Remember me chosen, browser restarted

- **WHEN** a user logs in choosing "Remember me" and later quits and reopens the browser
- **THEN** the session is restored and they remain logged in

### Requirement: Expired stored sessions are discarded on boot

The frontend SHALL discard a stored session whose token has already expired before restoring it, so the
application never renders authenticated content that an immediate server rejection would revoke. A session
that is restored successfully and later reaches its expiry while the application is still open SHALL be
discarded at that moment as well, so expiry is not detected only at boot.

#### Scenario: Stored token is past its expiry

- **WHEN** the application boots and finds a stored session whose token expiry has passed
- **THEN** the stored session is discarded and the user is treated as logged out

#### Scenario: Stored token is unreadable or malformed

- **WHEN** the application boots and the stored session cannot be read or does not have the expected shape
- **THEN** the stored session is discarded and the user is treated as logged out, without the application failing to start

#### Scenario: Restored session reaches expiry while open

- **WHEN** a restored session's token expiry passes while the application remains open
- **THEN** the stored session is discarded and the user is treated as logged out, without waiting for a server request to be refused

### Requirement: Ending a session clears all persisted copies

Clearing the session SHALL remove every persisted copy of it, regardless of which storage the original
login chose, so no residue can restore a session that has been ended. Clearing SHALL also be observable to
other tabs of the same browser holding that session, so that they end it too rather than continuing from a
persisted copy that no longer exists. Where browser storage is unavailable and no such signal is possible,
clearing SHALL still succeed in the tab that requested it.

#### Scenario: Session expires mid-use

- **WHEN** the server rejects a request because the session token has expired
- **THEN** the persisted session is removed, the user is notified that their session expired, and they are redirected to `/login`

#### Scenario: Remembered session ended, then a non-remembered login

- **WHEN** a session that was stored as remembered is cleared, and the user then logs in again without choosing "Remember me"
- **THEN** no remembered copy of the earlier session remains, and closing the tab ends the new session

#### Scenario: Clearing is observable to other tabs

- **WHEN** a session is cleared in one tab while another tab of the same browser holds it
- **THEN** the other tab observes that the persisted session is gone and ends its own session

#### Scenario: Clearing succeeds without storage

- **WHEN** a session is cleared while browser storage is unavailable
- **THEN** the in-memory session is still cleared and no error is surfaced

### Requirement: Unavailable browser storage degrades gracefully

The frontend SHALL remain usable when browser storage cannot be read or written — as in some private
browsing modes — falling back to a session that lasts only as long as the page is open.

#### Scenario: Storage access denied

- **WHEN** a user logs in while browser storage is unavailable
- **THEN** the login still succeeds and the session works for the current page, and no error is surfaced to the user

