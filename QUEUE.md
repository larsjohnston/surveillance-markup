# QUEUE.md

Canonical work queue for Smart Building Markup & Quoting Tool. Manually maintained — update at the end of any chat that shifts priorities.

Main at `a333c22`. Save schema v30.

---

## Active arc — Subscriptions & Operating Expenses

Per-vendor recurring-cost engine. Subscriptions are NOT BOM (BOM = equipment only) — they live in the SQ wizard MATERIALS step as section "6. Subscriptions" (bottom) and as a single rolled-up customer line in the web proposal. Project-wide Monthly/Annual term toggle (pill in section header, replaces rule pill). Sell is editable per-line with an override flag; standard sell = msrp. Term suffix: `-1` monthly / `-12` annual.

- **SUB-M1 — Brivo Access** ✅ SHIPPED (PRs #40–43, main `1879fe5`).
  - M1a converter: no-op — `parse_brivo` already ingests sub SKUs (no suffix filter on Access sheet).
  - M1b engine + data model: `computeSubscriptionRows()` (mode A Standard / mode B Multifamily by gateway presence; S1/S2/S3 reader tiers; `B-ACS-BASE-S/M`, `B-ACS-UC-M` ×gateway-units). `projectInfo.subscriptionTerm` + `subscriptionOverrides`. Save v28→v29. **Project default rule changed to discount 0%.**
  - M1c render: Subscriptions section in MATERIALS — term pill, editable sell + override flag, col-B-only desc.
  - M1d web rollup: single customer line "Cloud Based Multifamily Application, VMS & Cloud Storage, 24/7 Support & IP Integration" + term-aware/override-aware total below grand total.
- **SUB-M2 — Eagle Eye per-camera VMS** ✅ SHIPPED (this PR, save v30).
  - New "6.2 Camera VMS" sub-section under "6. Subscriptions" (own subtotal). Per-camera line `EN-PR1-D{30|60|90|180|365|730}{-1|-12}`, qty = `multipliedTotal(cameras)` (matches BOM camera row).
  - New project-wide `projectInfo.cameraStorageRetention` (`'30'` default). Retention pill (30/60/90/180/365/730 Day) + term pill in 6.2 header.
  - `_subRenderRow` desc cleaner extended: strip-from-first-paren drops trailing `(24x7…) Monthly`/`Yearly` from EN-PR1 notes; AC rows unaffected.
  - Web rollup unchanged — Eagle Eye lines fold into the existing single generic customer line.
  - Eagle Eye Complete plans (`EN-CBC*` setup `-0` + recurring `-1/-12`) deferred — no rule yet for per-camera vs per-bridge / which Complete tier.
- **SUB-M3 — Brivo Mobile Pass.** `B-MP-100/500/1000`. NEEDS RULE: how pass count is determined (per unit? per reader? manual qty?) and whether always-present or optional. Reuses M1c/M1d render pattern.
- **SUB-M4 — DoorBird.** From DoorBird PDF (in project files). NEEDS RULE: per-intercom sub SKU + qty rule.
- **SUB-M5 — Luxer.** Needs private-repo data + per-locker-bank rule.

Known cosmetic debt: pricing-book `notes` carry a mojibake em-dash (`â€"`) and (for EN-PR1) a trailing parenthetical + `Monthly`/`Yearly` term word (sometimes with no preceding space — see `EN-PR1-D60-1`). Subscription render strips col C, cleans the em-dash, and drops everything from the first `(` to end of string. Converter-side fix (clean encoding + drop trailing term at source) is the durable fix — deferred.

---

## Web Proposal arc (hosted, replaces PDF export)

Tool generates self-contained HTML → POSTs to dedicated proposals Worker → Cloudflare R2/KV → unguessable slug URL. Client opens URL → open-ping on load. Download = client-side print-to-PDF. Portal wraps stored proposals later.
v1 decisions locked: separate Worker + R2/KV · open/timestamp tracking only · unguessable slug, no login · HTML-first.

- **WP-M1 — Preview modal + HTML renderer** ✅ SHIPPED (PR #37). Proposal-menu "Preview Web Proposal…" → print-dialog modal (section toggles + iframe preview). Clean branded cover + sell-only Security Quote (navy/blue/grey). `buildWebProposalHtml()` returns standalone HTML. + SUB-M1d subscription rollup line.
- **WP-M2 — Proposals Worker + R2 storage.** `POST /proposals`→slug; `GET /p/:slug` serves. Multi-tenant X-Auth-Token. wrangler deploy. *(R2 vs KV decided at M2 — recommend R2.)*
- **WP-M3 — Wire Generate-URL button.** POST buildWebProposalHtml output → slug → copyable link. localStorage cache.
- **WP-M4 — Open tracking.** Ping on GET (timestamp + count). Status view.
- **WP-M5 — Download button** on hosted page (native print stylesheet, no new dep).
- **WP-M6 (later) — Customer portal.** Auth + per-client index.

Renderer growth (fold into WP follow-ups): Riser, Hardware Schedule, Floor Plans section toggles; hero-image cover polish.

---

## Next up (pre-pivot, still valid)

1. **M5 — persistence** — section pricing/labour rules + supply-only flag + custom-row ids (incl. `line.sku`) + credential brivoSkus into save shape. (Partly advanced by v29 — subscription state already persists.) Audit remaining gaps.
2. **Luxer Deep Dive** — full Luxer PDF extraction (Outdoor Lockers + Fridge + Camera + Accessories + Room Kit) + catalog reconciliation + Tier-3 variant drill-down.
3. **V2 Tab focus restoration** — cherry-pick orphan commit `1590519`.

---

## New feature items (need full briefs)

- **CMVR auto-recommendation** — camera-count-driven CMVR model rec; manual override. Right-panel / BOM auto-row.
- **Network switch auto-recommendation** — same count-driven pattern.
- **Power supply auto-recommendation** — same count-driven pattern.
- **AC door hardware components** — per-door: door contact, REX, power supply, electric strike/lockset.
- **DoorBird mounting boxes** — catalog expansion.
- **Access control switches** — new AC sub-category.
- **Elevator controls** — new module (call station + floor access control).
- **Suite IoT specifics** — expand suite module with device-specific detail.

---

## Queued passes (backlog)

### Classifier v2 — DHW keyword expansion
Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl` abbrev. Door-operator components → §2.2. "By others" → W7-excludes. `\b` boundaries on `SECURITY_HARDWARE_PATTERN`. Drops unclassified ~28→~5.

### DHW Quote — Excel support
Extend `_handleHardwareQuoteFile` for `.xlsx` via SheetJS → CSV → existing `_dhwShowColMapModal` flow.

### Other backlog
- **Switch Topology** (partial) — two-tier camera→switch→CMVR cabling; multi-switch array; switch right-panel.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## Recently shipped (this chat)

- **SUB-M2** (this PR) — Eagle Eye per-camera VMS subscription. New 6.2 Camera VMS sub-section with retention pill, project-wide `cameraStorageRetention`, EN-PR1 desc strip-from-paren. Save v30.
- **SUB-M1a–d** (PRs #40–43) — Brivo AC subscriptions end-to-end (see arc above). Project default rule → discount 0%. Save v29.
- **SQ custom-row per-section routing** (PR #39) — dedicated `bomCustomLines` keys for 2.2/2.3/3.1/3.2/4.2 so lines land in their own section.
- **WP-M1** (PR #37) — Web Proposal preview modal + HTML renderer.
- **PDF Security Quote page + logo header** (PR #35) — `drawProposalQuote` + white-band logo `drawPageHeader`. (Retained as fallback; PDF being retired.)
- **SQ custom row add button + SKU field** (PR #36).

---

## Notes

- One brief per pass under `PASS_*_BRIEF.md`; fold into final commit.
- Commit per milestone after browser review. Multi-feature arcs stack on one branch/PR.
- Direct push to main blocked; all merges via PR. Push branch to origin BEFORE `gh pr create`.
- Project-knowledge file copies LAG main by several passes — CC must recon against live main, never the uploaded copy.
- Update QUEUE.md at end of any chat that shifts the queue. CLAUDE.md + project-instructions panel must stay in sync.