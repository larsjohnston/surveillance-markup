# Pass A.8: AC Reader Rename + Right-Side Details Panel

## Context

User feedback: AC readers can't be renamed. Cameras let you change the auto-generated label (CAM-P1-1) to something meaningful ("Lobby Front Door"); readers stay locked at their auto-generated `AC-P1-1` style with no UI to edit them. Side effect: when readers are deleted from the middle of a sequence, the gaps stay visible (AC-P1-1, AC-P1-3, AC-P1-4) because users can't relabel.

This PR adds editable labels and a notes field to readers, mirroring the camera workflow. The simplest path is to extend the right-side details panel (Pass A) to also handle readers when they're selected.

## What changes for the user

**Today:**
1. Click a reader on the canvas → reader gets selected (yellow outline) but no panel opens
2. No way to rename. Stuck with `AC-P1-3`.

**After this PR:**
1. Click a reader on the canvas → reader gets selected AND right-side details panel slides in
2. Panel shows: editable label, read-only manufacturer/model, read-only form factor, editable notes
3. Edit the label → blur or Enter commits
4. Click empty canvas → deselects, panel slides out (matches camera behavior)
5. Esc → deselects, panel slides out

## Builds on Pass A

Pass A introduced the right-side details panel for cameras and explicitly carved out AC readers as out-of-scope. This PR removes that carve-out and adds reader-specific panel content.

## Scope

Mirror the camera details panel for readers, with reader-appropriate fields. Not a full clone — just the fields that make sense for a reader:

- **Editable label** (currently auto-generated as AC-P1-N, becomes user-editable)
- **Read-only manufacturer + model** ("Brivo Smart Reader B-BSMF-B")
- **Read-only form factor + tech** ("Single-Gang · Dual-tech" or "Mullion · Dual-tech" or "Single-Gang Keypad · Dual-tech")
- **Editable notes** (free-text, plain textarea)

No mount height (readers don't have one). No FOV (readers don't have one). No tier (kept hidden in cameras too — same here). No site survey (out of scope, can add later).

## Data model

`acDevices[]` entries currently have:
```javascript
{
  id: "ac-...",
  page: 0,
  x: 1234,
  y: 567,
  model: "B-BSMF-B",
  label: "AC-P1-1"
}
```

Add an optional `notes` field, default empty string. JSON format bumps to v13:

```javascript
{
  id: "ac-...",
  page: 0,
  x: 1234,
  y: 567,
  model: "B-BSMF-B",
  label: "AC-P1-1",     // existing, now user-editable
  notes: ""             // new, default empty
}
```

JSON save/load:
- v13: persist label (already happens) + notes (new)
- v12 and earlier: read cleanly (no `notes` field → defaults to empty string)

## UI changes

### Right-side panel — extend to support readers

The right panel today populates from a selected camera via `updateRightPanelDisplay(cam)` and `openRightPanelForCamera(cam)` (Pass A). Add parallel functions for readers:

- `updateRightPanelDisplayForReader(dev)` — populates panel with reader fields
- `openRightPanelForReader(dev)` — calls update + adds `.open` class to panel

The panel's top-level header text changes based on what's selected:
- Camera selected → "Camera Details"
- Reader selected → "Access Control Reader"

The panel's CSS structure stays the same (header + body + close button); the body's content shape varies:

**Camera mode (existing):**
- Label (editable)
- Manufacturer & Model (read-only or "Custom Camera")
- Specs (read-only or editable Resolution/FOV/Reach)
- Mount Height (editable)
- Angle (editable)
- Notes (editable)

**Reader mode (new):**
- Label (editable)
- Manufacturer & Model (read-only) — "Brivo Smart Reader B-BSMF-B"
- Form Factor (read-only) — "Single-Gang · Dual-tech" or "Mullion · Dual-tech" or "Single-Gang Keypad · Dual-tech"
- Notes (editable)

Implementation pattern:
- Two `<div>` blocks inside the panel body, one with class `rp-camera-fields` and one with class `rp-reader-fields`
- Each is hidden via CSS by default, shown when its mode is active
- `updateRightPanelDisplay()` (camera) shows the camera block, hides the reader block
- `updateRightPanelDisplayForReader()` (reader) shows the reader block, hides the camera block
- Use a single set of input IDs for shared concepts (`inp-label`, `inp-notes`) — both modes write/read from these. The other camera-specific IDs (`inp-fov`, `inp-reach`, `inp-mount`, etc.) only exist in camera mode.

Wait — using shared IDs across modes is a foot-gun. If `inp-label` exists twice in the DOM (once per mode block), only one is reachable by `getElementById`. Solution:

