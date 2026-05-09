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