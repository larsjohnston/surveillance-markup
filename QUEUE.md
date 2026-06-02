# QUEUE.md

Canonical work queue for Smart Building Markup & Quoting Tool. Manually maintained — update at the end of any chat that shifts priorities.

---

## Active / next

1. **DHW Revamp** (PASS_DHW_REVAMP_BRIEF.md) — 2 left-pane tile launchers + 4-step wizard (Import / Pricing / Labour / Summary). All decisions locked.

2. **Proposal Wizard** (PASS_PROPOSAL_WIZARD_BRIEF.md) — 4-step wizard (Setup / Review / Output / Generate). Absorbs deferred SQ Tax row + DHW Summary warning banner + internal-review prose + Combine-hw-labour toggle. Multi-tax model (GST + PST/QST, tax-on-tax for QC, province presets). PDF orchestration. Cover redesign folds into P4. All 6 decisions locked.

3. **M5 — persistence** — Section pricing rules + labour rules + supply-only flag + custom-row ids + credential brivoSkus into save shape. Migrate older versions in applyProjectState.

4. **Luxer Deep Dive** — full Luxer PDF extraction (Outdoor Lockers + Fridge + Camera + Accessories + Room Kit) + catalog reconciliation + Tier-3 variant drill-down.

5. **V2 Tab focus restoration** — cherry-pick orphan commit `1590519`.

---

## Recently shipped

- **Credential pricing — lazy-load fallback** (PR #19 / `45190a0`) — _sqRenderAutoRow lazy-loads cost/list from pricing book if not set at emit time (covers race condition when book loads after boot). Credential rows in SQ MATERIALS now price correctly.
- **Brivo credentials converter extension** (PR #18 / `e486714`) — extended build_pricing_json.py with --brivo-credentials arg + adapter. Reads brivo-credentials-extract.csv (sku, description, msrp, unit_cost, notes). Collides with Brivo Access MSRP-only entries; reseller cost wins. 11 SKUs in final pricingBook.json (1125 items, 5 vendors).
- **Credentials wiring** (PR #16 / `523a7f9`) — BRIVO_CRED_CATALOG (11 SKUs) + Tier-3 grouped render + right-panel + Add-to-BOM handler + v26 save bump. Removed auto-ac-credentials stub.
- **DoorBird pricing extract** — manual CSV from DoorBird price book PDF (6 SKUs). Regenerated pricingBook.json (1125 items, 4 vendors). Uploaded to cloud pricing.
- **Pricing Cloud P3 — modal UI** (PR #15) — Pricing modal with Status/Actions/Advanced sections. File menu entry. Toast per-kind CSS. 13 handlers.
- **Pricing Cloud — UTF-8 fix** (Worker Version `86f2bcb9-9dc8-44f3-a8cc-284deb04774f`) — `toBase64Utf8()` replaces `btoa()` in `githubWrite`. End-to-end pipeline validated.
- **Pricing Cloud P2 — tool-side fetch** (PR #14) — `fetchRemotePricing` + `uploadPricing` + localStorage cache + offline fallback + boot async fetch.
- **Pricing Cloud P0/P1 — backend infra** — Cloudflare Worker `pricing.mf-quoting-tool.workers.dev` deployed.
- **Pricing Vendor Expansion** (PR #13) — Phase A converter refactor + argparse + per-vendor adapters. Luxer Indoor Lockers (37 SKUs) extracted.
- **SQ + DHW parity arc** (PR #12) — P1–P7 + follow-ups.

---

## Queued passes

### Classifier v2 — DHW keyword expansion
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl` abbrev. Drops unclassified ~28→~5.
- Door-operator components (column actuator, surf. auto operator, power supply, wire harness) → §2.2.
- "By others" lines → integrator W7-excludes at import; user-guide note.
- Ride-along: add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN`.

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