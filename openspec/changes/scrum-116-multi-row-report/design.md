## Decisions

**New `POST /reports/batch` instead of changing `POST /reports`.** The single-row route is already merged and referenced by Swagger; a second route keeps that contract intact and gives batch its own body shape.

**One Prisma transaction per submission.** A day that is half saved is worse than a day that failed: the employee cannot tell which cards survived.

**Row errors are addressed as `rows.<index>.<field>`.** The screen shows several identical-looking cards, so a bare `taskId` error cannot be placed. The index is the card position at submit time.

**`description` is optional in batch rows.** The mock shows `הוספת פירוט...` as an opt-in line and the stepped picker ends at `מיקום`, so requiring it would block a flow the design allows. Stored as `''` when omitted, which the existing column accepts.

**The day's `כניסה` / `יציאה` is not persisted.** There is no attendance model, and working-day calculation belongs to SCRUM-144. Here it seeds the first card's hours and drives the footer progress; reopening a saved day is SCRUM-118's problem.

**Rows must sit inside the day window.** A card outside `כניסה`–`יציאה` is a typo, not a valid report, and catching it in the form is cheaper than a support call.

**Selection uses stepped sheets, not `Select`.** The mock's cells open a full-width list grouped by client, with a CTA that walks the cascade. An Ant `Select` dropdown cannot be styled into that without fighting the component.

**Native `<input type="time">` for the time pills.** The mock's pill is a small grey chip, and the native control gives us the platform time keyboard on mobile for free; Ant's `TimePicker` brings a panel we would have to restyle.

**Plain CSS files with custom properties, like `Reports.css`.** The home shell already matches Figma this way, so the two screens share one styling idiom.

## Figma source

File `⏰ Time report files ⏰`, canvas `📱 | Mobile web app`. Desktop has three undecided options (`אופציה א׳/ב׳/ג׳`), so the mobile frame is the source and desktop centres it at 393px.

| State | Node |
| --- | --- |
| Before adding a project | `1:1621` |
| After adding a project | `1:4352` |
| `בחר פרויקט` | `1:7225` |
| `בחר משימה` | `1:7926` |
| `בחר מיקום` | `1:8238` |
| Delete confirmation | `1:6361` |
| Missing required field | `1:5931` |

Tokens taken from those nodes:

| Element | Value |
| --- | --- |
| Page / sheet background | `#F2F2F7` |
| Card | `#FFFFFF`, radius `10px` |
| Cell | height `44px`, padding-inline-end `16px`, inner padding-inline-start `12px`, gap `12px` |
| Separator | `0.75px` `#E1E7F3`, inset by the cell's inner padding |
| Segmented track | `rgba(118,118,128,0.12)`, radius `8px`, padding `2px`, height `32px` |
| Segmented selected | `#FFFFFF`, radius `7px`, `0.5px rgba(0,0,0,0.04)`, shadow `0 3px 1px rgba(0,0,0,0.04), 0 3px 8px rgba(0,0,0,0.12)` |
| Day label | Assistant 400 `14px/18px`, `rgba(24,24,24,0.64)` |
| `תקן יומי 9 שע׳` tag | `#E3F9CA`, radius `100px`, text `#106103` 500 `12px` |
| Section title | Assistant 600 `18px/20px`, `#212525` |
| Value chip | `#F0F4FA`, radius `100px`, text `#0F77F0` |
| `הוספת פרויקט` | `#0C69FF`, Assistant 400 `18px`, add-circle `24px` on the reading side, gap `6px` |
| `מחיקת פרויקט` | `#FF0000`, centred |
| Footer bar | `#FFFFFF`, top border `1px #D5D5D9`, padding `16px`, gap `10px` |
| Progress | track `5px` `#DDE1F2`, fill `#FF8900`→`#FF9100`, min width `10px` |
| Save / sheet CTA | `#141E3E`, radius `6px`, height `48px`; disabled `#9FA3B1` |
| Sheet option selected | label `#0065D4`, separator inset `25px` both sides |
| Error banner | `#EB2F44`, radius `12px`, icon square `40px` on `rgba(255,255,255,0.12)` |
| Alert | `361x328`, radius `16px`, padding `32px 20px` |

## Verified against the mock

Every state was rendered in headless Chrome at 393x852 @2x and measured against the frame geometry. Matching to the pixel: close button, title row, segmented track, day label, `תקן יומי` tag, day card and cells, time pills, section title, project card rows, `הוספת פרויקט`, footer, save button, and the delete alert (`16,262,361,328`, identical to `1:6792`).

Three places deliberately differ:

- **Time pill is `56px`, not the mock's `52px`.** The mock sets `09:04` in SF Pro; Assistant's digits are wider and Chrome's `input[type=time]` adds its own field spacing, so a 52px pill clips the minutes.
- **Empty cells keep the `בחירה` placeholder.** The design system's cell defines it as a sub-label; the mock's frame just has it hidden. Without it an untouched row reads as static text.
- **The sheet's height is proportional (`min-height: 74svh`), not a fixed `494px`.** The mock's frame reserves 80px for mobile-browser chrome; a proportion reproduces the same silhouette on a real viewport, and the sheet still grows to full height for the long `בחר פרויקט` list, as in `1:7225`.

## Risks

- Rebuilding the screen replaces the tested `ReportEntryForm`; its behaviour tests move to the new screen rather than being dropped.
- Batch validation runs one hierarchy query per row. Days are small (a handful of cards), so a loop inside the transaction is fine; revisit if a bulk import ever appears.
