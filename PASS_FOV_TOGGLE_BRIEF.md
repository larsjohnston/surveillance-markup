# Pass: FOV Toggle (Canvas Visualization Control)

## Context

The canvas shows camera FOV cones to visualize what each camera sees. The cones are essential for camera-coverage planning — overlap analysis, blind spot detection, mounting angle decisions. But when a floor plan has 20+ cameras, the cones overlap each other, fill the canvas, and obscure the floor plan underneath. The integrator wants a way to dim the cone clutter while still seeing where the cameras are placed.

This pass adds a per-canvas toggle that hides FOV cones, leaving camera icons visible.

## What the user does

- A toggle button (or icon) appears in the canvas toolbar
- Click → all FOV cones hide instantly across all pages
- Click again → cones reappear
- State persists across mode switches within the session
- State does NOT persist across save/load (each session starts with cones visible)

## What the toggle affects

**Hides:**
- The semi-transparent FOV cone polygon for each camera
- The reach distance circle (if drawn separately)
- The angle indicator (if visualized separately from the cone)

**Keeps visible:**
- Camera icon (the dome / bullet / turret / etc. silhouette)
- Camera label
- Camera selection ring (yellow `#fbbf24` when selected)
- Mount-height indicator
- All non-camera devices (AC, smart apartment, suites)

## Where the toggle lives

Option A: Canvas toolbar (where zoom, fit, pan controls live today)
- Visible during all canvas work, not behind a menu
- Icon-only with tooltip "Hide/Show camera FOV"

Option B: Project settings or View menu
- Centralized but slower to reach
- Less discoverable

Recommended: **Option A** — canvas toolbar. Use an "eye" or "cone" icon with on/off state visualized via filled-vs-outline glyph.

## Visual rendering

- When cones visible (default): exactly as today — semi-transparent fill, edge stroke, reach radius
- When cones hidden: only the camera icon + label + selection ring renders. Floor plan underneath fully visible.
- Transition: instant (no fade animation — fade adds complexity, instant is clearer feedback)

## Scope

Small single-milestone pass. Estimated ~50 lines of code.

### M1 — FOV toggle

- Add `var fovVisible = true;` (per-session state, not persisted)
- Add toggle button to canvas toolbar HTML
- Add toggle handler that flips state + redraws canvas
- Modify camera draw function: skip FOV cone rendering when `fovVisible === false`
- Button visual state: filled icon when ON (default), outline icon when OFF
- Tooltip: "Hide camera FOV" / "Show camera FOV" (changes based on state)
- node --check + visual verification on canvas with 20+ cameras

## Constraints

- Per-session state only — no JSON persistence
- No effect on PDF export (PDF always shows cones; toggle is canvas-only)
- No animation
- Must work in all 6 modes (toggle visible when not in Cameras mode too, since the canvas shows cameras regardless of which mode is active)

## Test cases

- Default state on load: cones visible
- Click toggle → cones disappear, camera icons remain
- Click again → cones reappear
- Toggle state during AC mode → cones still hidden (state is canvas-wide, not mode-scoped)
- Mode switch → state preserved
- Page switch → state preserved
- Save + reload → state reverts to visible (no persistence)

## Out of scope

- Per-camera FOV toggle (hide cones individually) — Bigger UX problem, separate pass
- FOV opacity slider — same reasoning
- PDF export option to hide cones in proposal — could be a future cover toggle
- Toggle for AC device "coverage circles" if those ever exist — different visualization
