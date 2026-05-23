# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after the menu/panel/camera cleanup stretch (main around `2f672a1`)._

---

## JUST SHIPPED (on main)

- **Menu + panel + camera cleanup stretch** (multiple small branches merged):
  - Menus: removed File-menu pricing (Load/Clear) entries; View-menu Equipment Labels → top-level with hover-flyout children; removed the Tool menu entirely (Place head-end already a tile; Scale tool → new ruler icon top-right beside the eye).
  - Left panels: camera models list → 5-wide tile grid (name only, spec on hover tooltip); removed all always-visible placement hints (all modes); removed per-page placed-device lists (all modes — selection/delete now canvas-only); removed AC Technology dropdown (defaults Dual-tech; right-pane control still changes it); removed the DORI Range panel section (View-menu DORI toggle is canonical).
  - Camera accessories: added a **Network** tile beside CMVR/NVR — places a network switch on the canvas (place / drag-to-move / click-to-delete-armed / save-reload persist; minimal positional model, no SKU/topology yet).
- **Hardware Module** (`48469ff`), **W8** (`3ad1029`), **W7** (`03b87ed`), **M3.5 wizard** (`89cd2fe`) — Door Hardware module complete with customer proposal output + resolution safeguard.

---

## NEXT UP

_No active next pass — pick from Deferred._

---

## HARDWARE MODULE — FOLLOW-UP CLEANUPS (flagged during M4/M5)

- **Math-drift risk: shared sell-calc helper** — M4 proposal page re-implements per-row sell math vs. the wizard Step 5; extract a shared helper.
- **Row 5 home-canvas counts are pre-exclude** — make exclude-aware to match the wizard / resolution safeguard.
- **Optional SKU column** on the customer Hardware Schedule (currently description+finish only).
- **Description truncation** at 56 chars (line-by-line separate) — make configurable.
- **Persist asymmetry** — hardware section + 2x2 persist on-change; other 5 export sections persist on-export. Unify if confusing.
- **Empty-state vs missing-takeoff** on the proposal page — decide whether to hide the section entirely when no takeoff.
- **Native confirm()** for the export safeguard gate — styled-modal upgrade is future polish.

---

## DEFERRED — DOOR HARDWARE

- **Cross-tie data model: door schedule <-> hardware schedule <-> floor plans** (known future architecture problem). The three imports should share openings/keys.
- **PO consolidation / tie-break** — tied unit cost → default toward the supplier getting the larger overall dollar share.
- **Zero-match import guard** — quote matching zero takeoff lines → warn "unsupported format, attach as reference."
- **Supplier ERP-format quote import (BG)** — fuzzy SKU reconciliation across vendor formats.
- **Suppliers import quotes directly into our database** (replaces RFQ-email + CSV-import loop).
- **"Priced by others" -> Overlap subsection** — auto-move by-others lines under AC Overlap.
- **Take-Off Pricing pass** (big) — cost columns/totals on Take-Off, consuming the Pricing Foundation. Build real source-data/pricing.json first.
- **Price-book direct integration** — its own module (the reason File-menu pricing was removed); will fully replace Load/Clear Pricing.

---

## DEFERRED — OTHER MODULES

- **Switch Topology** (Cleanup #9B) — NOW PARTIALLY STARTED: the Network switch tile (place/drag/delete/persist) shipped in the cleanup stretch with a minimal positional model (no SKU, no ports, single-per-page, no right-panel). The full pass extends this: camera->switch->CMVR two-tier cabling, multi-switch-per-page (switches[pageIdx] → array), switch selection + right-panel, drag already done. Likely merges with Manual Cable Routing + Conduit.
- **Manual Cable Routing + Conduit** — user-drawn polyline paths replacing straight-line x multiplier; conduit per-segment flag → BOM conduit row.
- **Camera Details Panel Redesign** (Cleanup #8) — sliders with two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar on PDF → extract calibration. OCR lib TBD.
- **Rules Page editor.**
- **Catalog imports** — LuxerOne / Doorbird / Hanwha.

---

## HOUSEKEEPING

- **`switches` (and `headends`) don't reset on raw PDF re-import** — pre-existing pattern; loading PDF B after placing on PDF A keeps stale positions referencing invalid page indices. Should reset in loadPDF. Pre-existing bug, flagged during the switch work.
- **Dead-code sweep.** Orphaned CSS/JS accumulated: `.lp-breadcrumb`, `.dhw-advisory`, `.dhw-award-summary.dhw-award-none`, `computeAutoCableRows()`, `_dhwRenderPricingAndLabour`, `.dhw-status-pill`/`-unawarded`/`-awarded`, `.dhw-line-override`, `.tier3-row`, `.hint`/`.reader-hint` (removed-element rules), `#dori-info*`, the orphaned PNG icon assets (dome_camera.png / access_reader.png), and the various null-safe no-op list renderers (updateList/updateAcList/etc.) + updateDoriInfo + updateReaderVariant call sites left as no-ops.
- **Stray untracked file** `PASS_DHW_M3_POLISH_BRIEF.md` in repo root — add or delete.
- **Process note:** Claude Code once committed a brief directly to `main` (W8). Watch for agent self-commits to main.
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** v1.7 — wizard + W7 + W8 + Hardware Module + the cleanup-stretch UI changes all undocumented; update when stable.

---

## RESOLVED (removed from deferred)

- ~~Flag-annotation notes~~ — W8c.
- ~~AC-overlap line removal/exclude~~ — W7 Exclude.
- ~~Unpriced-warning on step indicator~~ — Hardware Module resolution safeguard.
- ~~Standalone "M4 proposal pages"~~ — absorbed into Hardware Module.
- ~~Camera placed-list / hints / DORI panel section~~ — removed in the cleanup stretch.
