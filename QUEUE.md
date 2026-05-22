# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated after the M3.5 wizard merge (`89cd2fe` on main)._

---

## JUST SHIPPED (on main)

- **Door Hardware M3.5 — 5-step Manager Wizard** (`89cd2fe`, merged from `dhw-wizard`, 17 commits `844a196`->`89cd2fe`).
  - 5-step flow: Comparison -> Hardware -> AC Overlap -> Labour -> Summary. Clickable step indicator, Back/Continue/Save nav.
  - Comparison: By Supplier (centered cost, Omissions count, Best Price blended-total row) + Best by Line (per-supplier columns, green-best, manual per-line supplier override). Award confirms on Continue; per-line picks stage without confirming; explicit Award buttons confirm instantly.
  - Hardware: awarded list + Project Markup (default + per-line override) + editable Unit sell with two-way markup back-calc.
  - AC Overlap: advisory relocated.
  - Labour: per-line install hours, hourly rate, include-labour-as-column-combine toggle.
  - Summary: full internal detail, per-line Total column, sums row, items-not-priced count, Project Totals box (Hardware/Labour/Total/Expected Hours/Expected Margin/Expected Gross Margin), table tools under a Columns popover (sort, per-column filter, row hide, show-only-flagged/gaps, column show/hide — all viewing lenses, totals always reflect all lines).
  - Tab/Enter column-down keyboard nav across all editable fields. Sticky navy table headers. Tinted section bands. Humanized tooltips + fixed FLAGS info-icon. Markup default-50 bug fixed (root cause: normalizer fallback was 0).

---

## NEXT UP

### W7 — Supply-only + Exclude + Zero-labour warning (interdependent batch, brief drafted)
Ship together — the zero-labour warning depends on exclude existing.
1. **Supply-only toggle** (Step 4, above hourly rate): ON hides labour table + hourly rate, shows "Supply Only" notice, labour excluded from all totals. Persisted `hardwarePricing.supplyOnly`, default false.
2. **Exclude** (Step 2 Hardware, per-line, ANY line, reversible): excluded lines removed from the hardware schedule + dropped entirely from cost/sell/labour totals. New "Excluded" section at the bottom of Step 5, ABOVE the Project Totals box, showing line identifiers only (Qty/SKU/Description/Finish). State on `hardwareAward.excluded` (Set/map of matchKeys, additive, backfill empty).
3. **Zero-labour warning** (bottom of Step 4): warning + highlight those rows. Counts ONLY priced lines that are NOT excluded AND NOT supply-only. Suppressed entirely when supply-only is ON.

---

## DEFERRED — DOOR HARDWARE

- **M4 — Door Hardware proposal pages.** Customer-facing Hardware Schedule page (sell only — never cost/markup/supplier; reuse riser table/overflow), Door Schedule reference page (rasterize attached PDF via pdf.js, mirroring sourceDocument). 2 proposalSections toggles. The includeLabour column-combine toggle drives separate-vs-combined labour presentation on the customer proposal. Open Q: where the Hardware Schedule sits in proposal order.
- **PO consolidation / tie-break** (NEW this session). When best-line awarding finds two suppliers tied on a line's unit cost, default toward the supplier receiving the larger overall dollar share of the job (consolidate POs vs split for no savings). Surfaces at PO-generation. Design Qs: define "larger share" (total $ / line count / coverage); handle circularity (tie-break depends on totals which depend on tie-breaks); interaction with manual per-line override. Part of a future PO pass.
- **Zero-match import guard.** When an imported quote matches zero takeoff lines (e.g. BG ERP-format file), warn "unsupported format — attach as reference" instead of creating a confusing 0.00 / 0-coverage row.
- **Supplier ERP-format quote import (BG).** Fuzzy SKU reconciliation across vendor formats. Real BG fixture is supplier ERP format (different columns, SKU notation like FALC-T581P6DAN626 vs takeoff's T581CP6 DAN). Substantial own pass.
- **"Priced by others" -> Overlap subsection.** Move by-others lines out of the main hardware flow into a subsection under AC Overlap. Pairs with the unpriced-warning below.
- **Unpriced-hardware warning on step indicator.** Hover: "WARNING: Not all pieces have been priced!" Fires on any genuinely-unpriced line. Largely subsumed by W7 exclude (a line is then either priced or excluded), but the by-others subsection split still wanted.
- **AC-overlap line removal/exclude** (M3-polish deferral) — may be subsumed by W7 exclude; revisit after W7.
- **Flag-annotation notes** (M3-polish deferral). Click-to-annotate notes on flagged lines. Needs storage/persistence/UI design.
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

- **Dead-code sweep.** Orphaned: `.lp-breadcrumb`, `.dhw-advisory`, `.dhw-award-summary.dhw-award-none`, `computeAutoCableRows()`, `_dhwRenderPricingAndLabour` (W1-orphaned, definitively dead post-wizard).
- **Install LibreOffice** on the Windows machine — kills the recurring docs-PDF regen caveat (docx is canonical; PDF stale).
- **User guide** currently v1.7. Door Hardware wizard layout not yet documented — update when stable.
