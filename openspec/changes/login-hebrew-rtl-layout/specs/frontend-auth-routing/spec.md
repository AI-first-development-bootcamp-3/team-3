## ADDED Requirements

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
