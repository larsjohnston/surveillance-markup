# Smart Building Markup & Quoting Tool

## What this is
Single-file, browser-based tool for quoting and laying out multifamily building systems: security cameras, access control, intercoms, parcel lockers, mailbox banks, smart suites + in-unit IoT, and door hardware. Takes floor plans / door + hardware schedules / architectural drawings and produces a complete package: branded cover, customer-facing Bill of Materials, integrator-facing Take-Off, riser diagram, marked-up floor plans, and price quotes. Runs entirely client-side. Built for the integrator Smart MF; destined to become a standalone web-hosted subscription SaaS for other integrators.

## Files
- `camera_markup_tool.html` — the entire tool, ~140 KB+, single file (CSS in one `<style>`, JS in one `<script>`). Filename is legacy; scope is no longer camera-only.
- `lib/` — external libraries (PDF.js + worker, jsPDF), loaded as `<script src>`.
- `setup-windows.bat` / `setup-mac-linux.sh` — one-time scripts that fetch libs from cdnjs.
- `README.md` — end-user deployment guide.
- `QUEUE.md` — canonical manually-maintained work queue.
- `source-data/` — gitignored vendor price books + hand-curated `pricing.json`.

## Architecture
- Vanilla JavaScript, no framework. `var` only (no `let`/`const`). Plain `<script>` block at the end of the HTML.
- One canvas. Devices stored in flat arrays tagged with `page` index (`cameras[]`, `acDevices[]`, plus smart-apartment / suite arrays).
- PDF.js renders each page to an offscreen canvas at `RENDER_SCALE` (4×); drawn into the visible canvas at user zoom. Retina-aware via `devicePixelRatio`.
- Save/Load uses JSON files (localStorage is autosave/recovery only).
- Mode-based UI. Modes: `cameras`, `access`, `intercom`, `parcel`, `mailbox`, `suite`. Door Hardware is a separate wizard (DHW). Section dividers: `// ─── Section Name ───`.

## Major features built
- PDF / PNG / JPG import (drag-drop or picker; multi-page PDFs → tabs).
- Camera database (Eagle Eye + Hanwha Wisenet, real specs); six styles (Dome/Bullet/Turret/Fisheye/PTZ/LPR) with flat SVG icons + distinct canvas renders.
- DORI zones (IEC 62676-4), calibration-aware cones, mounting height + recommended tilt, blind-spot/heatmap overlays.
- Scale calibration (typed `1/8"=1'-0"` / `1:100` or two-point click), per-page, persisted.
- Cable run planner (head-end per page; >90 m flagged red).
- Access Control (Brivo readers/controllers, category/subcategory metadata).
- Intercoms, parcel lockers, mailbox banks (cols×rows), smart Suites + per-unit-type in-unit IoT (smart lock / thermostat / water sensor).
- Door Hardware Wizard (import → price → award → markup → schedule) with §-classifier.
- Security Quote drawer (centered 2/3 modal; internal priced workspace; one `computeBomTree()` feeds drawer + PDF + CSV; two-tier Essential/Recommended/Premium; storage calculator; margin/tax/totals; CSV export).
- Riser diagram (auto one-line; pages → floor bands by elevation; drag-reorder override via `tabOrder`).
- Auto-save + recovery, typical-floor multiplier, project info modal.
- Proposal PDF export: branded cover / customer BOM (Qty·SKU·Description, no pricing) / integrator Take-Off / riser + schedule / floor-plan markups.
- Pricing Foundation: File-menu Load/Clear Pricing → localStorage `'pricingBook'`; status banner; read helpers `getPricingBook()`, `getUnitPrice(sku)`, `isPricingLoaded()`.

## Pending / known gaps
- **$0-cover HARD DEPENDENCY.** Customer BOM is price-free; `drawProposalCover` sums `computeBomTree()` × margin/tax = $0 until pricing lands. Do NOT ship a client proposal until the pricing pass OR the cover-redesign ($0-hide) lands.
- **Pricing rendering not wired** — foundation exists; cost columns/totals are the next big pass ("Take-Off Pricing"). Promote `sku` to a first-class material field first.
- **Reader→controller wiring deferred** — `acDevices[]` has no `controllerId`; AC riser is a *placement* diagram, not a wiring diagram. Don't fake links from spatial proximity.
- Stale UI/branding strings: `help-version` still reads "Surveillance Markup Tool"; `APP_VERSION = '0.5'`.

