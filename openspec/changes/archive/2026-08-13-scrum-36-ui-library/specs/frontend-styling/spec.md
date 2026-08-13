## ADDED Requirements

### Requirement: UI component library with RTL enabled globally
The frontend SHALL use a single UI component library for form inputs, tables and date pickers, with RTL
enabled at the provider level so no individual component needs a manual RTL override.

#### Scenario: Any library component renders
- **WHEN** any component from the chosen UI library is rendered anywhere in the app
- **THEN** it renders right-to-left without a per-component RTL prop or override
