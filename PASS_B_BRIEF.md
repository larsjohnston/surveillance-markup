# Pass B: Typed Scale Calibration

## Context

The tool's FOV cones, DORI bands, and cable length calculations all depend on knowing the drawing's scale (pixels per real-world meter). Today this requires the user to use Tools → Calibrate Scale and click two points to define a known distance — but most users miss this step and end up with FOV cones that don't reflect the cameras' real-world coverage.

This PR adds a faster way to set scale: type the drawing's printed scale ratio (e.g., `1/8" = 1'-0"` or `1:100`). Most architectural drawings have this printed in their title block. We also add an auto-prompt that fires when a new PDF is loaded, so users can't miss the step.

## Builds on Pass A.25

This PR comes after Pass A and Pass A.25 are shipped. The data model for `calibrations[pageIdx]` already exists from earlier — we're adding a second way to populate it, not replacing the existing two-point method.

## What changes for the user

**Today:**
1. Load PDF → empty floor plan, no calibration
2. (User often forgets to calibrate)
3. Place cameras → cones are wrong size, user confused

**After this PR:**
1. Load new PDF → an auto-prompt slides in from the right side: "Set scale for Page 1 of N"
2. User selects Imperial or Metric, types the scale they see on the drawing (e.g., `1/8" = 1'-0"`)
3. Tool parses, calibrates the page
4. Prompt advances to Page 2, etc., until all pages are calibrated or skipped
5. User places cameras → cones reflect real-world coverage immediately

The existing two-point Calibrate Scale tool stays available in the Tools menu — both methods can be used. The new tabbed dialog has both:

- **Tab 1: Type Scale** (new, default)
- **Tab 2: Measure Two Points** (existing functionality, unchanged)

## Data model

Calibration data structure stays the same: `calibrations[pageIdx] = { pixelsPerMeter: <number> }`. Both methods write to this same structure. Math downstream of calibration is unchanged.

Add an optional `unit` field for display purposes only:

```javascript
calibrations[pageIdx] = {
  pixelsPerMeter: 320.5,
  unit: "imperial"   // or "metric" — for display formatting
}
```

If `unit` is missing, default to imperial display (consistent with existing behavior).

## The Calibrate Scale dialog — tabbed structure

Replace the existing single-flow Calibrate Scale modal with a tabbed dialog. Tab 1 is "Type Scale" (new, default). Tab 2 is "Measure Two Points" (existing functionality, unchanged behavior — just relocated inside the tab).

Tab 1 fields:
- Drawing units radio: Imperial (default) / Metric
- Drawing scale: free-form text input
- Placeholder text changes by unit: Imperial shows `e.g. 1/8" = 1'-0" or 1:96`, Metric shows `e.g. 1:100`
- Apply button parses, calibrates, closes dialog
- Cancel button closes without changes

## Smart parser for typed scale

Build `parseTypedScale(input, units)` returning `{ ratio: <number>, error: <string|null> }`.

### Imperial mode — accept all of these as equivalent inputs

For `1/8" = 1'-0"` (ratio 1:96):
- `1/8" = 1'-0"` (architectural notation, full)
- `1/8" = 1'` (shorthand)
- `1/8 = 1` (sloppy shorthand, no quotes/markers)
- `1/8"=1'` (no spaces)
- `1:96` (ratio direct)
- whitespace-tolerant variants of all of the above

Common imperial scales the parser must handle cleanly:

| User types | Resulting ratio |
|---|---|
| `1/16" = 1'-0"` or `1/16 = 1` or `1:192` | 192 |
| `1/8" = 1'-0"` or `1/8 = 1` or `1:96` | 96 |
| `3/16" = 1'-0"` or `3/16 = 1` or `1:64` | 64 |
| `1/4" = 1'-0"` or `1/4 = 1` or `1:48` | 48 |
| `3/8" = 1'-0"` or `3/8 = 1` or `1:32` | 32 |
| `1/2" = 1'-0"` or `1/2 = 1` or `1:24` | 24 |
| `3/4" = 1'-0"` or `3/4 = 1` or `1:16` | 16 |
| `1" = 1'-0"` or `1 = 1` or `1:12` | 12 |

