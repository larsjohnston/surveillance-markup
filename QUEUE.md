# Surveillance / Door Hardware Markup Tool — Work Queue

_Canonical manually-maintained queue. Last regenerated at main `d54b5a1`, after the customer-BOM-export pass + the Security-Quote/BOM reframe._

---

## THE REFRAME (terminology — affects everything below)

- **Security Quote** = the on-screen "BOM" drawer/modal (renamed M1). Internal **priced** workspace; sibling to the Door Hardware wizard. Floor-plan placements → materials → SKU → (eventually) price-book lookup → margin/tax/totals. Pricing machinery STAYS here.
- **Door Hardware Quote** = the existing DHW wizard (import → price → award → markup → schedule).
- **Bill of Materials** = the **customer-facing proposal-export PDF page only**. Qty · SKU · Description, **no pricing** (shipped this session). Two-line rows.
- Code symbols stay `bom*` (drawer/menu UI says "Security Quote"; symbol rename deferred — housekeeping).

---

## JUST SHIPPED (on main, this session)

- **BOM two-tier restructure** — `43fdd4a`, tag `bom-two-tier-pass`. M1–M8 (M5 N/A). Flat 6-section → 5 majors + "Other"; one `computeBomTree()` feeds drawer + PDF + CSV. Placed-switch row (M1), IoT expansion gateway/keypad/passageSet + **save v18→v19** (M2), two-tier on-screen + PDF (M3/M4), DHW §5 classifier (M6), §2.2 dedup guard + Unclassified amber (M7), CSV tier columns + latent `&amp;` fix (M8).
- **Centered BOM modal** — `45d1afd` (CSS-only: right drawer → centered 2/3 modal).
- **Customer BOM export page** — `29d0ccd`. M1: rename drawer/menu → "Security Quote". M2: PDF BOM page → two-line Qty·SKU·Description, no pricing, larger font, SKU-vs-typeLabel via color+brackets; `sku` attached to `dhwBomRows()` output.

---

## 🔴 HARD DEPENDENCY — resolve before any client-facing export

- **Cover GRAND TOTAL shows $0.00.** The customer BOM page is now price-free, and `drawProposalCover` sums `computeBomTree()` × margin/tax = $0 (all unit prices 0 until pricing lands). A proposal exported today shows a **$0 cover — looks broken to a client.** Resolved by EITHER the cover-redesign branch (hide/omit the $0 total) OR Pass 2 (real prices). Do not ship a client proposal until one lands.

---

## NEXT UP — Pass 2: Security Quote pricing  *(the big one — renamed "Take-Off Pricing")*

Wire SKU → uploaded price-book lookup so the Security Quote drawer + CSV show real unit/line/margin/tax/grand-total, and the cover total becomes real (kills the $0-cover dependency above).
- **Prerequisite (do FIRST):** build a real `source-data/pricing.json` from the vendor books so cost rendering is verifiable against real numbers, not template zeros.
- **Promote `sku` to a first-class material field** — Pass 1 derives SKU at render; pricing needs a real per-material SKU to key the lookup. Cameras/AC/intercom/parcel/DHW have a source; mailbox/IoT/derived need SKU assignment or a no-price marker.
- Consumes the Pricing Foundation already shipped (load/clear price book, status banner).

---

## ACTIVE — OTHER BRANCH (proposal-cover chat)

- **Proposal cover redesign** — SMART-MF-branded title page (angled navy/white jsPDF geometry; logo + photo base64; Project/Client/Date). Renders from `projectInfo.branding` (multi-tenant-ready, SMART MF default). Scope + summary-counts relocate to their own page. Helvetica not courier.
  - Assets: logo IN (`Blue_Logo_2.png` stacked for cover; `Blue_Logo_1` horizontal for headers). **Building photo PENDING** — free-license (Unsplash/Pexels) `cover-photo.jpg` into repo; placeholder until then.
  - No version bump (branding backfill-on-load). Rebase onto `d54b5a1` before merge.
  - Could also resolve the $0-cover dependency (hide $0 total).

