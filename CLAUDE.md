# Surveillance Markup Tool

## What this is
Single-file browser-based tool for security camera placement, coverage analysis, BOM generation, and proposal export. Runs entirely client-side. Used by a security integrator to produce quick quotes and floor plan layouts for prospective customers.

## Files
- `camera_markup_tool.html` — the entire tool, ~140 KB, ~2700 lines, single file
- `lib/` — three external libraries (PDF.js + worker, jsPDF), loaded as `<script src>`
- `setup-windows.bat` / `setup-mac-linux.sh` — one-time scripts that fetch libs from cdnjs
- `README.md` — end-user deployment guide

## Architecture
- Vanilla JavaScript, no framework. Plain `<script>` block at the end of the HTML.
- One canvas element. Camera placements stored in a flat `cameras[]` array, each tagged with `page` index.
- PDF.js renders each page to an offscreen canvas at 4× scale; that canvas is drawn into the visible canvas at user's zoom level. Retina-aware via `devicePixelRatio`.
- Save/Load uses JSON files, not localStorage.

## Major features built
- **PDF or PNG/JPG import** (drag-drop or file picker, multi-page PDFs become tabs)
- **Camera database** — 25 Eagle Eye + 19 Hanwha Wisenet models with real specs
- **Six camera styles** — Dome (red), Bullet (blue), Turret (cyan), Fisheye (green), PTZ (purple), LPR (amber). Each has a flat SVG icon and a distinct canvas rendering.
- **Brand picker UI** — three-tile grid (Custom / EE / HW). Clicking opens a modal with style filter chips and a grouped model list.
- **Scale calibration** — click two reference points, type real distance in ft or m. Per-page calibration persisted in JSON.
- **DORI zones** (IEC 62676-4 standard) — colored bands inside the FOV cone showing Identification (250 ppm), Recognition (125), Observation (62), Detection (25). Math: `D = horizPx / (2 × targetPPM × tan(FOV/2))`.
- **Mounting height + recommended tilt** — auto-calculated based on camera height and detection range.
- **Visualization modes** — Blind Spots overlay (mutually exclusive with Heatmap).
- **Cable run planner** — place an NVR head-end per page, cables auto-draw with length labels. Runs over 90 m flagged red (Cat6 PoE limit).
- **Bill of Materials drawer** — six sections (Cameras, Recording, Network, Cabling, Labor, Other), each with auto-rows + custom add-line. Live margin/tax/grand total. CSV export.
- **Storage calculator** — retention days × fps × codec × recording mode → Mbps, GB/day, TB needed, recommended drive count.
- **Multi-tier pricing** — each camera tagged Essential/Recommended/Premium; BOM has tier filter chips.
- **Site survey fields per camera** — mount type, power source, environment, conduit, hazards.
- **Project info modal** — client, address, ref number, date, valid-until, salesperson, scope.
- **Proposal PDF export** — branded cover page, camera schedule, BOM with totals, then floor plan pages with overlays. Saved with project name as filename.

## Pending / known gaps
- **Pricing fields are blank by default.** User will populate camera and labor pricing in the database when they have updated info from their distributor.
- **Cable cost line** is a placeholder — user will provide cable cost per foot/meter later.
- The user briefly mentioned wanting team-wide deployment; we packaged this as a portable folder with a setup script for now.

## Coding conventions used
- Courier New monospace UI, dark navy `#111827` headers with red `#c8202c` accent, white panels.
- IDs and class names: kebab-case (`bom-stat`, `model-row`, `tier-chip`).
- Functions: camelCase. Variables and state are `var` declarations at module scope, no `let`/`const` — keeps the file consistent with what was already there.
- All CSS in a single `<style>` block at the top. All JS in one `<script>` block at the bottom (plus a small library-detection script).
- No build step. Edit the HTML directly.

## Things I'd like to keep doing in this style
- Single-file HTML — must keep working when opened directly from disk by double-click. No frameworks, no bundler, no node_modules in the runtime.
- Library count stays at PDF.js + jsPDF only. Don't add new dependencies without asking.
- Every change to the tool gets tested by opening the HTML in a browser and trying it.

## Workflow notes
- Use `git add . && git commit` after meaningful changes for safe undo.
- The HTML file is large — favor targeted `str_replace` edits over rewrites.
- After any significant edit, do a JS syntax check: `node -e "..."` on the script block (we did this in the prior session).

## Step report format

At the end of every step, output a single fenced markdown code block containing the complete step report. This is for the user to copy and paste back to their reviewer for verification. Use this exact structure:

## Step [N] — [short description]

### Files changed
- `<filepath>` — [N lines added, M removed]

### Code sites touched
| Site | Before | After |
|---|---|---|
| `functionName()` (line ~NNNN) | [old behavior] | [new behavior] |

### Decisions made (where the brief left a choice)
- [Decision]: chose [option] because [reason]. Alternative was [other option].

### Behavior NOT changed (what the brief might imply but I left alone)
- [Item]: kept as-is because [reason]

