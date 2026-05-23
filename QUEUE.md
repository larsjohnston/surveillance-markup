# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after the W8 merge (`3ad1029` on main)._

---

## JUST SHIPPED (on main)

- **Door Hardware W8 — Comparison click-to-select + sums + non-cheapest flag + notes** (`3ad1029`).
  - Best-by-Line: replaced the supplier dropdown with click-to-select price cells (cheapest pre-selected implicitly, one green cell = selected, click-selected is a no-op, click cheapest deletes the override entry, gaps not selectable). Staging/confirm-on-Continue unchanged.
  - Step 1 polish: "Award whole package" buttons relabeled "ALL"; Unawarded/Awarded status pill removed; Comparison defaults to Best-by-Line view; Hardware-step no-selection placeholder reworded + bold.
  - Per-supplier column sums + blended best-line total merged into one "Totals:" footer row.
  - Non-cheapest flag (count + extra cost vs cheapest) below the table; ties don't count (strict >); gaps excluded.
  - Per-line notes panel opened from the flag (the long-deferred flag-annotation feature). New persisted `hardwareAward.lineNotes` object map; internal-only, never customer-facing.
- **Door Hardware W7** (`03b87ed`): supply-only toggle, per-line Exclude (Excluded section on Summary), zero-labour warning.
- **Door Hardware M3.5 wizard** (`89cd2fe`): 5-step manager wizard.

---

## NEXT UP

_Nothing queued as the active next pass — pick from Deferred below._

---

## DEFERRED — DOOR HARDWARE

- **M4 — Door Hardware proposal pages.** Customer-facing Hardware Schedule page (sell only — never cost/markup/supplier; reuse riser table/overflow), Door Schedule reference page (rasterize attached PDF via pdf.js, mirroring sourceDocument). 2 proposalSections toggles. The includeLabour column-combine toggle drives separate-vs-combined labour presentation on the customer proposal. Open Q: where the Hardware Schedule sits in proposal order. NOTE: the W8 lineNotes are internal — M4 decides if/how any of them surface.
- **PO consolidation / tie-break.** When best-line awarding finds two suppliers tied on a line's unit cost, default toward the supplier receiving the larger overall dollar share of the job (consolidate POs vs split for no savings). Surfaces at PO-generation. Design Qs: define "larger share" (total $ / line count / coverage); circularity (tie-break depends on totals which depend on tie-breaks); interaction with manual per-line override. W8's non-cheapest flag + column sums are related context. Part of a future PO pass.
- **Zero-match import guard.** When an imported quote matches zero takeoff lines (e.g. BG ERP-format file), warn "unsupported format — attach as reference" instead of creating a confusing 0.00 / 0-coverage row.
- **Supplier ERP-format quote import (BG).** Fuzzy SKU reconciliation across vendor formats. Real BG fixture is supplier ERP format (different columns, SKU notation like FALC-T581P6DAN626 vs takeoff's T581CP6 DAN). Substantial own pass.
- **"Priced by others" -> Overlap subsection.** Move by-others lines out of the main hardware flow into a subsection under AC Overlap. (Manual Exclude from W7 partly covers the workflow; this is the automatic by-others move.)
- **Take-Off Pricing pass** (big). Cost columns/totals on the Take-Off page, consuming the Pricing Foundation. Build real `source-data/pricing.json` from vendor books FIRST.

---

## DEFERRED — OTHER MODULES

- **Switch Topology** (Cleanup #9B). Placed switches, two-tier camera->switch->CMVR cabling. Likely merges with Manual Cable Routing + Conduit.
- **Manual Cable Routing + Conduit.** Replace straight-line x multiplier cable model with user-drawn polyline paths. Add conduit as per-segment flag feeding a BOM conduit auto-row. Open Qs: click-vs-draw UX, wall-snap, conduit catalog, cable tray, multiplier fallback, backwards compat.
- **Camera Details Panel Redesign** (Cleanup #8). Sliders with two-way canvas sync.
- **PDF scale-marker auto-recognition.** User selects scale bar on imported PDF, tool extracts calibration. Open Qs: OCR library (Tesseract.js?), scale bars vs ratios, graphic-only bars, per-page scales, user-assisted vs full auto.
- **Rules Page editor.**
- **Catalog imports** — LuxerOne / Doorbird / Hanwha.

---

## HOUSEKEEPING

- **Dead-code sweep.** Orphaned: `.lp-breadcrumb`, `.dhw-advisory`, `.dhw-award-summary.dhw-award-none`, `computeAutoCableRows()`, `_dhwRenderPricingAndLabour` (wizard-orphaned), `.dhw-status-pill` / `.dhw-status-unawarded` / `.dhw-status-awarded` (W8-orphaned after pill removal), `.dhw-line-override` (W8a-orphaned after dropdown removal).
- **Stray untracked file** `PASS_DHW_M3_POLISH_BRIEF.md` in the repo root — never committed. Add it or delete it to clear the status noise.
- **Process note:** during W8, Claude Code committed the W8 brief directly to `main` (75244c5) instead of leaving commits to the user — reconciled via a merge. Watch that the agent doesn't push/commit to main on its own.
- **Install LibreOffice** on the Windows machine — kills the recurring docs-PDF regen caveat (docx is canonical; PDF stale).
- **User guide** currently v1.7. Door Hardware wizard + W7 + W8 not yet documented — update when the module stabilizes.

---

## RESOLVED THIS SESSION (removed from deferred)

- ~~Flag-annotation notes~~ — shipped in W8c.
- ~~Unpriced-hardware warning on step indicator~~ — largely subsumed by W7 Exclude (a line is now either priced or explicitly excluded); revisit only if the by-others subsection work resurfaces a need.
- ~~AC-overlap line removal/exclude~~ — subsumed by W7 per-line Exclude.