## Coding conventions
- IDs/classes kebab-case (`bom-stat`, `model-row`, `tier-chip`). Functions camelCase. `var` at module scope.
- On-screen UI: dark navy `#111827` headers, red `#c8202c` accent, white panels. Fonts via CSS vars `--font-ui` (system-ui sans) and `--font-mono`. (Old "Courier New everywhere" is obsolete.)
- PDF export uses Helvetica, not Courier; SMART-MF branded.
- **Tiles with flat icons over dropdowns everywhere possible.** Consistency across every module is mandatory.
- Left-pane drill-down: tiered tiles with static section headers in the pattern `<Mode> <Tier-role>` (e.g. `Camera Manufacturers` / `Camera Styles` / `Camera Models` / `Camera Accessories`). Selection shown by tile highlight — no "Selected: X → Y" breadcrumb.
- Left-pane style tiles must draw from the same icon source as the canvas markers (same silhouette in pane and on plan).
- All CSS in one `<style>` block; all JS in one `<script>` block. No build step. Edit the HTML directly.

## Keep doing in this style
- Single-file HTML; must keep working opened directly from disk (double-click) AND via local HTTP. No frameworks, no bundler, no node_modules at runtime.
- Library count stays PDF.js + jsPDF only. Ask before adding any dependency.
- Every change tested in a browser.

## Workflow
- Relay model: planning Claude produces paste-ready blocks for Claude Code; user pastes CC responses back. Terse, recommend on every open decision.
- Open every CC block with a resync anchor: `[HEAD: <hash> | branch | tree]` (raw-terminal + CC git drift has caused collisions).
- Commit per milestone after each browser review — don't ride uncommitted milestones.
- Fold the pass-brief filename into that pass's final commit (briefs have dangled untracked otherwise).
- `git add . && git commit` after meaningful changes for safe undo.
- HTML is large — favor targeted `str_replace` over rewrites. After any significant edit: `node --check` on the script block.
- QUEUE.md is canonical. At the end of any chat that changes the queue, remind the user to update it and offer to regenerate for paste.

**Local testing protocol.** Run `python -m http.server 8000` and open http://localhost:8000/camera_markup_tool.html. Do NOT open via `file://` — Edge caches `file://` origins aggressively and creates phantom bugs (bit us twice in the scale-UI pass).

# General rules
Apply to every task unless explicitly overridden.

## Rule 1 — Surgical changes
Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style.

## Rule 2 — Read before you write
Read exports, immediate callers, and shared utilities first. "Looks orthogonal" is dangerous. If unsure why code is structured a certain way, ask.

## Rule 3 — Match the codebase's conventions
Conformance beats personal taste here. If a convention is genuinely harmful, surface it — don't fork silently.

## Rule 4 — Fail loud
"Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any were skipped. Surface uncertainty.

## Project context
- **Stack:** single-file vanilla HTML/JS/CSS. No build, no framework, no package.json, no tests.
- **Verification:** `node --check` on the extracted script block. Browser-only; no suite.
- **Run locally:** local HTTP only (see protocol above).
- **Conventions worth knowing:**
  - Vanilla JS, `var` (not `let`/`const`).
  - No new deps; CDN libs pdf.js + jsPDF only.
  - Save files use a single JSON version literal in `saveJSON` (this copy: **v18**; QUEUE indicates v19 shipped on main). Always read the literal before assuming. Bump on shape change.
  - State changes call `markDirty()`.
  - Selection via `selectCamera(id)` / `selectReader(id)` — never bare assignment.

