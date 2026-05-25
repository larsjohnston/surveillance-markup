# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated at main `a598d44`, after the overhead-door-flag pass. Save schema is at **v21**._

---

## THE REFRAME (terminology — affects everything below)

- **Security Quote** = the on-screen "BOM" drawer/modal. Internal **priced** workspace; sibling to the Door Hardware wizard. Floor-plan placements + manual entries → materials → SKU → (Pass 2) price-book lookup → margin/tax/totals. Pricing machinery lives here.
- **Door Hardware Quote** = the existing DHW wizard (import → price → award → markup → schedule). Door-hardware prices come from supplier RFQ, NOT the Brivo/Eagle Eye list.
- **Bill of Materials** = the customer-facing proposal-export PDF page only. Description · Qty, **no SKU, no pricing**. Navy/blue banded section headers, courier.
- Code symbols stay `bom*` (UI says "Security Quote"; symbol rename deferred — housekeeping).

---

## CURRENT BOM STRUCTURE (5 majors + Other, on both surfaces)
- **1. Cameras & Networking** — 1.1 Cameras & Surveillance (cameras) · 1.2 Networking (NVR/CMVR/HDD + PoE switches)
- **2. Access Control & Intercom** — 2.1 Access Control (readers/panels/Trove/expansion + 2.1-credentials) · 2.2 Overhead Door Control (OH-flagged devices + OH credentials) · 2.3 Intercoms
- **3. Parcel Lockers & Mailboxes** — 3.1 Smart Parcel & Delivery · 3.2 Mailboxes
- **4. Smart Suites** — 4.1
- **5. Door Hardware** — 5.1 Security / 5.2 Door / 5.3 Key / Unclassified (from DHW wizard)
- **Other** — catch-all
"&" never "and" in tier titles. Routing is by `r.section` (priority) then `src`+key-prefix.

---

## JUST SHIPPED THIS SESSION (all on main)
- **BOM two-tier restructure** — `43fdd4a` (tag `bom-two-tier-pass`). M1–M8. Flat 6-section → 5 majors; one `computeBomTree()` feeds drawer+PDF+CSV. IoT expansion + **v18→v19**. DHW §5 classifier.
- **Centered BOM modal** — `45d1afd` (CSS-only).
- **Customer BOM export page** — `29d0ccd`. Rename → "Security Quote"; two-line Qty·SKU·Desc, no pricing.
- **Banded BOM headers** — `678e69f`. Navy tier-1 / blue tier-2 filled bands, white text, "QTY" label. Hardcoded RGB navy `(40,54,92)` / blue `(74,110,180)` + TODO to unify with `branding.palette`.
- **Band/Qty fixes** — `70f122a`. Flush band/row gap, right-aligned Qty under QTY.
- **SKU removal from BOM PDF** — `8fd3237`. Rows collapsed to description + right-aligned Qty (no SKU). `bomRowSku()` now dead code.
- **Restructure-v2** — `4db0d6d`. The 5-major/7-sub template above + routing rewire + courier-sweep (was already all courier, no-op) + flush bands + "&"-not-"and". `OVERHEAD_DOOR_SKUS` introduced empty `[]`.
- **Credentials entry** — `3889598` (**v19→v20**). "Credentials" tile in AC level-2 (fob icon, drill-in, no Back); 5 tier-3 tiles → qty modal. `projectInfo.credentials = {fobs,cards,mobilePasses,ohTransmitters,ohReceiver}`. fobs/cards/mobilePasses→2.1, ohTransmitters/ohReceiver→2.2 via `CREDENTIAL_TYPE_DEFS` single-source helper. D1: manual 2.1-type entry>0 suppresses derived `auto-ac-credentials`; OH-only leaves it intact.
- **Overhead-door flag** — `a598d44` (**v20→v21**). "For use with Overhead Door" right-panel checkbox → `dev.overheadDoor`. AC grouping key split `sku + '|' + OH` so same-SKU flagged/unflagged → separate rows; flagged → `auto-ac-oh-<SKU>` + `section:'2.2'`. **Removed `OVERHEAD_DOOR_SKUS` entirely** — 2.2 is now pure user intent (checkbox + OH credentials).

---