### Risks / things to watch
- [Anything that could regress, edge cases, or that needs human eyes]

### Syntax check
- node --check: PASS / FAIL

### Console smoke test (optional but preferred for data/math changes)
Paste-able lines the user can run in DevTools console.

### Manual browser test list
1. [Specific user action] → [expected outcome]
2. [Specific user action] → [expected outcome]

### What's next
Step [N+1] handles: [short description]. Ready to proceed when user confirms.

Always include all sections. If a section doesn't apply, write "N/A" — don't omit. Be candid in the Risks section. List only non-trivial Decisions, not naming or formatting choices.

## Codebase conventions and known pitfalls

This section captures lessons from past PRs. Each entry exists because Claude Code (or a reviewer) made a mistake here before. Read this section at the start of every session.

### Calibration math — pixelsPerMeter convention

`calibrations[pageIdx].pixelsPerMeter` is in **PDF-points-per-meter**, not offcanvas-pixels-per-meter. The two-point calibration in `saveCalib` produces this value correctly using `pixelDist / meters` where `pixelDist` is already in PDF points (cssX / viewScale).

Any new code that writes to `pixelsPerMeter` must match this convention. Specifically: do **NOT** include `RENDER_SCALE` in the formula. Render-time consumers (`drawCamCone`, `getCameraReachPx`, `cableLengthM`) multiply by `viewScale` at draw time to convert PDF-points to screen pixels. Including `RENDER_SCALE` in `pixelsPerMeter` double-applies the upsampling factor and produces 4×-too-large results that silently affect cones, DORI bands, and cable length labels.

Correct typed-scale formula:
    var pxPerM = 72 / (0.0254 * ratio);   // PDF-pts per real meter
NOT:
    var pxPerM = RENDER_SCALE * 72 / (0.0254 * ratio);   // WRONG — bug from Pass C

### Selection state — never assign selectedId / acSelectedId directly

When placing or selecting a camera or reader programmatically, always call `selectCamera(id)` or `selectReader(id)`. Never use bare assignment like `selectedId = id;`.

`selectCamera`/`selectReader` run side-effects that the UI depends on:
- `configureReachSlider(cam)` — sets slider unit/range/value for the new selection
- `openRightPanelForCamera(cam)` / `openRightPanelForReader(dev)` — populates and slides in the details panel
- `updateRightPanelDisplay(cam)` — updates Manufacturer/Model/Specs readouts
- Various redraws and DOM syncs

Bare assignment leaves the right panel desynced from the model. The UI shows stale data; user has to re-click the device for it to refresh. Bug from Pass C step 7.

### State change tracking — markDirty discipline

Pass D introduced `isDirty` for auto-save. Every user-driven state change must call `markDirty()`:

State changes that DO trigger markDirty:
- Camera/reader placement, deletion, drag-end, label/notes/mount/angle/FOV/reach/model edits
- Tab rename, tab typical-config save, tab delete
- Calibration save (typed or two-point)
- Head-end placement
- BOM custom-line add/edit/remove, BOM auto-override edit, BOM config input changes (when from user, not internal recalc)
- Project Info save

State changes that do NOT trigger markDirty (read-only navigation):
- switchPage / tab click
- Tier filter chip change in BOM
- BOM CSV export
- DORI / blind-spot / heatmap toggle
- Mode swap (cameras ↔ access)

When adding new state-change features, audit whether `markDirty()` should fire and add the call at the commit point of the change (after the data model update, before redraw).

### Cache discipline (Edge file:// URL caching)

Edge aggressively caches JavaScript loaded from `file://` URLs. After any code change, the procedure to test reliably is:

1. Close the browser tab entirely
2. Reopen the file from File Explorer (double-click `camera_markup_tool.html`)
3. Press Ctrl+Shift+R (hard reload, force-fetches everything from disk)

Without this, console may report functions as undefined, version numbers as the old value, and behavior as unchanged when the source actually IS updated. Always assume "it didn't take" diagnoses are cache before assuming code bugs. Verify via `typeof functionName` in console.

### Math constants — use existing ones

The codebase has these constants near the top of the script:
- `RENDER_SCALE` — PDF.js rendering upsample factor (currently 4)
- `FT_PER_METER` — 3.28084
- `DEFAULT_PIXELS_PER_METER` — 30 (Pass C; used when getPPM returns null)

Don't redefine them inline. If new code needs a similar constant, add it to the constants block, don't sprinkle it.

### JSON version bumps

Each pass that changes the save shape bumps the version literal in saveJSON. Current version chain:
- v8 — original
- v9 — pages[i].name (editable tabs, Pass A)
- v10 — sourceDocument with embedded PDF (Pass A.25)
- v11 — pages[i].typical multiplier config (Pass A.5)
- v12 — acDevices[i].notes editable (Pass A.8)
- v13 — cam.reachM in meters; calibration unit field (Pass C)

When bumping the version: read all older versions cleanly in `applyProjectState`. Default missing fields rather than rejecting the file. Add a one-time info banner if the migration is user-visible (e.g., reach values updated in Pass C).

