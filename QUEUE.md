# Queue

Last regenerated 2026-06-01 after PR #12 (SQ + DHW parity arc) merged into main.

## Recently shipped

- **PR #12 — SQ + DHW parity arc** (P1 → P7 + follow-ups). Visual + functional parity across both wizards. Chrome / controls / column-hide / default cols / Project Totals box / col-hdr two-line wrap / supply-only hides labour body / xlsx full-justify. SQ Tax row + Sub-Total/Grand Total stack DEFERRED to Proposal Wizard. DHW Summary internal-review prose + warning banner + combine-hw-labour toggle DEFERRED to Proposal Wizard.
- **PR #11 — SQ + DHW polish 2** (blue outline on every editable input; `$` prefix; money 2dp / percent 1dp rounding; tax label / GST default).
- **PR #10 — SQ networking pricing fix** (bomRowSku resolves recording + network rows; CMVR + switch pricing unblocked). Labour V1 Tab focus restore (`1590519`) is an orphan local commit lost in this merge — queued for revival.
- **PR #9 — SQ polish + Summary redesign + tax label** (UI polish, recalcBom throw fix, Sub-Total relocated to Summary, editable tax label, etc.).
- **PRs #1–8 — preceding SQ wizard arc** (M0–M4 + various polish).

## Active queue (in order)

### 1. Pricing Vendor Expansion

Brief: `PASS_PRICING_VENDOR_EXPANSION_BRIEF.md`

Extend pricing pipeline to merge **3 vendors** into one `pricingBook.json`:
- Eagle Eye (already wired).
- **DoorBird** (intercoms) — new.
- **Luxer One** (parcel lockers) — new.
- **Brivo** (access control) — new.

Per-vendor adapter pattern in `build_pricing_json.py`. Manual xlsx/CSV extraction from vendor PDFs. Catalog SKU audit + fixup. Acceptance: every priced auto row carries Cost + List.

### 2. Credentials wiring

Brief: `PASS_CREDENTIALS_BRIEF.md`

Wire AC Tier 2 credential tiles to the price book (currently disconnected). Catalog 11 Brivo credential SKUs from price book rows 317–327 (bulk packs + custom encryption + punch services). Right-panel qty input + Add to BOM flow. **Fixes broken qty-modal OK button** (current bug). Replaces derived `auto-ac-credentials` stub. Mobile passes deferred (subscription model — separate pass).

### 3. DHW Revamp

Brief: `PASS_DHW_REVAMP_BRIEF.md`

Replace 5-step horizontal stepper with **2 left-pane tile launchers** (Door Hardware Schedule Import + Door Schedule Import placeholder) + **4-step wizard** (Import / Pricing / Labour / Summary). Comparison + Hardware merged into Import. AC Overlap becomes per-row pill toggle in Pricing. Labour mirrors SQ exactly. Summary mirrors SQ exactly. Section grouping auto-derived by hardware category. Decisions all locked in brief.

### 4. Proposal Wizard

Brief: `PASS_PROPOSAL_WIZARD_BRIEF.md`

Top-level customer-facing output orchestration. **4-step wizard** (Setup / Review / Output / Generate). Absorbs:
- SQ Tax row + Sub-Total/Grand Total stack (deferred from P7).
- DHW Summary warning banner + internal-review prose + combine-hw-labour toggle (deferred from P7).
- **Multi-tax** support (GST + PST/QST + tax-on-tax for QC, province presets).
- Customer-facing live preview pane.
- PDF generation orchestration (cover + hardware schedule + security list + pricing summary).
- **Cover page redesign** folds into P4 of this pass.

Decisions locked: province overwrites labels; PDF blocks on errors / warns on unpriced; single live state (no versioning); auto-save; multi-currency/US deferred.

### 5. M5 (persistence)

Bump save version (lite + full). Migrate in `applyProjectState`:
- SQ per-section materials pricing rules + per-section labour rules + per-line labour overrides + supply-only flag + tax label.
- Multi-tax array (from Proposal Wizard).
- Province preset.
- Combine-hw-labour project-wide flag.
- Proposal includes flags.
- Customer/proposal metadata.
- Credential per-SKU qtys.
- DHW: new per-section pricing rules + labour state from revamp.

Legacy global-margin pipeline removal (the 9 sites we hid in M2b/M2c). CSV + PDF reflect new model. Legacy `bom.config.taxPct`/`taxLabel` migrate to `bom.config.taxes` array.

### 6. Polish — V2 Tab focus restoration

Cherry-pick orphan commit `1590519` (Labour V1 Tab focus restore) lost during PR #10 merge. Apply against new main. Plus mirror the same fix for V2 (default-strip Sell Tab → first section's first input) per CC's earlier flagged follow-up. Render-discipline class of bug.

## Deferred / future passes

- **Mobile Passes** for AC Credentials (subscription model — needs subscription line-item architecture).
- **HID credentials** catalog (book rows 328–330).
- **Manual cable routing + conduit** — replace straight-line × multiplier with user-drawn polylines.
- **PDF scale-marker auto-recognition** — OCR-assisted calibration.
- **DHW Export CSV** — DHW has no CSV export today; SQ does. Parity gap, flagged in parity recon.
- **Customer signature / e-sign** on proposal output.
- **US tax jurisdictions** (state/county/city compounding).
- **Cover page templating** — beyond the redesign in Proposal Wizard P4.
- **Quote versioning / revision history**.
- **DHW + SQ merge-by-SKU re-import** (currently destructive).
- **XLSX schedule import** for DHW.
- **PDF table extraction** for vendor price books.

## Conventions

- One brief per pass under `PASS_*_BRIEF.md`; fold into final commit.
- Recon-gate any multi-site change.
- Each pass = its own branch + PR.
- QUEUE.md is canonical and manually maintained — regenerate at end of any chat that shifts the queue.
- All current decisions locked in the briefs above.