- **Use mode-specific IDs**: `inp-label-cam`, `inp-label-reader`, `inp-notes-cam`, `inp-notes-reader`
- The existing `updateSelected()` for cameras reads `inp-label-cam` (rename of today's `inp-label`)
- Add `updateSelectedReader()` that reads `inp-label-reader` and writes to the selected reader's `label` and `notes`
- Both fields use the same `oninput` pattern as cameras for live updates

Or simpler: keep one set of fields in the panel, and dynamically swap their `oninput` handlers based on what's selected. Honestly — Claude Code, pick whichever approach has less complexity. The brief is the goal; implementation tactics are your call.

### Click selection updates

Currently in cameras mode, clicking a camera calls `selectCamera(cam.id)` which calls `openRightPanelForCamera(cam)`.

In AC mode, clicking a reader calls `selectReader(dev.id)` which does NOT open the right panel today. Update:
- `selectReader(id)` → after the existing redraw + updateAcList, also call `openRightPanelForReader(dev)` if `dev` is found

### setPanelMode behavior

When switching from cameras → access mode, the right panel currently force-closes (Pass A behavior, since AC didn't have panel content). Change:
- Don't force-close on mode switch. Instead, let the panel state follow the selection state.
- If a reader is currently selected, it should be the case that the right panel shows reader content.
- If no reader is selected, the right panel should already be closed (because cameras-mode selection was cleared on mode switch).

In practice: when `setPanelMode('access')` runs, it already clears `selectedId`. That triggers the right panel to close (since no camera is selected). When the user clicks a reader, it opens with reader content. Should "just work" with the existing logic plus the new opening trigger.

When `setPanelMode('cameras')` runs, similarly: clear `acSelectedId` → panel closes (no reader selected) → user clicks a camera → panel opens with camera content.

### Esc and click-empty-canvas behaviors

Already in place from Pass A:
- Esc with reader selected → clears `acSelectedId`, calls `closeRightPanel()`-equivalent for AC

After this PR, "close right panel for reader" needs to be a real flow:
- Add `closeRightPanelForReader()` analog to `closeRightPanel()` (or generalize the existing function to handle either mode)
- Wire it into Esc, the empty-canvas-deselect path, and the × close button on the panel

The cleanest refactor:
- Rename `closeRightPanel()` to be mode-aware: it clears `selectedId` AND `acSelectedId`, removes the `.open` class, redraws everything. Both panel modes use the same close.
- The deselect handlers don't need to know which mode they're in — they just call `closeRightPanel()` and it handles both.

### × in panel header

Already exists. Update its `onclick` to call the unified `closeRightPanel()`.

## Save/load behavior

JSON v13 format: persists reader `label` (already does) and the new `notes` field.

```javascript
// In saveJSON's acDevices serialization, no change needed — label already persists.
// notes will persist automatically because it's a new field on the existing object.
```

The serialization already saves all fields on `acDevices[i]`. Adding `notes` to the object means it gets saved.

For load: v13 reads the new field directly. Older versions (v9-v12) don't have `notes` on readers — initialize to empty string when applying state.

In `applyProjectState` after `acDevices = data.acDevices || []`, ensure each device has a `notes` field:

```javascript
acDevices.forEach(function(dev){ if(typeof dev.notes !== 'string') dev.notes = ''; });
```

## Out of scope

- Site survey fields for readers (could come later)
- Reader-specific sliders or DORI-equivalent visualizations
- Reusing deleted reader numbering (the gap problem) — not fixing in this PR. Once readers can be renamed, the gap problem becomes invisible because users will rename anyway. Same approach as cameras (which have the same gap behavior in production but nobody cares because the labels are renamed).
- Adding new reader properties (mount height, power source, conduit, etc.) — too many decisions to make at once

## Constraints

- Don't introduce new dependencies
- Don't change canvas drawing or hit-testing
- Don't change the BRIVO_READERS database
- Preserve existing JS-referenced IDs unless explicitly changed (the field-IDs decision above)
- Keep the cameras-list update path working — when a reader's label changes, `updateAcList()` must reflect the new label

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out implementation as a numbered checklist before edits. Confirm with me.
3. Execute in this order:
   a. Add `notes` field to acDevices data model. Default empty on placement. Initialize on load for backwards compat. Bump JSON to v13.
   b. Refactor right panel: add reader-specific fields block (label, manufacturer/model readout, form factor readout, notes). Decide ID strategy (separate or shared) for label/notes.
   c. Generalize `closeRightPanel()` to handle both modes.
   d. Add `updateRightPanelDisplayForReader(dev)` and `openRightPanelForReader(dev)`.
   e. Wire `selectReader(id)` to open the panel.
   f. Add `updateSelectedReader()` that writes label + notes back to the selected reader, calls `redraw()` and `updateAcList()`.
   g. Wire the editable inputs' `oninput` events to call `updateSelectedReader()` when in reader mode.
   h. Update panel header to show "Camera Details" or "Access Control Reader" based on what's selected.
   i. Verify mode switching: clicking a camera while a reader is selected should swap panel content cleanly (not double-render).
4. JS syntax check after each step.
5. Tell me what to test in the browser.

## Test cases

- Place a reader → click it → right panel opens, shows AC-P1-1, manufacturer Brivo, form factor Single-Gang Dual-tech (or whichever variant)
- Edit the label to "Front Lobby Door" → blur → label persists, cameras list shows new name
- Add notes "Exterior, weatherproof box required" → blur → persists
- Save project, reload, drop JSON → reader's renamed label and notes restore
- Click a different reader → panel content swaps to that reader's data instantly
- Click empty canvas → reader deselects, panel slides out
- Press Esc → same
- Click × in panel header → same
- Switch from access mode to cameras mode (icon strip or "1" key) → panel closes (selection cleared)
- Click a camera in cameras mode → panel opens with camera details (existing Pass A behavior, unchanged)
- Switch from cameras mode back to access mode while a camera is selected → camera deselects, panel closes, then user can click a reader to open it
- Backwards compat: load a v11 or v12 save → readers load without `notes`, default to empty, no errors
