# Pass A: Right-side details panel + editable floor tabs

This is a focused PR. Two coordinated changes that share a goal: maximize canvas real estate by removing always-on details UI, replacing it with selection-driven UI that appears only when needed.

This is structural — moving and reshaping panels, not just CSS — so plan carefully and confirm the implementation plan before edits.

## Change 1 — Right-side details panel (slide-in on selection)

### Current state

The left panel (right of the icon strip) currently contains:
- Camera Manufacturer / Type / Model picker controls (top)
- Camera details: Label, Resolution, FOV, Reach, Mount Height, Tier, Floor, Notes, Site Survey collapsible (middle)
- DORI Range readout
- Cameras list (bottom)
- Status footer

### New state

The left panel keeps **only** the picker and list/status sections:
- Camera Manufacturer (heading + tile grid)
- Camera Type (the 6 type buttons)
- (DORI Range readout stays in left panel — it's relevant whether or not a camera is selected, since it reflects the *currently configured* placement parameters)
- Cameras list
- Status footer

The selected-camera details move to a **new right-side details panel** that slides in from the right edge of the window only when a camera is selected.

### Right panel structure

Width: 300px. Hidden (translated off-screen via `transform: translateX(100%)`) when no camera is selected. Slides in (`transform: translateX(0)`) with a 150ms transition when a camera becomes selected.

Contents, top to bottom:

```
┌─────────────────────────────┐
│ Camera Details            × │  ← header with close button
├─────────────────────────────┤
│ LABEL                       │
│ [CAM-1.1               ]    │
│                             │
│ MANUFACTURER & MODEL        │
│ Eagle Eye DD08              │  ← read-only when model is set
│ 4MP Dome · Fixed 2.8mm      │
│                             │
│ SPECS                       │  ← read-only spec readout
│ Resolution: 4MP / 1440p     │
│ FOV: 100°                   │
│ Reach: 150 ft               │
│                             │
│ MOUNT HEIGHT                │
│ [3] m                       │
│                             │
│ ANGLE                       │
│ [───────●─────] 270°        │  ← keep angle slider editable
│                             │
│ NOTES                       │
│ [4MP Dome · Fixed 2.8mm    ]│
│ [· IP67 · IR              ]│
└─────────────────────────────┘
```

Notes:
- **Label** — editable text input, autosaves on blur (matches today's behavior on the existing label field)
- **Manufacturer & Model** — read-only when a model from the DB is selected. If the camera has `model: null` (custom), show "Custom Camera" + an editable description field instead.
- **Specs** — read-only summary of resolution, FOV, reach. These come from the model spec when a model is set. If custom, show editable sliders/inputs as today. Decide based on `cam.model` truthiness.
- **Mount Height** — editable number input, m or ft based on calibration unit
- **Angle** — keep the existing angle slider editable. The angle is per-placement, not a model spec, so it stays user-editable regardless of model.
- **Notes** — editable textarea, identical to today

### Hidden in this PR (kept in data model, not visible)

- Tier (Essential / Recommended / Premium) — `cam.tier` field stays, default 'Recommended'. Don't show in UI.
- Floor — `cam.floor` field stays. Will be replaced by tab-name derivation in Change 2.
- Site Survey collapsible — all fields stay in `cam.siteSurvey`. Don't show in UI.

These are hidden, not removed. Saved projects with tier/floor/siteSurvey data still load correctly. We just don't render those fields in the new right panel.

### Selection and deselection rules

- Clicking a camera on the canvas → selects it, right panel slides in with that camera's details
- Clicking a different camera → selection switches, panel content updates instantly (no slide-out + slide-in animation, just content swap)
- Clicking empty canvas with something selected → **deselects only**, panel slides out, NO new camera placed (this is a behavior change — see below)
- Clicking empty canvas with nothing selected → places a camera (today's behavior, unchanged)
- Pressing Esc → deselects, panel slides out
- Clicking the × in the panel header → deselects, panel slides out
- Deleting the selected camera (Delete key, × in cameras list) → panel slides out automatically since selectedId becomes null

### The new "two-click placement after selection" behavior

This is the deliberate behavior change. Today, in cameras mode, clicking empty canvas always places a camera. With the new panel, when something is selected, clicking empty canvas DESELECTS rather than placing.

To place a new camera while something is selected: click empty canvas once (deselects, panel slides out), then click again (places). This matches Figma, Sketch, Illustrator — every drawing app uses this model.

The same rule applies to AC mode: clicking empty canvas with a reader selected deselects rather than placing a new reader. Symmetry across both modes.

### CSS / layout details

- Right panel: `position: fixed; top: 0; right: 0; bottom: 0; width: 300px; background: #fff; box-shadow: -8px 0 30px rgba(0,0,0,.10); transform: translateX(100%); transition: transform .15s ease-out; z-index: 50;`
- Open state: `.right-panel.open { transform: translateX(0); }`
- The canvas wrap fills the available width minus the icon strip + left panel. **Don't shrink the canvas when the right panel opens** — the right panel overlays the canvas. This avoids layout reflow on every selection.
- Panel header: 16px padding, "Camera Details" left-aligned, × button right-aligned, hairline border below
- Field labels in panel: --text-muted, 10px, uppercase, .04em letter-spacing — matches existing field labels in the left panel
- Inputs: same styling as left panel inputs
- Padding: 20px horizontal, 16px between field groups

### What stays in the LEFT panel after this change

The left panel becomes a "what to place" panel:
- Camera Manufacturer header + the existing brand picker tiles
- Camera Type header + the 6 type buttons
- DORI Range readout (live updates as user adjusts FOV/reach via type buttons or by selecting different cameras — keep current behavior)
- Cameras list with count
- Status footer

For AC mode: the existing reader picker tiles + Readers list. No right-panel for AC in this PR — AC readers don't have editable per-device properties yet (see future Pass D for that). Confirm: clicking a reader on the canvas should select it (existing behavior, controls highlight color via canvas redraw) but should NOT open the right panel since there's nothing to edit.

## Change 2 — Editable floor tabs

### Current state

Tabs are labeled "Page 1, Page 2…" generated from the page index. Not editable.

The camera properties panel has a "Floor" text input where the user manually types the floor name per camera. This is redundant when the tab name and the floor name should be the same thing.

### New state

Tabs become editable text. Default name is "Floor 1, Floor 2…" instead of "Page 1, Page 2…".

Click the tab name (not the × delete button — that stays separate) to enter edit mode. The text becomes a small inline input. Type new name. Press Enter or blur to save. Press Esc to cancel.

The tab's editable name is stored on the page itself: `pages[idx].name`. Default to `"Floor " + (idx + 1)` if not set. Persisted in JSON save/load (extend the v8 format to v9 with the new `name` field per page, with backwards-compatible read of v8).

### Camera floor field — derived, not stored

`cam.floor` field stays in the data model for backwards compatibility (saved v8 projects), but:
- Don't show the Floor text input in the right-side details panel
- When a new camera is placed, set `cam.floor = pages[cam.page].name` (auto-fill on placement)
- When a tab is renamed, update all cameras on that page: `cameras.filter(c => c.page === idx).forEach(c => c.floor = newName)` — keeps the field consistent for legacy code that reads it
- This makes `cam.floor` a derived value that mirrors the tab name. Eventually we could remove the field entirely; for now keep it synced for safety.

### Riser zone bands (related, not changing in this PR)

The riser already groups cameras by their `zone` field. The `zone` field is currently separate from `floor`. After this change, since tabs ARE the floor name, you'd typically want zones to mirror floors too. But that's a different decision — leave the zone field alone for this PR. If a user wants their riser bands to use floor names, they manually copy the floor into zone. We can automate that in a future PR.

### PDF auto-detected floor names (future tie-in)

In a future PR, the PDF title-block detector will set `pages[idx].name` from the parsed title. For now, that's not in scope — defaults to "Floor 1, Floor 2…" and the user edits manually. The detector PR will just be a default-value provider for the same field.

### Tab edit interaction details

- Click the page tab text → enter edit mode (input replaces text, focused, all selected)
- Type new name (max 30 chars, alphanumeric + spaces + dash + slash, no special chars)
- Press Enter or blur → save: update `pages[idx].name`, update derived `cam.floor` for all cameras on that page, redraw, exit edit mode
- Press Esc → exit edit mode without saving
- Empty name → don't save; revert to previous name
- × button on tabs continues to work as today (delete page with cascade)
- Active tab styling unchanged

## Out of scope for this PR

The following changes were discussed but are deliberately deferred to future PRs:

- 4-tile manufacturer grid with Axis added (Pass B)
- Manufacturer-as-filter behavior (Pass B)
- Three sections: Manufacturer / Classification / Accessories (Pass B)
- Pop-up model picker on placement (Pass C)
- AC right-side panel for readers (future Pass D)
- PDF title-block auto-detection of floor names (future)

Don't implement any of these. If the changes in this PR seem to imply they should be done at the same time, resist — the goal is to land focused, testable changes one at a time.

## Constraints

- Don't change canvas drawing code (drawCam, drawCableRuns, drawReader, etc.) except where needed to handle the new selection/deselection behavior. The selection ring rendering should stay identical.
- Don't introduce new dependencies.
- Preserve all existing JS-referenced IDs except for elements that are explicitly being moved (which need their IDs to follow them).
- The existing label / mount-height / FOV / angle / notes inputs in the left panel get MOVED to the right panel. Their IDs follow them — `inp-label` stays `inp-label`, just in a different DOM location. JS references continue to work without changes.
- Tier and site-survey HTML elements: leave them in the DOM but hidden via CSS (`display: none`). This keeps the JS that reads/writes those values working without if-guards.
- Test in browser after the change. Verify save/load with both old (v8) and new (v9) JSON formats.

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out an implementation plan as a numbered checklist before any edits. Confirm with me before starting.
3. Execute in this order:
   a. Add `pages[idx].name` field to data model and JSON v9 format with backwards-compat read of v8
   b. Make tab text editable; default new tabs to "Floor N"
   c. Wire `cam.floor` derivation from tab name on placement and rename
   d. Add the right-side details panel HTML/CSS
   e. Move the editable detail fields (label, mount height, angle slider, notes) from left panel to right panel by relocating their HTML
   f. Hide the Tier text/select, the Floor input, the Site Survey collapsible via CSS `display: none`
   g. Update selection logic: clicking a camera opens right panel; clicking empty canvas with selection deselects; Esc deselects; × in panel deselects
   h. Update click-to-place logic: only places when nothing is selected
   i. Make sure AC mode does NOT trigger the right panel (clicking a reader should select but not slide in any panel)
4. JS syntax check after each step.
5. Tell me what to test.
