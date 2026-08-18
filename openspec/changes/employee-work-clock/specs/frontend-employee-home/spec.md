## MODIFIED Requirements

### Requirement: Clock is not a working timer

The home SHALL show **הפעלת שעון** when idle and delegate running-timer behavior to the `frontend-work-clock` capability. The control MUST NOT remain disabled with **בקרוב** once SCRUM-305 is delivered. While a session is active, the home SHALL show the running-clock UI defined in `frontend-work-clock` instead of the idle **הפעלת שעון** CTA.

#### Scenario: Idle home shows enabled clock

- **WHEN** an authenticated employee opens `/` with no clock session
- **THEN** **הפעלת שעון** is enabled and does not display **בקרוב**

#### Scenario: Active session shows stop control

- **WHEN** a clock session is active
- **THEN** the home shows elapsed time and **עצור שעון** instead of the idle start CTA

#### Scenario: Manual report still available

- **WHEN** the home is shown with or without an active clock session
- **THEN** **דיווח ידני** remains available as today
