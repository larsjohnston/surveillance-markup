# QUEUE.md

Canonical work queue for Smart Building Markup & Quoting Tool. Manually maintained — update at the end of any chat that shifts priorities.

---

## Active / next

1. **Proposal Wizard** (PASS_PROPOSAL_WIZARD_BRIEF.md) — 4-step wizard (Setup / Review / Output / Generate). Absorbs deferred SQ Tax row + DHW Summary warning banner + internal-review prose + Combine-hw-labour toggle. Multi-tax model (GST + PST/QST, tax-on-tax for QC, province presets). PDF orchestration. Cover redesign folds into P4. All 6 decisions locked.

2. **M5 — persistence** — Section pricing rules + labour rules + supply-only flag + custom-row ids + credential brivoSkus into save shape. Migrate older versions in applyProjectState.

3. **Luxer Deep Dive** — full Luxer PDF extraction (Outdoor Lockers + Fridge + Camera + Accessories + Room Kit) + catalog reconciliation + Tier-3 variant drill-down.

4. **V2 Tab focus restoration** — cherry-pick orphan commit `1590519`.

---

## Recently shipped

- **DHW UX pass + fixes** (main / `latest`) — Full DHW wizard redesign + bug fixes shipped this session:
  - **M6.4a**: Wizard 4 steps → 3 steps (Pricing / Labour / Summary). Step 1 Import removed from wizard — home canvas row 2 is the import entry point. openDoorHardwareModal guards on no takeoff.
  - **M6.4b**: Pricing header redesign — DEFAULT MARKUP strip (SQ-style, sticky), Columns button above thead, × on vendor column headers, Import Quotes → btn-blue. Default columns: SKU / vendors / Sell / Qty / Qty×Cost / Qty×Sell / Margin. DHW_PRICING_COLS defaultHidden updated.
  - **M6.4d**: Summary redesign — remove tax row, SQ-matched colors (ink grand total, muted section rows), unresolved lines listed with X/camera inline toggles, Lab Cost/Lab Sell hidden when supplyOnly.
  - **Auto-award cheapest vendor**: `_dhwAutoAwardCheapest()` runs on every quote import; prices + sub-totals populate immediately.
  - **Quote removal**: × button on vendor column headers removes that supplier's quote.
  - **Excel quote import**: SheetJS vendored to `lib/xlsx.full.min.js`; .xlsx accepted alongside .csv via unchanged colmap flow.
  - **SC flag downstream** (C1/C2/C3): Security Contractor propagated to `drawProposalHardwareSchedule` (customer PDF), `_dhwRenderStep4Summary` (estimator totals), `_dhwCountUnresolved` (export gate).
  - **dhwMatchKey collision**: duplicate-only `_lineIdx` stamping (two-pass in parse + normalize). Eliminates shared keys for lines with identical catalog # + finish.
  - **I1/I2/I3**: sub-total markup blank cell + colspan fix; toggle setters delete-on-false; XLSX pre-check with friendly error.
  - **SQ modal fixes**: min-width:max-content on step panes + section containers; horizontal scroll containment; 95vw width; colmap modal z-index elevated to --z-notice-modal.
  - **Grand Total row** in Pricing step below all sections.
  - **CLAUDE.md + QUEUE.md updated** with notice modal stacking, table conventions, SheetJS dep, v27 version chain, horizontal scroll gotcha.

- **DHW Revamp M1–M6** (PR #23–#27 / `314c32a`→`2be85a2`) — Complete 4-step wizard. Save v25→v26→v27. SheetJS vendored. AC-overlap + SC filtering. Legacy labour fields removed.

- **DHW Quote Column-Map Modal** (PR #22 / `8f3a6cf`) — Column-mapping confirmation step. +269 / -52.

- **Credential pricing — lazy-load fallback** (PR #19 / `45190a0`)
- **Brivo credentials converter extension** (PR #18 / `e486714`)
- **Credentials wiring** (PR #16 / `523a7f9`)
- **DoorBird pricing extract** — 6 SKUs. pricingBook.json 1125 items.
- **Pricing Cloud P0–P3** (PR #14–#15) — Cloudflare Worker + tool-side fetch + modal UI.
- **Pricing Vendor Expansion** (PR #13) — Luxer Indoor Lockers (37 SKUs).
- **SQ + DHW parity arc** (PR #12) — P1–P7 + follow-ups.

---

## Queued passes

### Classifier v2 — DHW keyword expansion
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl` abbrev. Drops unclassified ~28→~5.
- Door-operator components (column actuator, surf. auto operator, power supply, wire harness) → §2.2.
- "By others" lines → integrator W7-excludes at import; user-guide note.
- Ride-along: add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN`.

### DHW Pricing — remaining M6.4 items (deferred)
- **M6.4c Sell override**: editable Sell column with `$`-prefix input + blue highlight on manual override. `lineSell` field (M1 save shape) already wired. Prior attempt reverted — approach TBD.
- **Awarded vendor column white highlight**: `dhw-col-awarded-hdr` / `dhw-col-awarded-cell` classes ready; CSS needs tuning.

### Other backlog
- **Switch Topology** (partial — Network tile place/drag/delete/persist exists). Two-tier camera→switch→CMVR cabling; multi-switch-per-page array; switch right-panel.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## Notes

- One brief per pass under `PASS_*_BRIEF.md`; fold into final commit.
- Commit per milestone after browser review. Multi-feature arcs may stack on one branch/PR.
- Direct push to main blocked; all merges via PR.
- Update QUEUE.md at end of any chat that shifts the queue.