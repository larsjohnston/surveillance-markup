# Surveillance Markup Tool

## What this is
Single-file browser-based tool for security camera placement, coverage analysis, BOM generation, and proposal export. Runs entirely client-side. Used by a security integrator to produce quick quotes and floor plan layouts for prospective customers.

## Files
- `camera_markup_tool.html` — the entire tool, ~140 KB, ~2700 lines, single file
- `lib/` — four external libraries (PDF.js + worker, jsPDF, SheetJS), loaded as `<script src>`
- `setup-windows.bat` / `setup-mac-linux.sh` — one-time scripts that fetch libs from cdnjs
- `README.md` — end-user deployment guide

## Architecture
- Vanilla JavaScript, no framework. Plain `<script>` block at the end of the HTML.
- One canvas element. Camera placements stored in a flat `cameras[]` array, each tagged with `page` index.
- PDF.js renders each page to an offscreen canvas at 4× scale; that canvas is drawn into the visible canvas at user's zoom level. Retina-aware via `devicePixelRatio`.
- Save/Load uses JSON files, not localStorage (autosave uses localStorage as recovery only).

## Major features built
- **PDF or PNG/JPG import** (drag-drop or file picker, multi-page PDFs become tabs)
- **Camera database** — 25 Eagle Eye + 19 Hanwha Wisenet models with real specs
- **Six camera styles** — Dome (red), Bullet (blue), Turret (cyan), Fisheye (green), PTZ (purple), LPR (amber). Each has a flat SVG icon and a distinct canvas rendering.
- **Brand picker UI** — three-tile grid (Custom / EE / HW). Clicking opens a modal with style filter chips and a grouped model list.
- **Scale calibration** — typed scale (`1/8" = 1'-0"`, `1:100`, etc.) or two-point click reference distance. Per-page calibration persisted in JSON.
- **DORI zones** (IEC 62676-4 standard) — colored bands inside the FOV cone showing Identification (250 ppm), Recognition (125), Observation (62), Detection (25). Math: `D = horizPx / (2 × targetPPM × tan(FOV/2))`.
- **Calibration-aware cones** — non-DORI cones reflect real-world coverage based on `cam.reachM` (meters) and page calibration. Slider in right panel adjusts per-camera reach with Reset to spec.
- **Mounting height + recommended tilt** — auto-calculated based on camera height and detection range.
- **Visualization modes** — Blind Spots overlay (mutually exclusive with Heatmap).
- **Cable run planner** — place an NVR head-end per page, cables auto-draw with length labels. Runs over 90 m flagged red (Cat6 PoE limit).
- **Bill of Materials drawer** — six sections (Cameras, Recording, Network, Cabling, Labor, Other), each with auto-rows + custom add-line. Live margin/tax/grand total. CSV export.
- **Storage calculator** — retention days × fps × codec × recording mode → Mbps, GB/day, TB needed, recommended drive count.
- **Multi-tier pricing** — each camera tagged Essential/Recommended/Premium; BOM has tier filter chips.
- **Site survey fields per camera** — mount type, power source, environment, conduit, hazards.
- **Project info modal** — client, address, ref number, date, valid-until, salesperson, scope.
- **Riser diagram** — auto-generated system one-line in proposal PDF. Pages become floor bands stacked by elevation. Head-end renders inside its band. Drag-and-drop tab reorder overrides smart-parse order.
- **Auto-save with recovery** — localStorage write every 30 s when dirty. Recovery prompt on PDF drop if recent autosave exists. Indicator in top bar shows save status. Beforeunload guard.
- **Proposal PDF export** — branded cover page, BOM with totals, riser diagram + equipment schedule, then floor plan pages with overlays. Saved with project name as filename.
- **Typical floor multiplier** — pages can be configured as "typical" representing N identical floors. Camera counts and cable lengths multiply in BOM and riser schedule.
- **Access control mode** — separate device type (Brivo readers). Mode toggle in top bar. Readers have their own right panel with editable label and notes.
- **Door Hardware wizard** — 4-step wizard (Import / Pricing / Labour / Summary). Vendor quote comparison (.csv + .xlsx via SheetJS), per-section + per-line markup/labour rules, AC-overlap filtering, supply-only toggle, exclude + security-contractor row toggles.

