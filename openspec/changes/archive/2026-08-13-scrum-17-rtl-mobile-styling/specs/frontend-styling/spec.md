## Purpose

The app's RTL and mobile-first defaults — the direction, language and base breakpoint conventions every
later page and component inherits instead of setting independently.

## ADDED Requirements

### Requirement: Document renders right-to-left in Hebrew
The app SHALL set the document direction to RTL and the language to Hebrew at the root, so every page
inherits correct text direction and layout mirroring without per-component overrides.

#### Scenario: Any page loads
- **WHEN** any route in the app is loaded
- **THEN** the document direction is right-to-left and the language is Hebrew

### Requirement: Mobile-first base styling
The app SHALL define its base styles mobile-first, with layout and typography that remain usable at
narrow viewport widths without horizontal scrolling.

#### Scenario: Narrow viewport
- **WHEN** the app is viewed at a mobile viewport width
- **THEN** the layout and nav remain usable without horizontal scrolling

#### Scenario: Wide viewport
- **WHEN** the app is viewed at a desktop viewport width
- **THEN** the layout scales up from the mobile base rather than breaking
