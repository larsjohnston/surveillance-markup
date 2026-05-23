# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after the Hardware Module merge (`48469ff` on main)._

---

## JUST SHIPPED (on main)

- **Hardware Module pass** (`48469ff`, M1–M5). Door Hardware is now a left-rail mode (key icon) with a home checklist canvas:
  - M1: all left-rail icons unified to filled inline SVG (camera/AC converted from PNG); added Hardware (key) mode + full-coverage home overlay (zoom suppressed + scroll save/restore in hardware mode).
  - M2: home canvas 6-row checklist with live status (door schedule / hardware schedule / RFQ / quotes / Price-the-Hardware launches wizard / Add-to-Proposal).
  - M3: removed the 4 hardware actions from the File menu (now on the canvas); kept Load/Clear Pricing; fixed 4 stale error strings to point at the canvas.
  - M4: customer-facing Hardware Schedule proposal page — SELL ONLY, after Riser before Plans, 2x2 presentation (line-by-line/lump-sum × separate/combined), excluded lines show "—", supply-only suppresses labour.
  - M5: export-modal Hardware Schedule checkbox + 2x2 controls; home row 6 wired (syncs with modal); resolution safeguard — must-acknowledge warning at export when lines are neither priced nor excluded, plus the wizard Step 5 unresolved-lines banner.
- Earlier: W8 (click-to-select + sums + non-cheapest flag + notes, `3ad1029`), W7 (supply-only + exclude + zero-labour warning, `03b87ed`), M3.5 wizard (`89cd2fe`).

---

## NEXT UP

_No active next pass — pick from Deferred. Natural candidates: the Hardware-Module follow-up cleanups (below), or a larger pass like Take-Off Pricing or the cross-tie data model._

---

## HARDWARE MODULE — FOLLOW-UP CLEANUPS (flagged during M4/M5)

- **Math-drift risk: shared sell-calc helper.** The M4 proposal page (`drawProposalHardwareSchedule`) re-implements per-row sell math instead of sharing the wizard Step 5 code. Same engine primitives so figures match today, but a future change to one could silently diverge. Extract a shared helper.
- **Row 5 home-canvas counts are pre-exclude.** "57 priced, 9 omissions" uses raw resolveAward; the wizard Summary applies the exclude filter. Make row 5 exclude-aware (show resolved/unresolved truthfully) — pairs naturally with the safeguard already on row 6.
- **Optional SKU column** on the customer Hardware Schedule. Currently description+finish only (SKU treated as installer-side). Some customers expect the spec'd model — add as an optional column if wanted.
- **Description truncation** at 56 chars (line-by-line separate mode) clips long door-schedule descriptions. Make configurable or widen if it bites.
- **Persist asymmetry:** hardware section toggle + 2x2 persist on-change; the other 5 export sections persist on-export (legacy). Unify if it causes confusion.
- **Empty-state vs missing-takeoff:** hardware section ON but no takeoff → renders a one-line notice. Decide whether to hide the section entirely instead.
- **Native confirm()** for the export safeguard gate — styled-modal upgrade is a future polish (matches W7/W8 native prompts).
- **Orphaned PNG assets** `./Icons/dome_camera.png` + `./Icons/access_reader.png` — no longer referenced after M1's SVG conversion; delete in a housekeeping pass.

---

## DEFERRED — DOOR HARDWARE

- **Cross-tie data model: door schedule <-> hardware schedule <-> floor plans** (known future architecture problem). A door on the floor plan ties to its door-schedule entry + hardware-schedule line(s) so the three imports share openings/keys. Today independent (PDF / CSV / canvas) with no linkage. Substantial data-model feature.
- **PO consolidation / tie-break.** Tied unit cost between two suppliers → default toward the supplier getting the larger overall dollar share (consolidate POs). Surfaces at PO-generation. Design Qs: define "larger share"; circularity; manual-override interaction.
- **Zero-match import guard.** Quote matching zero takeoff lines (BG ERP format) → warn "unsupported format, attach as reference" instead of a 0.00 / 0-coverage row.
- **Supplier ERP-format quote import (BG).** Fuzzy SKU reconciliation across vendor formats. Substantial own pass.
- **Suppliers import quotes directly into our database** (replaces the manual RFQ-email + CSV-import loop).
- **"Priced by others" -> Overlap subsection.** Auto-move by-others lines into a subsection under AC Overlap.
- **Take-Off Pricing pass** (big). Cost columns/totals on the Take-Off page, consuming the Pricing Foundation. Build real source-data/pricing.json from vendor books FIRST.
- **Price-book direct integration.** Removes Load/Clear Pricing from the File menu entirely.

---

## DEFERRED — OTHER MODULES

- **Switch Topology** (Cleanup #9B). Placed switches, two-tier camera->switch->CMVR cabling. Likely merges with Manual Cable Routing + Conduit.
- **Manual Cable Routing + Conduit.** User-drawn polyline paths replacing straight-line x multiplier; conduit per-segment flag → BOM conduit row.
- **Camera Details Panel Redesign** (Cleanup #8). Sliders with two-way canvas sync.
- **PDF scale-marker auto-recognition.** Select scale bar on PDF → extract calibration. OCR lib TBD.
- **Rules Page editor.**
- **Catalog imports** — LuxerOne / Doorbird / Hanwha.

---

## HOUSEKEEPING

- **Dead-code sweep.** Orphaned: `.lp-breadcrumb`, `.dhw-advisory`, `.dhw-award-summary.dhw-award-none`, `computeAutoCableRows()`, `_dhwRenderPricingAndLabour`, `.dhw-status-pill`/`-unawarded`/`-awarded`, `.dhw-line-override`, + the two orphaned PNG icon assets (above).
- **Stray untracked file** `PASS_DHW_M3_POLISH_BRIEF.md` in repo root — add or delete.
- **Process note:** Claude Code once committed a brief directly to `main` (W8). Watch for agent self-commits to main.
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** v1.7. Wizard + W7 + W8 + Hardware Module undocumented — update when stable.

---

## RESOLVED (removed from deferred)

- ~~Flag-annotation notes~~ — W8c.
- ~~AC-overlap line removal/exclude~~ — W7 Exclude.
- ~~Unpriced-warning on step indicator~~ — Hardware Module resolution safeguard (M5 + wizard Step 5 banner).
- ~~Standalone "M4 proposal pages"~~ — absorbed into the Hardware Module pass.