## Pending / known gaps
- **Pricing fields are blank by default.** User will populate camera and labor pricing in the database when they have updated info from their distributor.
- **Cable cost line** is a placeholder — user will provide cable cost per foot/meter later.
- **Head-end is data-only** — no selection, no right panel, no Delete key. Only "Place Head-End" mode + click to delete. Parking lot item for future first-class object treatment.

## Coding conventions used
- Courier New monospace UI, dark navy `#111827` headers with red `#c8202c` accent, white panels.
- IDs and class names: kebab-case (`bom-stat`, `model-row`, `tier-chip`).
- Functions: camelCase. Variables and state are `var` declarations at module scope, no `let`/`const` — keeps the file consistent with what was already there.
- All CSS in a single `<style>` block at the top. All JS in one `<script>` block at the bottom (plus a small library-detection script).
- No build step. Edit the HTML directly.

## Things I'd like to keep doing in this style
- Single-file HTML — must keep working when opened directly from disk by double-click. No frameworks, no bundler, no node_modules in the runtime.
- Library count stays at PDF.js + jsPDF + SheetJS only. Don't add new dependencies without asking.
- Every change to the tool gets tested by opening the HTML in a browser and trying it.

## Workflow notes
- Use `git add . && git commit` after meaningful changes for safe undo.
- The HTML file is large — favor targeted `str_replace` edits over rewrites.
- After any significant edit, do a JS syntax check: `node --check` on the script block.

**Local testing protocol.** Run `python -m http.server 8000` from the project folder and open http://localhost:8000/camera_markup_tool.html for testing. Do NOT open the HTML directly via file:// — Edge caches aggressively at file:// origins and creates phantom bugs where on-disk code disagrees with browser behavior. This has bitten us twice during the scale UI pass and cost real session time.

**Pre-commit check.** Before `git push`, verify HEAD is current: `git log -1 --oneline` should show the expected HEAD from the CC block (or the most recent merge). Never push directly to main — all commits go via branch + PR. If you notice a direct push happened, flag it immediately (even if the work is correct).

# General rules

These rules apply to every task in this project unless explicitly overridden.

## Rule 1 — Surgical changes

Touch only what you must. Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 2 — Read before you write

Before adding code, read exports, immediate callers, and shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a certain way, ask.

## Rule 3 — Match the codebase's conventions

Conformance beats personal taste inside this codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 4 — Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Surface uncertainty, don't hide it.

## Project context

- **Stack:** single-file vanilla HTML/JS/CSS tool. No build step. No framework. No package.json. No tests.
- **Main file:** `camera_markup_tool.html` — contains all CSS, HTML, and JS in one file.
- **Verification command:** `node --check` (on extracted script block). Browser-only; no test suite.
- **Run locally:** Serve via local HTTP — `python -m http.server 8000` from the project folder, then open http://localhost:8000/camera_markup_tool.html. See "Local testing protocol" at top.
- **Where things live:** Everything is in one file. Convention is `// ─── Section Name ───` comment dividers for navigation.
- **Conventions worth knowing:**
  - Vanilla JS, `var` declarations (not `let`/`const`). Match existing style.
  - No new dependencies. Vendored libs in `lib/`: pdf.js, jsPDF, SheetJS (xlsx.full.min.js). All loaded as local `<script src="./lib/...">`.
  - Save files use a single JSON version literal (currently v27). Bump on shape change.
  - State changes call `markDirty()` for auto-save tracking.
  - Selection uses `selectCamera(id)` / `selectReader(id)` — never bare assignment to `selectedId` / `acSelectedId`.

## Step report format

At the end of every step, output a single fenced markdown code block containing the complete step report. This is for the user to copy and paste back to their reviewer for verification. Use this exact structure:

Step reports that claim "Retained X" or "Kept Y" must be verified against actual diff, not against intent. If an element is described as retained, grep for it after the edit to confirm it still exists. The exp-warn near-miss in A.6 happened because the report described intended behavior while the code dropped the element — only caught by a follow-up grep.

## Step [N] — [short description]

### Files changed
- `<filepath>` — [N lines added, M removed]

### Changes
- Exact `old_str` / `new_str` pairs, or grep results showing what's being edited.

### Notes
- Retained: [elements/functions/variables that stayed in place]
- Dropped: [removed, not reachable elsewhere]
- New: [added]

---

### Notice modal stacking convention

**Any modal that fires while another modal is already open MUST:**
1. Live as a direct child of `<body>` in the HTML.
2. Use `z-index: var(--z-notice-modal)` (= 80) — higher than `.big-modal` (z-index:30).

