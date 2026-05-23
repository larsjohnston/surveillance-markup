# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated mid Hardware Module pass (after M1, `ce8c391` on hardware-module branch; main is at `3ad1029`)._

---

## IN PROGRESS

### Hardware Module pass (branch `hardware-module`, brief: PASS_HARDWARE_MODULE_BRIEF.md)
Turns Door Hardware into a left-rail mode (key icon) with a home checklist canvas, relocates File-menu hardware actions onto it, launches the existing wizard for pricing, and produces the customer-facing Hardware Schedule proposal page. Milestones:
- **M1 — DONE (`ce8c391`):** filled all left-rail icons; added Hardware (key) mode + empty home canvas overlay. (Follow-up icon fixes in flight: curbside-mailbox icon, parcel-box locker icon, convert camera+AC PNGs to inline SVG for tint consistency.)
- **M2 — NEXT:** home canvas checklist (6 rows, live status): door schedule / hardware schedule / RFQ export / quotes / "Price the Hardware" (launches wizard) / add-to-proposal. Not gated; soft dependency hints; live status from doorHardware state.
- **M3:** remove the 4 hardware actions (import takeoff, import quote, export RFQ, attach door schedule PDF) from the File menu — now on the canvas. LEAVE Load/Clear Pricing in File.
- **M4:** customer-facing Hardware Schedule proposal page. SELL ONLY. Placement: after Riser, before Plans. 2x2 presentation: line-by-line OR lump-sum × hardware/labour separate OR combined. Excluded/"by others" lines show as "—".
- **M5:** proposal export integration — Hardware Schedule section toggle + the 2x2 controls (persisted); wire the canvas "Add to Proposal" row.
- **Resolution safeguard (folded into M4/M5 + wizard):** every awarded line must be priced OR excluded. Unresolved (gap + not excluded) = "missed." Warn in wizard Summary (early catch) AND at proposal generation (loud warning, NOT a hard block — proceed-if-insist with explicit acknowledgement). Excluded/"by others" lines are resolved and show "—" on the customer page. This realizes the old deferred "unpriced-warning on step indicator" item with a precise meaning.

---

## DEFERRED — DOOR HARDWARE

- **Cross-tie data model: door schedule <-> hardware schedule <-> floor plans** (NEW, known future architecture problem). A door on the floor plan should tie to its door-schedule entry and its hardware-schedule line(s) so the three imports share openings/keys. Today they're independent (PDF reference, CSV line list, canvas drawings) with no linkage. Matching openings across three sources that don't share keys is a substantial data-model feature. The Hardware Module structure is meant to leave room for it.
- **PO consolidation / tie-break.** Tied unit cost between two suppliers on a line → default toward the supplier getting the larger overall dollar share (consolidate POs vs split). Surfaces at PO-generation. Design Qs: define "larger share"; circularity; interaction with manual override. W8 non-cheapest flag + column sums are related context.
- **Zero-match import guard.** Imported quote matching zero takeoff lines (e.g. BG ERP format) → warn "unsupported format, attach as reference" instead of a confusing 0.00 / 0-coverage row.
- **Supplier ERP-format quote import (BG).** Fuzzy SKU reconciliation across vendor formats (BG SKU notation FALC-T581P6DAN626 vs takeoff T581CP6 DAN). Substantial own pass.
- **Suppliers import quotes directly into our database** (step-3 future — "later version"; replaces the manual RFQ-email + CSV-import loop).
- **"Priced by others" -> Overlap subsection.** Auto-move by-others lines into a subsection under AC Overlap (manual Exclude partly covers the workflow).
- **Take-Off Pricing pass** (big). Cost columns/totals on the Take-Off page, consuming the Pricing Foundation. Build real source-data/pricing.json from vendor books FIRST.
- **Price-book direct integration.** Removes Load/Clear Pricing from the File menu entirely (currently left in File during the Hardware Module pass).

---

## DEFERRED — OTHER MODULES

- **Switch Topology** (Cleanup #9B). Placed switches, two-tier camera->switch->CMVR cabling. Likely merges with Manual Cable Routing + Conduit.
- **Manual Cable Routing + Conduit.** User-drawn polyline paths replacing straight-line x multiplier; conduit per-segment flag feeding a BOM conduit row. Open Qs: click-vs-draw, wall-snap, conduit catalog, cable tray, multiplier fallback, backwards compat.
- **Camera Details Panel Redesign** (Cleanup #8). Sliders with two-way canvas sync.
- **PDF scale-marker auto-recognition.** Select scale bar on imported PDF → extract calibration. Open Qs: OCR lib (Tesseract.js?), bars vs ratios, graphic-only bars, per-page scales, user-assisted vs auto.
- **Rules Page editor.**
- **Catalog imports** — LuxerOne / Doorbird / Hanwha.

---

## HOUSEKEEPING

- **Dead-code sweep.** Orphaned: `.lp-breadcrumb`, `.dhw-advisory`, `.dhw-award-summary.dhw-award-none`, `computeAutoCableRows()`, `_dhwRenderPricingAndLabour` (wizard-orphaned), `.dhw-status-pill`/`.dhw-status-unawarded`/`.dhw-status-awarded` (W8-orphaned), `.dhw-line-override` (W8a-orphaned).
- **Stray untracked file** `PASS_DHW_M3_POLISH_BRIEF.md` in repo root — never committed. Add or delete to clear status noise.
- **Process note:** during W8, Claude Code committed a brief directly to `main` instead of leaving commits to the user. Watch for agent self-commits to main.
- **Install LibreOffice** on the Windows machine — kills the docs-PDF regen caveat (docx canonical; PDF stale).
- **User guide** v1.7. Wizard + W7 + W8 + Hardware Module not yet documented — update when the module stabilizes.

---

## RESOLVED (removed from deferred)

- ~~Flag-annotation notes~~ — shipped W8c.
- ~~AC-overlap line removal/exclude~~ — subsumed by W7 Exclude.
- ~~Unpriced-warning on step indicator~~ — now precisely defined and folded into the Hardware Module resolution safeguard (M4/M5 + wizard Summary).
- ~~Standalone "M4 proposal pages" item~~ — absorbed into the Hardware Module pass (M4/M5).
