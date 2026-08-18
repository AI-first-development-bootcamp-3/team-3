## Why

The דיווח ידני stepper sheets make a simple day report feel like a wizard, and each project row still stores clock-in/clock-out as if the person sat on that project the whole window. In real life the day has one attendance window (e.g. 09:00–18:00, possibly overnight) and each assigned project gets a share of hours in half-hour steps. Those shares need not fill the window — lunch and rest are simply unallocated.

## What Changes

- Replace the project/task/location **popup stepper** with **inline dropdowns** on an empty project card created immediately (הוספת פרויקט / first card).
- Keep **כניסה / יציאה once at the top of the day**. If יציאה is earlier than כניסה, treat it as the **next calendar morning**; the window length is still a single number of hours.
- Each project row records **hours** in **0.5 steps** (UI starts at 0; **0.5 minimum to save**), plus **משימה**, **מיקום**, and optional free-text. No separate client picker — projects come from the assigned tree; the client is implied.
- If a chosen project has **exactly one** assigned task, select it automatically.
- **Sum of row hours MUST NOT exceed** the attendance window. It MAY be less.
- **שמירה** stays enabled; incomplete rows or hours of 0 show an **informative error**, not a disabled button.
- **BREAKING:** `POST /reports` and `POST /reports/batch` stop treating `startTime`/`endTime` as per-row intervals. The day window is sent once; each row sends `hours` instead of row-level times.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `time-reports`: Day-level attendance window, per-row half-hour allocations, assigned-hierarchy dropdowns, overnight window math, and batch validation that the sum of hours cannot exceed the window.

## Impact

- Prisma `TimeReport`: add `hours`; `startTime`/`endTime` mean the **day** window (copied onto each row of that day).
- `POST /reports`, `POST /reports/batch`, list responses, Swagger.
- Frontend `ManualReport` / picker / schema / tests; `GET /me/reporting-options` already returns the assigned client→project→task tree and stays the dropdown source.
- Existing saved rows that used per-project clocks need a one-off migration: keep their times as the day window if they match, otherwise set window from min start / max end that day and set `hours` from the old interval (overnight-aware).