---

## QUEUED PASSES

### Classifier v2 — DHW keyword expansion  *(from M8's 28-unclassified real-data dump)*
- Extend `DHW_CLASSIFIER_RULES`: rule 4 (→5.2) astragal, coordinator, threshold, gasketing, door bottom/sweep, track, viewer, pocket door lock, latching bolt, mounting plate; rule 3 fire exit hardware; rule 5 (→5.3) `cyl` abbrev. Drops unclassified ~28→~5.
- Door-operator components (column actuator, surf. auto operator, power supply, wire harness) → §2.2 — **couples to deferred door-operator modeling** (§2.2 has none yet).
- "By others" lines (fire-alarm connection, Div-28 credential, patio door, pocket-door kit, wiring diagrams) → integrator W7-excludes at import; **user-guide note, not code.**
- **Ride-along:** add `\b` word boundaries to `SECURITY_HARDWARE_PATTERN` (fixes "REX" inside "CORE EXTRACTOR"; changes classifier rule 2 + §2.2 guard — do it WITH this pass).

### Other backlog
- **Switch Topology** (partial — Network tile place/drag/delete/persist exists). Two-tier camera→switch→CMVR cabling; multi-switch-per-page array; switch right-panel. Likely merges with Manual Cable Routing.
- **Manual Cable Routing + Conduit** — user-drawn polylines replacing straight-line × multiplier; conduit per-segment → BOM row.
- **Camera Details Panel Redesign** — sliders w/ two-way canvas sync.
- **PDF scale-marker auto-recognition** — select scale bar → calibration. OCR lib TBD.
- **Catalog / rules** — Rules Page editor; LuxerOne / Doorbird / Hanwha SKU imports.

---

## HOUSEKEEPING

- **Track pass briefs in the closing commit.** Recurring: `git add` lines named only `camera_markup_tool.html`, so briefs dangled untracked (recovered both manually). Going forward, fold the brief filename into the pass's final commit.
- **Commit-per-milestone discipline.** The BOM pass rode 8 uncommitted milestones on the OneDrive tree all session (recovered fine, but fragile). Commit after each browser review.
- **Resync anchor on every CC block.** Driving git in raw terminal + via CC causes stale-state drift (two collisions this session). Each CC block now opens with `[HEAD: <hash> | branch | tree]`.
- **Centralize `IOT_DEFAULT_FLAGS`** — 6-key default dup'd in `onIotDeviceToggle` + `applyProjectState`; a 7th key needs both.
- **DHW BOM override re-apply hook** — `dhwBomRows()` output isn't re-decorated by `bomAutoOverrides` on reload (DHW unit prices ephemeral). Fix with Pass 2 pricing.
- **`\b` word boundaries on `SECURITY_HARDWARE_PATTERN`** — bundle with Classifier v2.
- **Defer `bom*` code-symbol rename** — UI says "Security Quote", symbols stay `bom*`; high-churn/zero-gain rename, do only if it ever causes confusion.
- **Dead-code sweep** — `.lp-breadcrumb`, `computeAutoCableRows()`, no-op list renderers, orphaned PNG assets.
- **`switches`/`headends` don't reset on raw PDF re-import** — stale positions on invalid page indices; reset in loadPDF.
- **Install LibreOffice** on Windows — kills the docs-PDF regen caveat.
- **User guide** — wizard + W7/W8 + Hardware Module + cleanup stretch + BOM two-tier + centered modal + Security-Quote rename + customer BOM page all undocumented.

---

## RESOLVED (removed from deferred)
- ~~BOM two-tier template~~ — `43fdd4a`.
- ~~Centered BOM modal~~ — `45d1afd`.
- ~~Customer BOM export page (Qty/SKU/Desc, no price)~~ — `29d0ccd`.
- ~~Placed switch in BOM / IoT expansion / DHW §5 classifier~~ — BOM two-tier M1/M2/M6.