## 🔴 HARD DEPENDENCY — resolve before any client-facing export
- **Cover GRAND TOTAL shows $0.00.** `drawProposalCover` sums `computeBomTree()` × margin/tax = $0 (all unit prices 0 until pricing lands). A proposal exported today shows a $0 cover — looks broken to a client. **Resolved by Pass 2 (real prices)** OR the cover-redesign branch hiding the $0. Do not ship a client proposal until one lands.

---

## NEXT — Pass 2: Pricing module (NEW CHAT)  *(the big one)*

Wire SKU → Brivo/Eagle Eye price list so the Security Quote drawer + CSV show real unit/line/margin/tax/grand-total, and the cover total becomes real (kills the $0-cover dependency).

**Source file:** `27_3_Brivo_Price_List_NA1_Reseller_L3_CDN_20260401.xlsx` (in project files). User: "always in this format; v1 just pull from this Excel as stated; dynamic solution later."

**File structure (confirmed by inspection):**
- 5 sheets. Equipment SKUs live in **"Access Reseller - NA1 L3"** (571 rows: Brivo `B-*` AC + suites + door-hw incl. Kwikset `KW-*`/Yale `YL-*`/Honeywell `HON-*`) and **"Video Reseller - NA1 L3"** (677 rows: Eagle Eye `EN-*` cameras/switches/CMVRs).
- Other sheets: "Video Complete" (OpEx variant), "Video Sub Price Matrix L3" (cloud VMS subscription grid — recurring, not equipment), "Summary of Changes" (changelog).
- Column layout (both equipment sheets): rows 0–11 = title/preamble/headers (SKIP). Data rows: **col A = SKU, col B = description, col C = spec/sub-desc, col D = Price CDN (list), col E = Reseller L3 CDN (cost basis), col F = notes.** Category-section header rows have text in col A but empty D/E (skip/treat as headers).

**🔑 TWO DECISIONS PENDING (answer at the start of the pricing chat — they gate the architecture):**
1. **Ingestion path:** (A) add SheetJS CDN dep → tool parses the raw `.xlsx` directly (matches "pull as stated"; seeds the eventual dynamic solution; **violates no-new-deps rule → needs explicit approval**), OR (B) offline-convert the 2 equipment sheets to a checked-in `pricing.json` loaded via the existing Pricing Foundation pipe (no new dep; manual convert step per price update). **Claude's rec: (B) for v1** ("dynamic later" = the SheetJS path). NOTE: a JSON loader may be scaffolded already — grep `loadPricing`/`pricing.json`/`priceBook` on current main to confirm its shape (only a stale comment found at line ~2802 so far).
2. **Camera SKU mismatch (make-or-break):** Brivo `B-*` price-list SKUs MATCH the tool's `BRIVO_CATALOG` → AC/credentials prices hit. But Eagle Eye cameras DON'T: price list `EN-CDUD-010a` vs tool catalog `een-DD10` — different schemes, lookup misses, camera prices come back $0. Either **build an `een-* → EN-*` crosswalk now** (needs user product knowledge to map each pair) OR **scope v1 to Brivo/AC-only prices** with cameras showing $0/"price pending" until the crosswalk lands. Claude's rec: decide live.

