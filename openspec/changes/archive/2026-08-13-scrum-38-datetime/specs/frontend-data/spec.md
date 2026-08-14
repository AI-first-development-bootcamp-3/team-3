## ADDED Requirements

### Requirement: Dates formatted in Hebrew locale
The frontend SHALL format and parse dates using a single configured date library set to Hebrew locale,
so every date picker, timestamp and monthly view displays consistently rather than each component
picking its own formatting.

#### Scenario: Date picker renders
- **WHEN** any date or time picker component is rendered
- **THEN** it displays in Hebrew locale formatting
