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

### Requirement: Authenticated users are redirected away from the login route

The frontend SHALL redirect a user who already holds an active session away from the login route
instead of rendering the login form. Showing the form to someone already logged in invites a
pointless re-authentication and, on submit, would replace a valid session for no reason.

The redirect SHALL send the user to the application's home route, and SHALL replace the current
history entry rather than pushing a new one, so that pressing Back does not return the user to the
login page they were just redirected out of.

This requirement governs only the case where a session already exists. It does not change what
happens for a user with no session, who SHALL continue to see the login form.

#### Scenario: Logged-in user navigates to the login route

- **WHEN** a user with an active session navigates to the login route
- **THEN** they are redirected to the home route and the login form is not shown

#### Scenario: Redirect does not trap the user in history

- **WHEN** a logged-in user has been redirected away from the login route
- **THEN** navigating back does not return them to the login route

#### Scenario: Logged-out user is unaffected

- **WHEN** a user with no active session navigates to the login route
- **THEN** the login form is shown as normal

#### Scenario: Session established during the visit

- **WHEN** a user submits the login form successfully while on the login route
- **THEN** they proceed to their post-login destination, and the guard does not interfere with that
  navigation

### Requirement: Login page is presented in Hebrew

Every piece of text the login page shows the user SHALL be in Hebrew. The product is Hebrew-only, and
a login screen in another language is the first thing every user sees.

This covers the page heading, the label for each input, the remember-me control, the submit control,
the messages shown when a login attempt fails, and the client-side validation messages shown against
individual fields.

Translating this copy SHALL NOT change which message is shown in which circumstance. The distinction
between an invalid-credentials failure, a throttled attempt, and a generic failure is specified
elsewhere in this capability and SHALL be preserved exactly, including the requirement that no message
reveals whether an entered email belongs to a real account.

#### Scenario: Login page is displayed

- **WHEN** the login page is rendered
- **THEN** its heading, input labels, remember-me control and submit control are all in Hebrew

#### Scenario: Submission fails validation

- **WHEN** the form is submitted with a required field empty or an malformed email address
- **THEN** the inline validation message shown against that field is in Hebrew

#### Scenario: Login attempt is refused

- **WHEN** a login attempt is refused for any reason
- **THEN** the message shown is in Hebrew, and still distinguishes invalid credentials, a throttled
  attempt, and a generic failure from one another

### Requirement: Login page is usable across mobile and desktop viewports

The login page SHALL remain usable at both narrow and wide viewport widths. At desktop widths the
form SHALL be constrained to a readable measure rather than stretching across the full content
column, and at mobile widths it SHALL fit without horizontal scrolling.

The page's text direction SHALL be right-to-left, consistent with the rest of the app, so that
labels, controls and error messages align and read correctly. Inputs whose value is expected to be
Latin script — the email and password fields — SHALL render their contents left-to-right, so that
typed credentials and the text caret behave correctly inside the right-to-left page.

#### Scenario: Desktop viewport

- **WHEN** the login page is viewed at a desktop viewport width
- **THEN** the form is constrained to a readable width rather than spanning the full content column

#### Scenario: Mobile viewport

- **WHEN** the login page is viewed at a mobile viewport width
- **THEN** the form fits the viewport without horizontal scrolling and every control remains reachable

#### Scenario: Right-to-left presentation

- **WHEN** the login page is rendered
- **THEN** its labels, controls and error messages are laid out right-to-left

#### Scenario: Credentials typed into the email and password fields

- **WHEN** a user types an email address or password
- **THEN** the entered text and the caret render left-to-right within the field

### Requirement: Login page distinguishes a locked email and counts down the wait

When a login attempt is refused because the email is locked for sustained failed attempts, the login page SHALL tell the user that specifically. It SHALL NOT reuse the invalid-credentials message, the throttled message, or the generic failure fallback — the first invites more futile retries, and neither of the others conveys how long the wait is.

The message SHALL state the time remaining before the user may try again, taken from the response rather than assumed by the client, and SHALL update that time as it elapses so the user sees it counting down without reloading the page. When the wait reaches zero the page SHALL let the user submit again.

The message SHALL NOT state or imply anything about whether the email entered belongs to a real account.

#### Scenario: Attempt refused as locked

- **WHEN** a submitted login is refused because the email is locked
- **THEN** the page shows a message identifying that the account is temporarily locked and stating the time remaining before another attempt is allowed

#### Scenario: Remaining time counts down live

- **WHEN** the locked message is displayed and time passes
- **THEN** the displayed remaining time decreases without the user reloading or resubmitting

#### Scenario: Wait elapses

- **WHEN** the displayed remaining time reaches zero
- **THEN** the page no longer presents the user as blocked, and the form can be submitted again

#### Scenario: Locked message is distinct from the other failures

- **WHEN** a login is refused as locked
- **THEN** the message shown differs from the incorrect-email-or-password message, from the too-many-attempts message, and from the generic "something went wrong" fallback

#### Scenario: Form stays usable

- **WHEN** the locked message is shown
- **THEN** the form's fields retain what the user typed, so a user who waits out the lock is not forced to re-enter their email

#### Scenario: Locked message reveals nothing about registration

- **WHEN** the locked message is shown
- **THEN** its wording is the same whether or not the entered email belongs to a real account

### Requirement: Login page distinguishes a throttled attempt

When a login attempt is refused because too many attempts have been made, the login page SHALL tell the user that specifically. It SHALL NOT reuse the invalid-credentials message, which would send the user into more futile retries, and SHALL NOT fall back to the generic failure message, which gives no actionable next step.

The message SHALL tell the user to wait and try again, and SHALL NOT state or imply anything about whether the email they entered belongs to a real account.

#### Scenario: Attempt refused as throttled

- **WHEN** a submitted login is refused for exceeding an attempt threshold
- **THEN** the page shows a message identifying that too many attempts were made and that the user should wait before retrying

#### Scenario: Throttled message is distinct from invalid credentials

- **WHEN** a login is refused as throttled
- **THEN** the message shown differs from the one shown for an incorrect email or password, and from the generic "something went wrong" fallback

#### Scenario: Invalid credentials still shows its own message

- **WHEN** a login is refused because the credentials are wrong and no threshold has been exceeded
- **THEN** the existing incorrect-email-or-password message is shown, unchanged

#### Scenario: Form stays usable

- **WHEN** the throttled message is shown
- **THEN** the form's fields retain what the user typed and the form can be submitted again, so a user who waits out the window is not forced to re-enter their email