Conversion logic for architectural notation:
- `<paper inches> = <real feet>` → `ratio = (real feet × 12) / paper inches`
- E.g. `1/8" = 1'-0"` → `(1 × 12) / 0.125 = 96` → 1:96

### Metric mode — accept ratio formats

- `1:100` → ratio 100
- `1:50`, `1:200`, `1:500`, `1:1000`, `1:75`, etc.
- `1 : 200` (whitespace tolerant)

Don't try to handle `1cm = 1m` or similar. Ratio format only is the metric standard.

### Validation

- Empty / unparseable → error: `"Couldn't read that scale. Try formats like 1/8\" = 1'-0\" or 1:100."`
- Ratio < 1 or > 5000 → error: `"Scale ratio looks off. Common scales are 1:24 to 1:1000."`
- Division by zero in any path → error: `"Scale can't have zero values."`

## Converting parsed ratio to pixelsPerMeter

The PDF.js page object provides:
- `page.view = [x0, y0, x1, y1]` in PDF points (1 point = 1/72 inch)
- The viewport has a `scale` factor applied during rendering

The math:
```
// Constants
var PT_TO_METERS = 0.0254 / 72;  // 1 PDF point = 0.0003528 meters

// pixelsPerMeter = renderedScale × 72 / (0.0254 × ratio)
//                = renderedScale × 2834.6457 / ratio
function ratioToPixelsPerMeter(ratio, renderScale) {
  return renderScale * 72 / (0.0254 * ratio);
}
```

For the standard PDF.js render scale of 4× (used by this tool) and a 1:100 metric scale:
`pixelsPerMeter = 4 × 72 / (0.0254 × 100) = 113.4 px/m`

This formula assumes the PDF was rendered at exact scale (which is true for most CAD-exported PDFs). If the PDF was scaled to fit a letter-size page, this method gives an incorrect result — that's an inherent limitation of typed-scale calibration. The two-point method (Tab 2) is the fallback for those cases.

## Auto-prompt on new PDF load

When a NEW PDF is loaded (not via "Load Project" of a saved JSON, which already has calibrations), automatically show a calibrate prompt as a floating overlay.

### Detecting "new PDF" vs "loaded project"

In the loadPDF flow, after rendering completes:

```javascript
var pagesNeedingCalibration = pages
  .map((p, i) => i)
  .filter(i => !calibrations[i] || !calibrations[i].pixelsPerMeter);

if (pagesNeedingCalibration.length === pages.length) {
  // No pages calibrated → fresh import → prompt
  startCalibrationPrompt(pagesNeedingCalibration);
}
```

If a saved project is loaded, calibrations come back in the JSON, so `pagesNeedingCalibration.length` will be less than `pages.length` and no auto-prompt fires.

### Floating overlay style

The auto-prompt is a floating overlay, not a modal. User can pan/zoom the canvas underneath while looking for the title block.

```css
#scale-prompt {
  position: fixed;
  top: 80px;          /* below top bar + tabs */
  right: 24px;
  width: 280px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 16px;
  z-index: 40;        /* below modals (50), above canvas (10) */
  transform: translateX(calc(100% + 24px));
  transition: transform .2s ease-out;
}
#scale-prompt.show {
  transform: translateX(0);
}
```

### Overlay structure

Header text: "Set Scale for Page {N} of {Total}"
Body text: "Find the printed scale on your drawing (usually in the title block)."
Drawing units radio (Imperial / Metric)
Drawing scale text input with appropriate placeholder
Buttons:
- **Set & Continue** — parses, applies calibration to current page, advances to next uncalibrated page in queue (rebuilds overlay text). When queue is exhausted, closes overlay.
- **Skip This Page** — leaves page uncalibrated, advances. Tracked in `skippedPages` Set.
- **× close** — dismisses overlay entirely. User can manually re-open via Tools.

### State

```javascript
var autoPromptQueue = [];      // array of page indices to prompt for
var autoPromptCurrentIdx = 0;  // pointer into queue
var skippedPages = new Set();  // pages user explicitly skipped (session-level)
```

`startCalibrationPrompt(pageIndices)` initializes queue, shows overlay for first page.

`advanceCalibrationPrompt()` — increment pointer; if more pages, update overlay; else close.

If user navigates to a different tab during the prompt, the overlay closes (user has chosen to navigate manually).

### When the auto-prompt navigates between pages

