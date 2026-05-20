# Surveillance Markup Tool — Work Queue

> **This is the canonical backlog.** It lives in the project files so every chat in this
> project can see it. To update it: ask Claude to produce a revised version, then paste
> the result back into the project files (chats can't write to project files directly).
>
> Last updated: 2026-05-20

---

## 🔴 Next session — do this first

**Resume Door Hardware at M3.** M1 (data engine) and M2 (file pickers + parser) are
shipped and validated against the real Westmount fixtures. The manager modal is next.

Before starting M3:
1. **Load the saved test-fixture project** (takeoff + CC Craig quote) instead of
   re-importing the two CSVs. If a fixture project wasn't saved at the end of the
   2026-05-20 session, re-import: real Allegion takeoff CSV, then CC Craig quote CSV
   (supplier "CC Craig"), from `source-data/projects_demo/`.
2. **Check commit ordering vs. the parallel Door Hardware chat.** A separate chat is
   also working a Door Hardware workstream and edits the same file. `git pull` / `git
   log` check before editing to avoid clobbering.

---

## 🟡 Recently shipped (2026-05-20 session)

| Item | State |
| --- | --- |
| Cleanup pass (M1–M6) | ✅ Shipped, tagged `cleanup` (`e26afb6`) |
| Pricing Foundation (M1–M4) | ✅ Shipped, tagged `pricing-foundation` (`bfd5c36`) |
| Door Hardware **M1** (data engine) | ✅ Shipped (`b78bd06`) |
| Door Hardware **M2** (file pickers + parser) | ✅ Shipped (`95d9cee`), validated on real fixtures |

**Cleanup pass** covered: left-pane header relabels (all modes, static `<Mode> <Tier>`
pattern, styling unified), Camera Styles tile icons redrawn to match canvas markers,
fisheye FOV cone fix (degenerate-tan reach bug + pre-fix save migration), Camera
Accessories section (CMVR/NVR relocated; Switch tile deferred), Equipment Labels
tri-state visibility group (persisted in `projectInfo.labelVisibility`), docs v1.6.

**Pricing Foundation** covered: schema + localStorage helpers + status/banner (M1),
File menu Load/Clear Pricing + file picker + error modal (M2), `source-data/`
template + README + gitignore exceptions (M3), docs v1.7. The app can now load an
external price book; cost *rendering* is a later pass (Take-Off Pricing, below).

**Door Hardware M1+M2** covered: full DOM-free data engine (CSV parser handling both
takeoff and priced-quote states, recompute+flag, dual comparison views, award
resolution, pricing/labour math, RFQ builder, AC-overlap advisory), `doorHardware`
state + persistence (save v17→v18, backfill), and the four File-menu actions (Import
Takeoff, Import Quote, Export RFQ, Attach Door Schedule). **Two real-file parser fixes**
landed during M2 validation: position-based price-column detection (Allegion puts
LIST/COST/TOTAL offset on the first group-header row, not on per-block column headers)
and currency-string parsing ($ signs, quoted thousands). Validated end-to-end against
the real CC Craig quote: 57/66 lines priced, package cost **$138,020.21 recomputed**
(vs. the sheet's understated total), **32 lines flagged** for broken `cost+qty` totals.

---

## 🟢 Active pass — Door Hardware (in progress)

Spec: `HARDWARE_SPEC.md`. Import → quote → compare → award → markup → labour →
proposal. No on-canvas placement (deferred future module).

**Remaining milestones:**

- **M3 — Manager modal** (Proposal → Door Hardware…). Takeoff list; quote list +
  delete; View 1 (by-supplier: package cost, coverage, flag count) + View 2 (best-by-
  line); award selector (whole-package | best-line); markup controls (project-default %
  + per-line override); labour controls (hourly rate + per-line install hours +
  include toggle); AC-overlap advisory display. `window.prompt`/`confirm` from M2 can
  upgrade to styled inputs here.
- **M4 — BOM section + proposal pages.** New DOOR HARDWARE BOM section (equipment-only,
  after accessControl). Hardware Schedule proposal page (customer-facing sell pricing,
  reuse riser table/overflow helpers). Door Schedule reference page (rasterize attached
  PDF via pdf.js — mirror the floor-plan `sourceDocument` approach). Two new
  `proposalSections` toggles (hardwareSchedule, doorSchedule; default ON).
- **M5 — User guide v1.8.**

**⚠️ M4 reconciliation decisions still pending** (spec predates recent passes):
- **Proposal page order.** Spec's order is stale. Real order is Cover → BOM → Take-Off
  → Riser → Plans. Where does the Hardware Schedule page sit? (Likely near BOM/Take-Off
  since it's customer-facing pricing.) Where does the Door Schedule reference page sit?
  (Likely late, near the floor plans — both are reference imagery.)
- **Door-hardware labour rendering.** BOM is equipment-only now (no LABOR section), so
  labour can't go "in/under DOOR HARDWARE" in the BOM as the spec says. Options: feed
  the Take-Off page's Labor Summary, or render on the Hardware Schedule page itself.

**Deferred within Door Hardware (per spec):** XLSX import (CSV-only v1; fast-follow),
supplier ERP-format quote parsing (BG Distribution PDF — attach as reference only),
master-BOM merge, placement/authoring, supplier portal.

---

## 📋 Backlog (after Door Hardware)

### 1. Take-Off Pricing  *(the big one — turns Take-Off into a priced quote)*
Cost columns + totals on the Take-Off page, consuming the Pricing Foundation. New
sections: Equipment Subtotal / Cabling / Labor / Tax / Margin / Grand Total. Labour
composes `LABOR_RATES` (hrs/task) × pricing book's `labor_rate_per_hour` ($/hr).
**Recommendation:** build a real `source-data/pricing.json` from the vendor books
FIRST so cost rendering is verifiable against real numbers, not template zeros.

### 2. Switch Topology  *(spun off from Cleanup #9B)*
Placed switches replace auto-derived ones. Two-tier cabling: camera → switch → CMVR.
Switch appears in the riser as an intermediate tier. Camera-to-switch assignment
(nearest? manual?). BOM replacement of auto-derived switch rows. **Likely merges with
Manual Cable Routing + Conduit** (same domain: real cable topology vs. straight-line
approximation). The Camera Accessories section (shipped in Cleanup M4) already exists
to hold the Switch tile when this pass builds it.

### 3. Manual cable routing + conduit  *(quoting-accuracy pass)*
Replace the straight-line × multiplier cable model with **user-drawn polyline paths**
(waypoints camera → head-end, sum segments). Add **conduit** as a per-segment flag
feeding a new BOM conduit auto-row. Open questions: click-vs-draw UX, wall-snap, conduit
catalog, cable tray, multiplier as fallback, backwards compat (default current behavior
until a path is drawn).

### 4. Camera Details Panel Redesign  *(spun off from Cleanup #8)*
Field reorder: Label → Manufacturer/Model → Spec & DORI (combined) → Reach slider →
Mount Height slider → Angle slider → Notes. DORI relocated from left pane to right.
Three sliders with **two-way sync** to the existing canvas arrowhead-drag manipulation
(reach is spec-defaulted but user-adjustable; angle is the aim). FOV cone updates live.
Spun off from Cleanup because the two-way slider↔canvas sync is real engineering.

### 5. PDF scale-marker auto-recognition
Let the user select a scale bar on an imported PDF; extract calibration, replacing
manual entry. **Design TBD.** Open questions: OCR library (Tesseract.js?), scale bars
vs. ratios (`1:100`), graphic-only bars with no label, per-page scales in multi-page
PDFs, user-assisted (click 2 endpoints + OCR) vs. full auto.

### 6. Catalog / rules work (smaller items)
- Rules Page editor (per-bedroom-type IoT rules)
- LuxerOne SKU import
- Doorbird full catalog
- Hanwha import

---

## 🧹 Housekeeping (do opportunistically)
- **Dead-code sweep.** Orphaned `.lp-breadcrumb` CSS (Cleanup M1 left it; surgical-
  changes rule). `computeAutoCableRows()` orphaned since BOM Restructure. Sweep when
  convenient.
- **Install LibreOffice on the Windows machine.** The docs build script can't
  auto-regenerate the PDF without `soffice` on PATH — docx is canonical, PDF is built
  manually in Word for now. Recurring caveat; install kills it.

---

## Notes
- Project conventions: vanilla JS, `var` declarations, single HTML file, no new
  dependencies (CDN libs are pdf.js and jsPDF only).
- **No real users on shipped builds yet** → save-format/backwards-compat breaks are
  acceptable. Revisit when distribution begins.
- A **parallel chat** is working a separate Door Hardware workstream on the same file.
  Watch commit ordering: `git pull` / `git log` before editing on resume.
- This file is for tracking only — it does not change tool behavior.