Either half alone fails. A notice inside an existing modal's subtree is clipped by the parent's stacking context. A notice with z-index:30 loses to the open modal.

**Known modals that follow this pattern** (add any new one here AND to the CSS rule at `#sq-qty-lock-modal`):
- `#sq-qty-lock-modal` — Qty lock notice in SQ Materials
- `#dhw-colmap-modal` — Column-map confirmation during hardware quote import

**Diagnosis:** if a modal appears behind another modal, check (a) its DOM parent and (b) its z-index. Both must satisfy the above. Do NOT fix by re-parenting to the existing modal's subtree.

---

### Table and renderer redesign conventions

**Always read before writing any table redesign.** Before touching any wizard step table or renderer:
1. `grep -n` the FULL existing function and read it completely before writing a single line.
2. If porting a pattern from SQ to DHW (or vice versa), read the SQ equivalent in full first.
3. Capture every: column name, CSS class, helper function, icon source (grep it), sub-total pattern.

**Complete function bodies in briefs — never pseudocode.** A table renderer brief must contain the FULL replacement function: every column header, every row cell, every sub-total cell, every icon source (verified by grep), every CSS class (verified to exist). Pseudocode stubs, partial row builders, and "add X here" placeholders always produce broken output requiring multiple fix rounds.

**Column definitions use a COLS array.** Wizard table columns are defined as a module-scope array of `{key, label, defaultHidden}` descriptors — see `SQ_SUMMARY_COLS` (L21358) and `DHW_PRICING_COLS`. Never hardcode column lists inline. The array is the single source of truth for: (a) the column-filter popover checkboxes, (b) the table header `<th>`, (c) the data row `<td>`, (d) the sub-total row `<td>`. All four must be kept in sync.

**Column gating must wire all the way through.** When a column is hideable, the `show.colKey` flag must gate: the `<th>` in the header, the `<td>` in every data row, the `<td>` in the sub-total row, and the `leadingColspan` calculation. Missing any one causes cell misalignment.

**Sub-total `leadingColspan` = count of visible leading columns.** Always compute `leadingColspan` dynamically — start with the fixed column count (icon buttons etc.), then increment for each visible hideable leading column. Never hardcode the number.

**DHW table vs SQ table.** DHW wizard steps use `<table class="dhw-table">` (HTML table). SQ Materials/Labour use `.bom-row` CSS grid (`grid-template-columns: 75px minmax(200px,3fr) 60px 65px 65px 45px 70px 70px 70px 55px 24px`). Don't mix the two — DHW Pricing stays as `dhw-table`.

**Icons in row cells — always grep first.** Two categories:
- **Ghost row-action icons** (X exclude, SC camera): `border:none; background:none; color:#d1d5db` inactive → `#6b7280` hover → `#111827` active. SVG uses `fill:currentColor` so `color` drives the icon. No tile chrome, no border, no background. Two icons in ONE `<td>` cell (not separate columns).
- **Strip/tile icons** (mode buttons, tier tiles): grep the exact SVG path from the strip button — camera dome at L2227, access control at L2232. Never write icon SVG from memory.

**Mutually exclusive row toggles.** When two icon buttons are mutually exclusive (Exclude + Security Contractor), each setter clears the other on activate. Both write to `hardwareAward` sub-maps. Both call `markDirty()` + `renderDoorHardwareModal()`.

**Column filter popover reuses `.dhw-tools-popover` CSS** (L1253). Add a scoped position class (e.g. `.dhw-pricing-popover { position:absolute; top:calc(100% + 4px); left:0; z-index:20; }`) so it doesn't collide with the Summary step's popover. Use `mousedown` capture on `document` for outside-click close; remove the listener on close.

**Modal viewport overflow.** Fixed-position modals with a hard `min-width` can overflow narrow viewports. Use `min-width: min(Xpx, 96vw)` so the modal is clamped to the viewport on small windows while keeping its floor on larger ones.