## Step report format
End every step with one fenced markdown block (for the user to paste to their reviewer). Sections, all required (write "N/A" if not applicable, don't omit):

- **## Step [N] — [short description]**
- **### Files changed** — `<filepath>` — [N added, M removed]
- **### Code sites touched** — table: Site | Before | After
- **### Decisions made** — where the brief left a choice; option + reason + alternative. List only non-trivial decisions.
- **### Behavior NOT changed** — what the brief might imply but you left alone + why.
- **### Risks / things to watch** — be candid.
- **### Syntax check** — node --check: PASS/FAIL.
- **### Console smoke test** — paste-able DevTools lines (preferred for data/math changes).
- **### Manual browser test list** — action → expected outcome.
- **### What's next** — Step [N+1] handles: …

**Verify "Retained X / Kept Y" against the actual diff with grep, not against intent.** The exp-warn near-miss in A.6 happened because the report described intended behavior while the code dropped the element — caught only by a follow-up grep.

# Codebase conventions and known pitfalls
Each entry exists because someone made this mistake before. Read at the start of every session.

### Reader-to-controller cable lines are deferred
Riser shows readers/controllers as placement icons inside floor bands (Pass N). It does NOT draw lines between them; no C-NN cable ID for reader runs. The data link (which controller a reader wires to) doesn't exist — `acDevices[]` has no `controllerId`. Spatial-nearest produces wrong wiring that looks authoritative. A future pass (N.5) adds the assignment model + runs together. Until then: AC riser is placement, not wiring.

### Calibration math — pixelsPerMeter convention
`calibrations[pageIdx].pixelsPerMeter` is **PDF-points-per-meter**, not offcanvas-pixels-per-meter. Render-time consumers (`drawCamCone`, `getCameraReachPx`, `cableLengthM`) multiply by `viewScale` at draw time. Do NOT include `RENDER_SCALE` — it double-applies the upsample (4×-too-large cones/DORI/cable labels). Bug from Pass C.

    var pxPerM = 72 / (0.0254 * ratio);   // CORRECT — PDF-pts per real meter
    var pxPerM = RENDER_SCALE * 72 / (0.0254 * ratio);   // WRONG

### Selection state — never assign selectedId / acSelectedId directly
Always call `selectCamera(id)` / `selectReader(id)`. They run side-effects the UI depends on: `configureReachSlider`, `openRightPanelForCamera/Reader`, `updateRightPanelDisplay`, redraws, DOM syncs. Bare assignment leaves the right panel desynced (stale data until re-click). Bug from Pass C step 7.

### Drill-down arming vs model assignment
Left-pane tile clicks ARM the next placement; they must not mutate the currently-selected device.
- `armModel(key)` — arming-only. State + UI repaint. No `cam.*` mutation. Use for tile-click handlers + init paths.
- `applyModelToSelected(key)` — mutation-only. Updates `selectedId`'s fields. No state/UI change.
- `pickModel(key)` — composite (both + closes legacy modal). Use only for explicit "pick this model for the selected device" gestures.

Bug from Pass Left-Pane M2: `lpPickCamerasBrand` called `pickModel` and silently flipped a placed camera's model on brand-tile click; label stayed `EAG-*` while `cam.model` flipped to a HWA SKU — invisible until re-click.

### addCamera label increment timing
In `addCamera`, increment `inp-label.value` for the next placement AFTER `selectCamera(id)`, not before. `selectCamera` populates the right panel's label input from `cam.label`; incrementing first shows the next-up label while the placed camera holds the previous one. Bug from Pass A.7 aux5. Order: push → selectCamera → markDirty → redraw/updateList/updateDoriInfo → then increment.

### State change tracking — markDirty discipline
Every user-driven state change calls `markDirty()` at the commit point (after data update, before redraw).
DO fire: device placement/deletion/drag-end/edits (label/notes/mount/angle/FOV/reach/model); tab rename/typical-config/delete; calibration save; head-end place/delete; BOM custom-line add/edit/remove, auto-override edit, config input changes (user-driven); project info save; tab drag-reorder.
Do NOT fire (read-only nav): switchPage/tab click; tier filter chip; BOM CSV export; DORI/blind-spot/heatmap toggle; mode swap.

### Cache discipline
Use the HTTP server, not `file://`. If a change "didn't take": (1) hard reload (Ctrl+Shift+R); (2) verify loaded code via console (`typeof functionName`, or `.toString()` grep); (3) check the server is serving the right folder. Edge `file://` caching cost us two debug rounds in Pass Scale UI.

### Math constants — use existing ones
Near the top of the script: `RENDER_SCALE` (4), `FT_PER_METER` (3.28084), `DEFAULT_PIXELS_PER_METER` (30), `RISER_EMPTY_BAND_PT` / `RISER_MAX_BAND_PT`. Don't redefine inline; add new shared constants to the block.

### JSON version bumps
One literal in `saveJSON`; bump on shape change. In `applyProjectState` read all older versions cleanly — default missing fields, never reject. Add a one-time info banner if migration is user-visible. Chain:
- v8 original · v9 page names · v10 embedded PDF · v11 typical multiplier · v12 acDevices notes · v13 reachM + calibration unit · v14 tabOrder
- v15 AC device category/subcategory metadata (Pass Left-Pane)
- v16 smart-apartment devices + suite tracking (Pass N+1 M1)
- v17 mailbox shape → brand+cols+rows (Catalog-Tier1)
- v18 Door Hardware M1 module state (`doorHardware`)
- v19 IoT expansion (gateway/keypad/passageSet) — per QUEUE, shipped on main `43fdd4a`; not in this file copy

### Pricing data — load path
Vendor books live in gitignored `source-data/`. `pricing.json` (hand-curated, schema-versioned, `PRICING_SCHEMA_VERSION = 1`) loads via File-menu picker → localStorage `'pricingBook'` (file:// can't auto-load a sibling JSON). Read via `getPricingBook()` / `getUnitPrice(sku)` / `isPricingLoaded()`. Pricing pass must promote `sku` to a first-class material field to key the lookup.

### Dev quiet flag
`localStorage.setItem('dev_quiet','1')` suppresses auto-calibration + autosave-recovery prompts; `removeItem` disables. `loadProjectFromFile`'s finally block resets both flags after a v10+ load — reload to re-enable.