**Defaults Claude will bake in unless told otherwise:**
- Cost basis = **Reseller L3 (CDN), col E**; margin → sell.
- Scope v1 = one-time equipment for SKUs the tool emits (cameras, AC, credentials, suites, intercom if present). **§5 door hardware stays on the DHW quote/RFQ path** (not in this list). **Subscriptions/recurring out of scope v1.**
- Require a **SKU-match coverage report** (how many of the tool's emitted SKUs found a price, which missed) before trusting the lookup.

**Prerequisite within the pass:** promote `sku` to a real per-material field where needed (cameras/AC/intercom/parcel/DHW have a source; mailbox/IoT/derived need SKU assignment or a no-price marker).

---

## ACTIVE — OTHER BRANCH (proposal-cover chat)
- **Proposal cover redesign** — SMART-MF-branded title page (angled navy/white jsPDF geometry; logo + photo base64; Project/Client/Date) from `projectInfo.branding`. Logo IN; **building photo PENDING** (free-license `cover-photo.jpg`). Helvetica not courier (NOTE: rest of export is courier on main — known conflict to resolve at merge). Rebase onto current main before merge.
  - **ON MERGE — palette unification (REQUIRED):** reconcile the BOM-band navy `(40,54,92)`/blue `(74,110,180)` + the older gray-navy `(31,41,55)` into one `branding.palette`. Pick one canonical brand navy for the whole proposal.
  - Could also resolve the $0-cover dependency (hide the $0 total).

---

## QUEUED PASSES

### Classifier v2 — DHW keyword expansion (from M8's 28-unclassified real-data dump)
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl`. Drops unclassified ~28→~5.
- Door-operator components → §2.2 (couples to deferred door-operator modeling — §2.2 has none).
- **Ride-along:** add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN` (fixes "REX" in "CORE EXTRACTOR"; touches classifier rule 2 + the 2.1/2.3 guard).

### Foundational — Materials model (fold into / follow Pass 2)
- General **data-driven section assignment** — every material carries an editable `section`/`sectionOverride` field; routing reads it instead of hardcoded prefixes. `dev.overheadDoor` was the first targeted instance; generalize to `dev.sectionOverride`.
- Manual line-item entry surface for non-placed items beyond credentials (services, subscriptions, master-key). Credentials entry already shipped as the first slice.

### Other backlog
- **Switch Topology** (partial) — two-tier camera→switch→CMVR cabling; multi-switch-per-page; switch right-panel. Likely merges with Manual Cable Routing.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## HOUSEKEEPING
- **`bomAutoOverrides` orphans on flag-flip** — flagging a device changes its row key (`auto-ac-<SKU>`→`auto-ac-oh-<SKU>`), orphaning any unit-price override. Inert today (unit:0); **fix in Pass 2** (migrate override to new key, or key overrides by `<sku,flag>` tuple).
- **Unify proposal navy/blue into one palette** — see cover-branch merge note. Three values float: BOM-band navy `(40,54,92)` + blue `(74,110,180)`, older gray-navy `(31,41,55)`.
- **Dead-code sweep** — `bomRowSku()` (now fully unreferenced after SKU removal) + stale comment at ~line 4038; `.lp-breadcrumb`; `computeAutoCableRows()`; orphaned PNG assets.
- **"QTY" band label is decorative-only** consideration resolved (Qty right-aligned under it) — no action.
- **Centralize `IOT_DEFAULT_FLAGS`** — dup'd in `onIotDeviceToggle` + `applyProjectState`.
- **DHW BOM override re-apply hook** — `dhwBomRows()` not re-decorated by `bomAutoOverrides` on reload.
- **Defer `bom*` code-symbol rename** — UI says "Security Quote", symbols stay `bom*`.
- **`switches`/`headends` don't reset on raw PDF re-import.**
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — everything from the wizard onward through this session (BOM two-tier, modal, Security-Quote rename, customer BOM page, banded headers, restructure-v2, credentials entry, overhead-door flag) is undocumented.

### Process lessons that worked
- **Resync anchor `[HEAD: <hash> | branch | tree]` on every CC block** — prevents stale-state drift.
- **Fold each pass brief into its CLOSING commit's `git add`** — credentials + overhead-door briefs both landed tracked this way (the recurring dangling-brief problem is solved when followed).
- **Commit after each milestone's browser review — don't defer.** One pass stalled three turns on an uncommitted milestone being re-reported.
- **PowerShell doesn't chain with `&&`** — one command at a time, or `;`.

---

## RESOLVED (removed from deferred)
- ~~BOM two-tier template~~ `43fdd4a` · ~~Centered modal~~ `45d1afd` · ~~Customer BOM page~~ `29d0ccd` · ~~Banded headers~~ `678e69f` · ~~Band/Qty fixes~~ `70f122a` · ~~SKU removal~~ `8fd3237` · ~~Restructure-v2~~ `4db0d6d` · ~~Credentials entry~~ `3889598` · ~~Overhead-door flag~~ `a598d44`
- ~~`OVERHEAD_DOOR_SKUS` allowlist band-aid~~ — removed in the overhead-door-flag pass; replaced by the per-device checkbox + OH credential types.