**Table horizontal scroll — flex container gotcha.** When a table inside a flex child needs to scroll horizontally: the flex child needs `min-width:0` (overrides flex's default `min-width:auto` which prevents shrinking), and the table's containing block needs `min-width:max-content` so the table expands to its natural width rather than collapsing to the container's visible width. Both are required; either alone fails. Applied to: `#bom-scroll-wrap { min-width:0 }`, and `min-width:max-content` on `#bom-body`, `#sq-labour-body`, `#sq-summary-xlsx-host`, `#sq-step-materials`, `#sq-step-labour`, `#sq-step-summary`, `.dhw-step-content .dhw-section`.

---

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

### Drill-down arming vs model assignment

The Pass Left-Pane drill-down tile clicks ARM the next placement. They must not retroactively mutate the currently-selected camera. Use `armModel(key)` for arming-only paths (`lpPickCamerasBrand`, `lpPickCamerasStyle`, init IIFE). Use `pickModel(key)` only when the user explicitly chooses a model for an already-selected camera (modal click, future right-panel model swap).

Bug from Pass Left-Pane M2: `lpPickCamerasBrand` called `pickModel` and silently flipped a placed camera's model when the user clicked a different brand tile. The placed camera's label stayed `EAG-*` (labels are generated at placement time, not regenerated) while its `cam.model` flipped to a HWA SKU — invisible until the user re-clicked the placed camera and saw the wrong specs in the right panel.

Mental model:
- `armModel(key)` — arming-only. State + UI repaint. No `cam.*` mutation.
- `applyModelToSelected(key)` — mutation-only. Updates `selectedId`'s camera fields. No state/UI change.
- `pickModel(key)` — composite wrapper. Both of the above + closes the legacy modal.

When in doubt: tile-click handlers and init paths use `armModel`. Explicit "I am picking this model for the camera I have selected" gestures use `pickModel`.

### addCamera label increment timing

In `addCamera`, the post-placement increment of `inp-label.value` (for the next placement) must happen AFTER `selectCamera(id)` runs, not before. `selectCamera` populates the right panel's label input from `cam.label`. If the increment fires first, the input shows the next-up label while the just-placed camera holds the previous one — they don't match. Bug from Pass A.7 aux5.

Correct order in addCamera:
1. cameras.push({...label: label, ...})
2. selectCamera(id)
3. markDirty()
4. redraw(); updateList(); updateDoriInfo()
5. Then: increment inp-label.value for NEXT placement

### State change tracking — markDirty discipline

Pass D introduced `isDirty` for auto-save. Every user-driven state change must call `markDirty()`:

State changes that DO trigger markDirty:
- Camera/reader placement, deletion, drag-end, label/notes/mount/angle/FOV/reach/model edits
- Tab rename, tab typical-config save, tab delete
- Calibration save (typed or two-point)
- Head-end placement and deletion
- BOM custom-line add/edit/remove, BOM auto-override edit, BOM config input changes (when from user, not internal recalc)
- Project Info save
- Tab drag-reorder (sets tabOrder, then markDirty)

State changes that do NOT trigger markDirty (read-only navigation):
- switchPage / tab click
- Tier filter chip change in BOM
- BOM CSV export
- DORI / blind-spot / heatmap toggle
- Mode swap (cameras ↔ access)

When adding new state-change features, audit whether `markDirty()` should fire and add the call at the commit point of the change (after the data model update, before redraw).

### Cache discipline

The local testing protocol (HTTP server, see top of file) eliminates most cache issues. If you still see "it didn't take" behavior — function returns wrong value, version banner says old number, behavior unchanged after code change — the diagnostic order is:

1. Hard reload in the localhost tab (Ctrl+Shift+R)
2. Verify the loaded code matches disk via console: `typeof functionName` returns 'function', or paste a function's .toString() and grep for a known recent change
3. If still wrong, check that the local server is serving from the right folder (the python -m http.server output shows the cwd)

If testing via file:// for any reason (don't, but if forced): close tab, reopen from File Explorer, hard-reload. Edge caches file:// origins aggressively. This cost us two debug rounds during Pass Scale UI.

### Math constants — use existing ones

The codebase has these constants near the top of the script:
- `RENDER_SCALE` — PDF.js rendering upsample factor (currently 4)
- `FT_PER_METER` — 3.28084
- `DEFAULT_PIXELS_PER_METER` — 30 (Pass C; used when getPPM returns null)
- `RISER_EMPTY_BAND_PT` / `RISER_MAX_BAND_PT` — Pass A.7 band height caps

Don't redefine them inline. If new code needs a similar constant, add it to the constants block, don't sprinkle it.

### JSON version bumps

Each pass that changes the save shape bumps the version literal in saveJSON. Current version chain:
- v8 — original
- v9 — pages[i].name (editable tabs, Pass A)
- v10 — sourceDocument with embedded PDF (Pass A.25)
- v11 — pages[i].typical multiplier config (Pass A.5)
- v12 — acDevices[i].notes editable (Pass A.8)
- v13 — cam.reachM in meters; calibration unit field (Pass C)
- v14 — tabOrder manual riser order override (Pass A.7)
- v25 — Pricing Cloud (pricingBook, upload modal, fetch)
- v26 — Credentials wiring (projectInfo.credentials.brivoSkus)
- v27 — DHW Revamp M6 (legacy labour fields removed; securityContractor field added)

When bumping the version: read all older versions cleanly in `applyProjectState`. Default missing fields rather than rejecting the file. Add a one-time info banner if the migration is user-visible (e.g., reach values updated in Pass C).

### Dev quiet flag (testing convenience)

To suppress both the auto-calibration prompt and the autosave recovery prompt during development:

    localStorage.setItem('dev_quiet', '1')   // enable
    localStorage.removeItem('dev_quiet')      // disable

Persists across reloads. Init reads the flag and sets `SUPPRESS_AUTO_CALIBRATION_PROMPT` and `SUPPRESS_AUTOSAVE_RECOVERY` accordingly. Edge case: `loadProjectFromFile`'s finally block resets both flags after a v10+ save load; reload the page to re-enable dev_quiet after loading a project file.

## How to talk to me

- No preamble, affirmations, or restating my question. Go straight to the answer.
- Bullet points or short prose. No long explanations.
- No closing summary unless I ask. No disclaimers unless the topic genuinely needs one.
- Make a recommendation on every open decision — don't hand me a menu.
- **Output format to user: ONLY (a) the exact paste-ready block for Claude Code in a fenced code block, and (b) blocking questions. No recap, no rationale, no closing summary unless I ask.**
- **All Claude Code instructions go in fenced code blocks (```), never prose. Every CC block opens with `[HEAD: <hash> | branch | tree]`.**
- **One question at a time when possible. Three max per turn. Only ask blocking questions — if the answer is in CLAUDE.md, QUEUE.md, prior content, or inferable, just decide.**
- If I say "give me one instruction to paste" — that's a single self-contained block, no preamble in the box.
- If I paste something obviously stale or contradictory from another chat, flag it before acting on it.
- **When CC edits are followed by commands:** Separate the CC block from any follow-up PowerShell/DevTools commands into distinct fenced code blocks. Label each block: "CC block:" and "In PowerShell:" / "In DevTools Console:". Never mix edits and commands in one fenced block.
- **Secrets never appear in chat.** If a secret leaks, tell me to rotate immediately and walk me through `wrangler secret put` to do so.
- When diagnosing failures, ask for the SPECIFIC error string + HTTP status + response body. Don't guess from stack traces alone. Network tab Response body and `wrangler tail` are the diagnostic tools.
- Tell me explicitly when a command goes in PowerShell vs DevTools Console.
- **EVERY Claude Code instruction is ONE fenced code block, period.** Multi-edit tasks use `old_str: / new_str:` pairs numbered 1–N. No prose scaffolding before the block. Block opens with `[HEAD: <hash> | branch | tree]`. This is default behavior, never ask or wait for permission.
- **CRITICAL: Code blocks for Claude Code must be ONE continuous fence, period.** From `[HEAD: <hash> | branch | tree]` to the final line, everything goes between a single pair of triple backticks. NO internal fence breaks, NO markdown section dividers inside the fence, NO line that contains ``` except the opening and closing markers. If a block would exceed readability, restructure the content (condense comments, use numbered str_replace pairs, omit explanatory prose) — never split into multiple fenced blocks. Before outputting any CC instruction, verify: opening ```, then all content, then closing ``` with nothing between them. One fence only.
- **Table/renderer redesigns require complete function bodies in the brief, never pseudocode.** Before briefing CC on any table, wizard step, or renderer change: (1) grep for and read the FULL existing function, (2) grep for and read the SQ/DHW equivalent if porting a pattern, (3) capture every column name, CSS class, helper function, and icon source via grep before writing a single line of the brief. The brief must contain a complete replacement function — every column header, every row cell, every sub-total cell, every icon source (verified by grep), every CSS class (verified to exist). Pseudocode stubs, partial row builders, and "add X here" placeholders are banned. If the function is too long to write completely, split into smaller milestone briefs — never ship a partial implementation.