When the prompt advances to the next page, the tool should also navigate the canvas to that page (call existing `switchPage(idx)`) so the user is looking at the right floor plan when they read the title block. Otherwise they'd be reading page 1's scale while the canvas shows page 2.

## Discoverability banner

In addition to the auto-prompt, add a subtle banner above the canvas when the current page is not calibrated and not in `skippedPages`:

Banner content: "⚠ Floor plan not calibrated. FOV ranges may be inaccurate. [Set Scale]"

Style:
- Amber/yellow background `#fef3c7`
- Thin border `1px solid #fcd34d`
- Text color `#92400e`
- 8-12px padding
- 11-12px font
- Sits just above canvas, below tabs

Click anywhere on the banner (especially the "Set Scale" link) → opens the Calibrate Scale dialog (Tab 1 by default).

Banner shows when:
- Current page has no calibration AND
- Current page is not in skippedPages (user explicitly skipped it during auto-prompt)

Banner hides when:
- Current page has calibration, OR
- User has skipped this page (they made a deliberate choice; don't nag)

When user calibrates via the dialog, banner disappears immediately.

## Existing two-point method (Tab 2)

The existing Tools → Calibrate Scale flow stays functional. It's now Tab 2 of the new dialog. No behavioral change — the user clicks two points on the canvas, types a real-world distance, and the tool computes pixelsPerMeter the same way.

When the user clicks "Calibrate by Measuring" in Tab 2, the dialog should close (or hide) so the user can click points on the canvas. The post-click distance prompt is unchanged from today's behavior. Match the current implementation as closely as possible — don't refactor the existing two-point flow.

## Out of scope

- Auto-detecting the scale by parsing PDF text via PDF.js getTextContent (looking for "1/8\" = 1'-0\"" or "SCALE: 1:100" near the title block) — future PR
- Saving the typed-scale value separately from the computed pixelsPerMeter (i.e., remembering the user typed "1/8" = 1'-0"" so it can be re-displayed later) — not needed for this PR; just store pixelsPerMeter

## Constraints

- Don't change canvas drawing or DORI math — those are downstream of `calibrations[pageIdx].pixelsPerMeter`, which is the same field today
- Don't introduce new dependencies
- The existing two-point calibration must keep working identically (just relocated into Tab 2)
- Test parser thoroughly with all the format variants listed in the test cases section

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out an implementation plan as a numbered checklist before any edits. Confirm with me before starting.
3. Execute in this order:
   a. Build the smart parser `parseTypedScale(input, units)` as a standalone function. Verify with the test cases below before wiring anything UI.
   b. Build `applyTypedScale(pageIdx, ratio, units)` that computes pixelsPerMeter and writes to calibrations.
   c. Restructure Tools → Calibrate Scale dialog with tabs (Type Scale / Measure Two Points). Type Scale default. Existing two-point flow goes inside Tab 2 unchanged.
   d. Build the floating overlay `#scale-prompt` and `startCalibrationPrompt(pageIndices)` queue logic.
   e. Wire detection in loadPDF — auto-fire prompt for fresh imports.
   f. Wire the discoverability banner — show/hide based on current-page calibration state.
   g. Verify saved-project JSON load does NOT trigger the auto-prompt (calibrations already populated).
4. JS syntax check after each step.
5. Tell me what to test in the browser.

## Test cases the parser must handle

Imperial inputs that should produce ratio 96:
- `1/8" = 1'-0"`
- `1/8" = 1'`
- `1/8 = 1`
- `1/8"=1'`
- `1:96`
- whitespace variants of all of the above

Imperial inputs that should produce ratio 48:
- `1/4" = 1'-0"`
- `1/4 = 1`
- `1:48`

Imperial inputs that should produce ratio 24:
- `1/2" = 1'-0"`
- `1:24`

Metric inputs:
- `1:100` → 100
- `1:50` → 50
- `1 : 200` → 200 (whitespace tolerant)
- `1:1000` → 1000

Inputs that should error:
- `` (empty) → "Couldn't read that scale..."
- `abc` → "Couldn't read that scale..."
- `1/0` → "Scale can't have zero values."
- `1:0` → "Scale can't have zero values."
- `1:5000000` → "Scale ratio looks off..."
- `1/8" = 0'` → "Scale can't have zero values."
