@'
# QUEUE.md

Canonical work queue for Smart Building Markup & Quoting Tool. Manually maintained — update at the end of any chat that shifts priorities.

---

## Active / next

1. **Proposal Wizard** (PASS_PROPOSAL_WIZARD_BRIEF.md) — 4-step wizard (Setup / Review / Output / Generate). Absorbs deferred SQ Tax row + DHW Summary warning banner + internal-review prose + Combine-hw-labour toggle. Multi-tax model (GST + PST/QST, tax-on-tax for QC, province presets). PDF orchestration. Cover redesign folds into P4. All 6 decisions locked.

2. **SUB-M5 — Mobile Pass subscription** — remaining queued subscription follow-on. (SUB-M3 Mobile Pass / M4 DoorBird-as-subscription numbering in CLAUDE.md is now superseded — see note below.)

3. **M5 — persistence** — Section pricing rules + labour rules + supply-only flag + custom-row ids + credential brivoSkus into save shape. Migrate older versions in applyProjectState.

4. **Luxer Deep Dive** — full Luxer PDF extraction (Outdoor Lockers + Fridge + Camera + Accessories + Room Kit) + catalog reconciliation + Tier-3 variant drill-down.

5. **V2 Tab focus restoration** — cherry-pick orphan commit `1590519`.

---

## Recently shipped

- **SUB-M3/M4 — LuxerOne + DoorBird per-suite subscriptions** (PR #45 / `c253c94`) — Two synthetic per-suite subscription lines, internal pricing (no price book). qty = multipliedTotal(suites); $3.50/suite/month, x12 (42.00) on annual term. Presence-gated (SUB-LUXER on LuxerOne parcel, SUB-DOORBIRD on Doorbird intercom). Editable sell via existing subscriptionOverrides map. SQ section 6 split 6.3 LuxerOne / 6.4 DoorBird, presence-driven auto-hide. Web rollup automatic. No save bump (v30). Branch base a63cf31.
- **SUB-M2 — Eagle Eye per-camera VMS** (PR #43 / `81931d3`) — 6.2 Camera VMS sub-section, retention pill (30/60/90/180/365/730), EN-PR1-D{retention}{term} line, qty = multipliedTotal(cameras). Schema v30 (projectInfo.cameraStorageRetention).
- **SUB-M1 — Brivo Access subscription** (PR #__ / `<hash>`) — 6.1 Access Control sub-section. Base S/M + reader tiers S1/S2/S3 + gateway-unit UC. Monthly/annual term pill. Schema v29 (subscriptionTerm, subscriptionOverrides). *(verify PR# / hash)*
- **DHW Revamp M1–M6** (PR #23–#26 / `314c32a`–`(M6 commit)`) — Complete 4-step wizard (Import / Pricing / Labour / Summary). Save v25→v26→v27.
- **DHW Quote Column-Map Modal** (PR #22 / `8f3a6cf`) — Column-mapping confirmation step in hardware quote import flow. Fixes $0 prices on non-Allegion supplier CSV formats.
- **Credential pricing — lazy-load fallback** (PR #19 / `45190a0`) — _sqRenderAutoRow lazy-loads cost/list from pricing book if not set at emit time.
- **Brivo credentials converter extension** (PR #18 / `e486714`) — build_pricing_json.py --brivo-credentials adapter. 11 SKUs; pricingBook.json 1125 items, 5 vendors.
- **Credentials wiring** (PR #16 / `523a7f9`) — BRIVO_CRED_CATALOG (11 SKUs) + Tier-3 grouped render + right-panel + Add-to-BOM. v26 bump.
- **DoorBird pricing extract** — manual CSV from DoorBird price book PDF (6 SKUs). pricingBook.json regenerated, uploaded to cloud.
- **Pricing Cloud P3 — modal UI** (PR #15) — Pricing modal Status/Actions/Advanced. File menu entry. 13 handlers.
- **Pricing Cloud — UTF-8 fix** (Worker `86f2bcb9-9dc8-44f3-a8cc-284deb04774f`) — toBase64Utf8() replaces btoa() in githubWrite.
- **Pricing Cloud P2 — tool-side fetch** (PR #14) — fetchRemotePricing + uploadPricing + localStorage cache + offline fallback.
- **Pricing Cloud P0/P1 — backend infra** — Cloudflare Worker pricing.mf-quoting-tool.workers.dev deployed.
- **Pricing Vendor Expansion** (PR #13) — converter refactor + per-vendor adapters. Luxer Indoor Lockers (37 SKUs).
- **SQ + DHW parity arc** (PR #12) — P1–P7 + follow-ups.

---

## Queued passes

### Classifier v2 — DHW keyword expansion
- Extend DHW_CLASSIFIER_RULES: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) cyl abbrev. Drops unclassified ~28→~5.
- Door-operator components (column actuator, surf. auto operator, power supply, wire harness) → §2.2.
- "By others" lines → integrator W7-excludes at import; user-guide note.
- Ride-along: add \b word boundaries to SECURITY_HARDWARE_PATTERN.

### DHW Quote — Excel support
- Follow-up to PR #22. Extend _handleHardwareQuoteFile to accept .xlsx. Parse via SheetJS (vendored in lib/). Convert first sheet to CSV, then feed existing _dhwShowColMapModal flow unchanged.

### Other backlog
- **Switch Topology** (partial — Network tile place/drag/delete/persist exists). Two-tier camera→switch→CMVR cabling; multi-switch-per-page array; switch right-panel.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; Hanwha SKU imports. (LuxerOne/Doorbird device-catalog imports still open; subscription side now shipped via SUB-M3/M4.)

---

## Notes

- SUB milestone numbering: CLAUDE.md lists SUB-M3 Mobile Pass / M4 DoorBird / M5 Luxer as queued. ACTUAL ship order diverged — LuxerOne + DoorBird shipped together as the per-suite subscription pass (commit base a63cf31). Mobile Pass remains the sole open SUB follow-on. Reconcile CLAUDE.md SUB numbering on next edit.
- One brief per pass under PASS_*_BRIEF.md; fold into final commit.
- Commit per milestone after browser review. Multi-feature arcs may stack on one branch/PR.
- Direct push to main blocked; all merges via PR.
- Update QUEUE.md at end of any chat that shifts the queue.
'@ | Set-Content -Path QUEUE.md -Encoding utf8