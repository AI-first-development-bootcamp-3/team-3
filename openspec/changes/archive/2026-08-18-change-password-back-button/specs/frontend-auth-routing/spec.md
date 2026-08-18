## ADDED Requirements

### Requirement: Change-password page offers a way back to the home route

The change-password page SHALL present a control, labelled in Hebrew alongside the save control, that
returns the user to their session's home route without changing the password.

The destination SHALL be the same home route the rest of the application uses for the current session:
`/admin` for an admin session and `/` for a regular session. The destination SHALL NOT depend on browser
history, so a user who opened the page from a bookmark, a fresh tab, or a direct URL reaches the same
place as one who arrived from inside the application.

Using the control SHALL NOT submit the form, call the change-password endpoint, or alter the stored
session. A user who leaves this way keeps the password they had.

The control SHALL be present whenever the page renders. It SHALL remain operable while a save is in
flight, so a slow or hung request cannot strand the user on the page.

#### Scenario: Regular user leaves the page

- **WHEN** a user with a regular session activates the back control on the change-password page
- **THEN** they are taken to `/` and their password is unchanged

#### Scenario: Admin leaves the page

- **WHEN** a user with an admin session activates the back control on the change-password page
- **THEN** they are taken to `/admin` and their password is unchanged

#### Scenario: Page was opened directly

- **WHEN** a user opens the change-password page directly, with no prior in-application navigation, and
  activates the back control
- **THEN** they are taken to their session's home route rather than out of the application

#### Scenario: Partly filled form is abandoned

- **WHEN** a user has typed into the password fields, has not submitted, and activates the back control
- **THEN** no change-password request is sent and the entered values are discarded

#### Scenario: Back control during a save in flight

- **WHEN** a save request is in flight and the user activates the back control
- **THEN** the control is operable and takes the user to their session's home route

#### Scenario: Saving is unaffected

- **WHEN** a user submits a valid new password
- **THEN** the password is saved and the user is redirected to their home route exactly as before this
  change
