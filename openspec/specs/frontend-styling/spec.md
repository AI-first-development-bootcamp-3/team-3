# frontend-styling Specification

## Purpose
The app's RTL and mobile-first defaults — the direction, language and base breakpoint conventions every
later page and component inherits instead of setting independently.
## Requirements
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

### Requirement: UI component library with RTL enabled globally
The frontend SHALL use a single UI component library for form inputs, tables and date pickers, with RTL
enabled at the provider level so no individual component needs a manual RTL override.

#### Scenario: Any library component renders
- **WHEN** any component from the chosen UI library is rendered anywhere in the app
- **THEN** it renders right-to-left without a per-component RTL prop or override

